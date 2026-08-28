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
import { Users, Crown, Sparkles, Play, ArrowLeft, Copy, Check, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface ActiveRoomSummary {
  roomId: string;
  roomName: string;
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

    try {
      const res = await createGameRoom(roomNameInput.trim(), playerNameInput.trim());
      if (res.success && res.room) {
        onRoomUpdated(res.room);
      } else {
        setFormError(res.error || 'Failed to create room.');
      }
    } catch (err) {
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
    } catch (err) {
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
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 uppercase tracking-wider">
                  Game Room
                </span>
                <span className="text-xl font-bold text-white tracking-wide">{currentRoom.roomName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentRoom.players.length} {currentRoom.players.length === 1 ? 'player connected' : 'players connected'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyRoom}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition"
          >
            {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            <span>{copiedCode ? 'Room Name Copied!' : 'Copy Room Name'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Players List Card */}
          <div className="md:col-span-1 bg-slate-900/60 border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Players ({currentRoom.players.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {currentRoom.players.map((p) => {
                const isMe = p.id === currentSocketId;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                      isMe
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
                    {p.isHost && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    )}
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
                  <span className="text-xs text-cyan-400 font-medium">Host controls category</span>
                ) : (
                  <span className="text-xs text-slate-400">Host selects category</span>
                )}
              </div>

              {isHost ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Choose Test Category for the Group:
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
                  <button
                    onClick={startRoomGame}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-lg text-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-transform transform hover:scale-[1.02] cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Start Group Game
                  </button>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    Questions will be displayed together. Answers reveal once all players answer.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <div className="flex items-center gap-2 text-cyan-400 font-medium animate-pulse mb-1">
                    <Sparkles className="w-4 h-4" />
                    Waiting for room host to start the test...
                  </div>
                  <p className="text-xs text-slate-400">Get ready to answer each question simultaneously!</p>
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
    <div className="w-full text-slate-100 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Single Player
        </button>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Multiplayer Game Mode
        </span>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">Multiplayer Study Room</h2>
        <p className="text-slate-400 text-sm mt-1">
          Compete in real time with classmates or coworkers on CLP practice tests!
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
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
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
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition ${
            activeTab === 'join'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Join Room
        </button>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Alex"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Room Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Trucking-Squad-1"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Give your study room a name for other players to join.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-lg text-lg transition-transform transform hover:scale-[1.02] shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Room...' : 'Create & Host Room'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Name</label>
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Room Name to Join</label>
            <input
              type="text"
              required
              placeholder="Enter room name"
              value={roomNameInput}
              onChange={(e) => setRoomNameInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1">
              Ask your host for the room name they created.
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
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                title="Refresh rooms list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {activeRooms.length === 0 ? (
              <div className="text-center py-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
                No active rooms found. Make sure Device 1 has clicked <span className="text-cyan-300 font-semibold">"Create & Host Room"</span> first!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeRooms.map((r) => (
                  <button
                    key={r.roomId}
                    type="button"
                    onClick={() => {
                      setRoomNameInput(r.roomName);
                      setFormError(null);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-500/50 transition flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-sm text-white group-hover:text-cyan-300 transition">
                        {r.roomName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {r.topicName} • <span className="capitalize text-slate-300">{r.status === 'lobby' ? 'Waiting in Lobby' : 'In Game'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {r.playerCount} {r.playerCount === 1 ? 'player' : 'players'}
                      </span>
                      <span className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition font-medium">
                        Select →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
