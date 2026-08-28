import React, { useState, useEffect } from 'react';
import { QUIZ_TOPICS } from '../constants.ts';
import type { GameRoomState } from '../types.ts';
import {
  createGameRoom,
  joinGameRoom,
  selectRoomTopic,
  startRoomGame,
  leaveGameRoom,
  getSocketBaseUrl,
} from '../services/socketService.ts';
import {
  Users,
  Crown,
  Sparkles,
  Play,
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

interface ActiveRoomSummary {
  roomId: string;
  roomName: string;
  roomType?: 'standard' | 'classroom';
  teacherName?: string;
  status: string;
  topicName: string;
  playerCount: number;
}

interface GameRoomLobbyProps {
  currentRoom: GameRoomState | null;
  onRoomUpdated: (room: GameRoomState | null) => void;
  onBackToMenu: () => void;
  currentSocketId: string;
}

export const GameRoomLobby: React.FC<GameRoomLobbyProps> = ({
  currentRoom,
  onRoomUpdated,
  onBackToMenu,
  currentSocketId,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomMode, setRoomMode] = useState<'classroom' | 'standard'>('classroom');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [playerNameInput, setPlayerNameInput] = useState(() => {
    return localStorage.getItem('clp_player_name') || '';
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const fetchActiveRooms = async () => {
    try {
      setLoadingRooms(true);
      const baseUrl = getSocketBaseUrl();
      const res = await fetch(`${baseUrl}/api/active-rooms`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setActiveRooms(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (!currentRoom) {
      fetchActiveRooms();
      const interval = setInterval(fetchActiveRooms, 3000);
      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim() || !playerNameInput.trim()) {
      setFormError('Please enter both your name and a room name.');
      return;
    }
    setLoading(true);
    setFormError(null);
    localStorage.setItem('clp_player_name', playerNameInput.trim());

    const isTeacher = roomMode === 'classroom';

    try {
      const res = await createGameRoom(
        roomNameInput.trim(),
        playerNameInput.trim(),
        isTeacher,
        roomMode
      );
      if (res.success && res.room) {
        onRoomUpdated(res.room);
      } else {
        setFormError(res.error || 'Failed to create room.');
      }
    } catch {
      setFormError('Network error connecting to room server.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameInput.trim() || !playerNameInput.trim()) {
      setFormError('Please enter both your name and the room name.');
      return;
    }
    setLoading(true);
    setFormError(null);
    localStorage.setItem('clp_player_name', playerNameInput.trim());

    try {
      const res = await joinGameRoom(roomNameInput.trim(), playerNameInput.trim());
      if (res.success && res.room) {
        onRoomUpdated(res.room);
      } else {
        setFormError(res.error || 'Failed to join room.');
      }
    } catch {
      setFormError('Network error connecting to room server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    leaveGameRoom();
    onRoomUpdated(null);
  };

  const handleCopyRoom = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomName);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isHost = currentRoom ? currentRoom.hostId === currentSocketId : false;
  const myPlayer = currentRoom ? currentRoom.players.find((p) => p.id === currentSocketId) : null;
  const isTeacher = Boolean(myPlayer?.isTeacher);
  const isClassroom = currentRoom?.roomType === 'classroom';
  const teacherPlayer = currentRoom?.players.find((p) => p.isTeacher);
  const studentCount = currentRoom
    ? currentRoom.players.filter((p) => !p.isTeacher && p.isOnline).length
    : 0;

  // Render Waiting Lobby if inside a room
  if (currentRoom) {
    const selectedTopic = QUIZ_TOPICS.find((t) => t.id === currentRoom.topicId) || QUIZ_TOPICS[0];

    return (
      <div className="w-full text-slate-100 animate-fade-in">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-700 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLeave}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isClassroom ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Teacher Classroom
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Standard Match
                  </span>
                )}
                <span className="text-xl font-bold text-white tracking-wide">{currentRoom.roomName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isClassroom
                  ? `${studentCount} ${studentCount === 1 ? 'student' : 'students'} joined • Teacher: ${
                      teacherPlayer ? teacherPlayer.name : 'Host'
                    }`
                  : `${currentRoom.players.length} ${
                      currentRoom.players.length === 1 ? 'player connected' : 'players connected'
                    }`}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyRoom}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            <span>{copiedCode ? 'Room Name Copied!' : 'Copy Room Name for Students'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Players List Card */}
          <div className="md:col-span-1 bg-slate-900/60 border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                {isClassroom ? (
                  <>
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    Class Roster ({currentRoom.players.length})
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 text-cyan-400" />
                    Players ({currentRoom.players.length})
                  </>
                )}
              </h3>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {currentRoom.players.map((p) => {
                const isMe = p.id === currentSocketId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                      p.isTeacher
                        ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                        : isMe
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="font-medium text-sm truncate">
                        {p.name} {isMe && <span className="text-xs text-cyan-400">(You)</span>}
                      </span>
                    </div>
                    {p.isTeacher ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        <GraduationCap className="w-3 h-3" /> Teacher
                      </span>
                    ) : p.isHost ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    ) : isClassroom ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        Student
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Category & Settings Card */}
          <div className="md:col-span-2 bg-slate-900/60 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Selected Test Category
                </h3>
                {isHost ? (
                  <span className="text-xs text-cyan-400 font-medium">
                    {isTeacher ? 'Teacher selects category' : 'Host selects category'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    {isClassroom ? 'Teacher selects category' : 'Host selects category'}
                  </span>
                )}
              </div>

              {isHost ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Choose Test Category for the {isClassroom ? 'Class' : 'Group'}:
                  </label>
                  <select
                    value={currentRoom.topicId}
                    onChange={(e) => selectRoomTopic(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-medium focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none cursor-pointer"
                  >
                    {QUIZ_TOPICS.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name} ({topic.questionCount} questions)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 italic mt-1">{selectedTopic?.description}</p>
                </div>
              ) : (
                <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700">
                  <p className="text-lg font-bold text-cyan-400">{currentRoom.topicName}</p>
                  <p className="text-sm text-slate-300 mt-1">{selectedTopic?.description}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">
                    Questions: {currentRoom.questionCount}
                  </p>
                </div>
              )}
            </div>

            {/* Start Action */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              {isHost ? (
                <div>
                  {isTeacher ? (
                    <div className="mb-3 bg-purple-950/30 border border-purple-800/50 rounded-lg p-3 text-xs text-purple-200">
                      <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        Teacher Mode Active
                      </p>
                      You will moderate this session. Students will answer questions simultaneously while you view live answers, reveal results, and advance at your own pace.
                    </div>
                  ) : null}
                  <button
                    onClick={startRoomGame}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-lg text-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-transform transform hover:scale-[1.02] cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {isTeacher ? 'Start Classroom Session' : 'Start Group Game'}
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    {isTeacher
                      ? 'Students will receive Question 1 together once you start.'
                      : 'Questions will be displayed together. Answers reveal once all players answer.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <div className="flex items-center gap-2 text-cyan-400 font-medium animate-pulse mb-1">
                    <Sparkles className="w-4 h-4" />
                    {isClassroom
                      ? `Waiting for Teacher (${teacherPlayer ? teacherPlayer.name : 'Host'}) to start the test...`
                      : 'Waiting for room host to start the test...'}
                  </div>
                  <p className="text-xs text-slate-400">
                    {isClassroom
                      ? 'You will answer each question on your screen when prompted by the instructor.'
                      : 'Get ready to answer each question simultaneously!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Create or Join Lobby form
  return (
    <div className="w-full text-slate-100 animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Single Player
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Multiplayer & Classroom
        </span>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Multiplayer Study Room</h2>
        <p className="text-slate-400 text-sm mt-1">
          Host a teacher-led classroom session or compete with friends in real time!
        </p>
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-red-900/60 border border-red-700 text-red-200 p-3.5 rounded-lg mb-6 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('create');
            setFormError(null);
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'create'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('join');
            setFormError(null);
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'join'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Join Room
        </button>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateRoom} className="space-y-5">
          {/* Room Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Room Role / Mode:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoomMode('classroom')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  roomMode === 'classroom'
                    ? 'bg-purple-950/50 border-purple-500 text-white ring-1 ring-purple-500'
                    : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-purple-300 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    Teacher Mode
                  </span>
                  {roomMode === 'classroom' && (
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  You moderate as Teacher. Students join to answer questions while you control pace and review answers.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRoomMode('standard')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  roomMode === 'standard'
                    ? 'bg-cyan-950/50 border-cyan-500 text-white ring-1 ring-cyan-500'
                    : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-cyan-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Group Match Mode
                  </span>
                  {roomMode === 'standard' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Peer match where everyone (including you) answers questions together and competes on the scoreboard.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {roomMode === 'classroom' ? 'Teacher / Instructor Name' : 'Your Name'}
            </label>
            <input
              type="text"
              required
              placeholder={roomMode === 'classroom' ? 'e.g., Instructor Dan or Mr. Miller' : 'e.g., Alex'}
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {roomMode === 'classroom' ? 'Classroom / Room Name' : 'Room Name'}
            </label>
            <input
              type="text"
              required
              placeholder={roomMode === 'classroom' ? 'e.g., CDL-Period-1 or Truck-Class-A' : 'e.g., Trucking-Squad-1'}
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              {roomMode === 'classroom'
                ? 'Give this room name to your students so they can join your class.'
                : 'Give your study room a name for other players to join.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-6 text-white font-bold py-3.5 px-4 rounded-lg text-lg transition-transform transform hover:scale-[1.02] shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 ${
              roomMode === 'classroom'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
            }`}
          >
            {loading ? (
              'Creating Room...'
            ) : roomMode === 'classroom' ? (
              <>
                <GraduationCap className="w-5 h-5" />
                Create & Open Classroom
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Create & Host Room
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name (Student / Player)</label>
            <input
              type="text"
              required
              placeholder="e.g., Sarah"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Room / Classroom Name to Join</label>
            <input
              type="text"
              required
              placeholder="Enter room name"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Ask your teacher or host for the room name they created.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-lg text-lg transition-transform transform hover:scale-[1.02] shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Joining Room...' : 'Join Game Room'}
          </button>

          {/* List of active rooms to tap and join */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Active Rooms Right Now ({activeRooms.length})
              </span>
              <button
                type="button"
                onClick={fetchActiveRooms}
                disabled={loadingRooms}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                title="Refresh rooms list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {activeRooms.length === 0 ? (
              <div className="text-center py-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
                No active rooms found. Create a room above or enter a room name to join!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeRooms.map((r) => {
                  const isClass = r.roomType === 'classroom';
                  return (
                    <button
                      key={r.roomId}
                      type="button"
                      onClick={() => {
                        setRoomNameInput(r.roomName);
                        setFormError(null);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-500/50 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-sm text-white group-hover:text-cyan-300 transition flex items-center gap-2">
                          <span>{r.roomName}</span>
                          {isClass && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/70 text-purple-300 border border-purple-700/60 font-normal flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> Teacher: {r.teacherName || 'Host'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {r.topicName} •{' '}
                          <span className="capitalize text-slate-300">
                            {r.status === 'lobby' ? 'Waiting in Lobby' : 'In Game'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                          {r.playerCount} {r.playerCount === 1 ? 'user' : 'users'}
                        </span>
                        <span className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition font-medium">
                          Select →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

