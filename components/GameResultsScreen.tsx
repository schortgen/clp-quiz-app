import React, { useState } from 'react';
import type { GameRoomState } from '../types.ts';
import { retestGame, changeGameTest, leaveGameRoom } from '../services/socketService.ts';
import {
  Trophy,
  Mail,
  RotateCcw,
  BookOpen,
  LogOut,
  Crown,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Printer,
  Sparkles,
  GraduationCap,
  Users,
} from 'lucide-react';

interface GameResultsScreenProps {
  room: GameRoomState;
  currentSocketId: string;
  onLeaveRoom: () => void;
}

export const GameResultsScreen: React.FC<GameResultsScreenProps> = ({
  room,
  currentSocketId,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostId === currentSocketId;
  const isClassroom = room.roomType === 'classroom';
  const myPlayer = room.players.find((p) => p.id === currentSocketId);
  const isTeacher = Boolean(myPlayer?.isTeacher);
  const teacherPlayer = room.players.find((p) => p.isTeacher);
  const totalQuestions = room.totalQuestions || room.questionCount;

  // Filter students vs teachers for leaderboard
  const studentPlayers = room.players.filter((p) => !p.isTeacher);
  const sortedStudents = [...studentPlayers].sort((a, b) => {
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    return a.wrongCount - b.wrongCount;
  });

  const classTotalCorrect = studentPlayers.reduce((acc, p) => acc + p.correctCount, 0);
  const classPossibleAnswers = studentPlayers.length * totalQuestions;
  const classAveragePct =
    classPossibleAnswers > 0 ? Math.round((classTotalCorrect / classPossibleAnswers) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const generateResultsSummaryText = () => {
    const topicHeader = `=== CLP QUIZ RESULTS: ${room.topicName.toUpperCase()} ===\nRoom: ${room.roomName} ${
      isClassroom ? `(Classroom Session - Instructor: ${teacherPlayer?.name || 'Teacher'})` : ''
    }\nTotal Questions: ${totalQuestions}\n\n`;

    const leaderboardText =
      `--- ${isClassroom ? 'CLASSROOM STUDENT ROSTER & GRADES' : 'GROUP LEADERBOARD'} ---\n` +
      sortedStudents
        .map((p, index) => {
          const pct = totalQuestions > 0 ? Math.round((p.correctCount / totalQuestions) * 100) : 0;
          const medal = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
          return `${medal}. ${p.name}: ${p.correctCount}/${totalQuestions} correct (${pct}%) - ${p.wrongCount} wrong`;
        })
        .join('\n');

    let reviewText = '\n\n--- QUESTION REVIEW ---\n';
    if (room.allQuestionsReview && room.allQuestionsReview.length > 0) {
      reviewText += room.allQuestionsReview
        .map((q, idx) => {
          const correctOpt = q.options[q.correctAnswerIndex] || '';
          return `Question ${idx + 1}: ${q.questionText}\nCorrect Answer: ${correctOpt}\nExplanation: ${q.explanation || 'N/A'}\n`;
        })
        .join('\n---------------------------------\n\n');
    }

    return topicHeader + leaderboardText + reviewText;
  };

  const handleEmail = () => {
    const subject = `CLP Group Quiz Results: ${room.topicName} (${room.roomName})`;
    const body = generateResultsSummaryText();
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(generateResultsSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveGameRoom();
    onLeaveRoom();
  };

  return (
    <div className="w-full text-slate-100 animate-fade-in flex flex-col items-center">
      <div className="no-print w-full flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isClassroom ? (
            <GraduationCap className="w-8 h-8 text-purple-400" />
          ) : (
            <Trophy className="w-8 h-8 text-amber-400" />
          )}
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-wide">
            {isClassroom ? 'Classroom Session Complete!' : 'Test Completed!'}
          </h2>
        </div>
        <p className="text-slate-400 text-sm mb-6 flex items-center gap-2">
          <span>
            Room <span className="text-cyan-400 font-semibold">{room.roomName}</span> • {room.topicName} ({totalQuestions} Questions)
          </span>
          {isClassroom && teacherPlayer && (
            <span className="text-purple-300 font-medium">• Instructor: {teacherPlayer.name}</span>
          )}
        </p>

        {/* Classroom Summary Stat Box if Classroom Mode */}
        {isClassroom && studentPlayers.length > 0 && (
          <div className="w-full bg-purple-950/40 border border-purple-800/60 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <span className="text-xs uppercase text-purple-300 font-bold block">Class Average</span>
              <span
                className={`text-2xl font-extrabold ${
                  classAveragePct >= 80
                    ? 'text-green-400'
                    : classAveragePct >= 70
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {classAveragePct}%
              </span>
            </div>
            <div className="h-8 w-px bg-purple-800/60 hidden sm:block" />
            <div>
              <span className="text-xs uppercase text-purple-300 font-bold block">Students Completed</span>
              <span className="text-2xl font-extrabold text-white">{studentPlayers.length}</span>
            </div>
            <div className="h-8 w-px bg-purple-800/60 hidden sm:block" />
            <div>
              <span className="text-xs uppercase text-purple-300 font-bold block">Passing Grade (80%)</span>
              <span className="text-2xl font-extrabold text-cyan-300">
                {studentPlayers.filter((s) => (s.correctCount / (totalQuestions || 1)) >= 0.8).length} / {studentPlayers.length}
              </span>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl p-5 mb-8 shadow-xl">
          <h3 className="text-base font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
            {isClassroom ? <GraduationCap className="w-4 h-4 text-purple-400" /> : <Sparkles className="w-4 h-4" />}
            {isClassroom ? 'Student Grades & Performance' : 'Final Group Scoreboard'}
          </h3>

          <div className="space-y-3">
            {sortedStudents.map((player, index) => {
              const isMe = player.id === currentSocketId;
              const pct = totalQuestions > 0 ? Math.round((player.correctCount / totalQuestions) * 100) : 0;
              const isWinner = index === 0;

              return (
                <div
                  key={player.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition ${
                    isWinner && !isClassroom
                      ? 'bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border-amber-500/50'
                      : isMe
                      ? 'bg-cyan-950/40 border-cyan-500/40'
                      : 'bg-slate-800/70 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : index === 1
                          ? 'bg-slate-300 text-slate-950'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-white">{player.name}</span>
                        {player.isHost && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5" /> Host
                          </span>
                        )}
                        {isMe && <span className="text-xs text-cyan-400 font-semibold">(You)</span>}
                      </div>
                      <p className="text-xs text-slate-400">
                        {player.correctCount} correct • {player.wrongCount} incorrect
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span
                        className={`text-xl font-bold ${
                          pct >= 80 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}
                      >
                        {pct}%
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {player.correctCount} / {totalQuestions}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedStudents.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">No student participants in this session.</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleEmail}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-transform transform hover:scale-[1.02] cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              Email Results to Review
            </button>

            <button
              onClick={handleCopySummary}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold py-3 px-4 rounded-xl text-base flex items-center justify-center gap-2 transition"
            >
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-cyan-400" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Results Summary'}</span>
            </button>
          </div>

          {/* Host Retest & Test Change Options */}
          {isHost ? (
            <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider text-left">
                {isTeacher ? 'Teacher Session Options' : 'Host Room Options'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={retestGame}
                  className={`text-white font-bold py-3 px-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg transition-transform transform hover:scale-[1.02] cursor-pointer ${
                    isTeacher
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  {isTeacher ? 'Retest Topic with Class' : 'Retest Same Test'}
                </button>
                <button
                  onClick={changeGameTest}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-transform transform hover:scale-[1.02] cursor-pointer"
                >
                  <BookOpen className="w-5 h-5" />
                  {isTeacher ? 'Select Another Topic for Class' : 'Take a Different Test'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-700 p-4 rounded-xl text-center text-sm text-slate-400">
              Waiting for {teacherPlayer ? `Instructor (${teacherPlayer.name})` : `Host (${room.players.find((p) => p.isHost)?.name || 'Host'})`} to restart or select a new test...
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              Print Results Sheet
            </button>
            <button
              onClick={handleLeave}
              className="flex-1 bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-700 text-slate-300 hover:text-red-300 font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              Leave Game Room
            </button>
          </div>
        </div>
      </div>

      {/* Printable / Full Question Review Section */}
      {room.allQuestionsReview && room.allQuestionsReview.length > 0 && (
        <div className="w-full mt-4 text-left printable-section">
          <h3 className="text-2xl font-bold text-white mb-4 text-center">
            Complete Test Review: {room.topicName}
          </h3>
          <div className="space-y-4">
            {room.allQuestionsReview.map((q, idx) => (
              <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <p className="font-semibold text-base sm:text-lg mb-2 text-white">
                  {idx + 1}. {q.questionText}
                </p>
                <div className="space-y-1 pl-2 mb-3">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctAnswerIndex;
                    return (
                      <div
                        key={optIdx}
                        className={`text-sm py-1 px-2 rounded flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-green-950/50 text-green-300 font-bold border border-green-700/60'
                            : 'text-slate-300'
                        }`}
                      >
                        <span>{isCorrect ? '✓' : '•'}</span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <span className="font-bold text-cyan-400">Explanation: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
