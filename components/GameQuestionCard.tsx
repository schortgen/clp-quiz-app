import React, { useState, useEffect } from 'react';
import type { GameRoomState } from '../types.ts';
import { submitRoomAnswer, advanceNextQuestion, forceRevealAnswers, kickPlayer } from '../services/socketService.ts';
import { Zap, CheckCircle2, Clock, Crown, ArrowRight, Award, HelpCircle, WifiOff, FastForward, UserX } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameQuestionCardProps {
  room: GameRoomState;
  currentSocketId: string;
}

export const GameQuestionCard: React.FC<GameQuestionCardProps> = ({ room, currentSocketId }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const isHost = room.hostId === currentSocketId;
  const isRevealed = room.status === 'question_reveal';
  const myPlayer = room.players.find((p) => p.id === currentSocketId);
  const currentQ = room.currentQuestion;

  // Live timer for offline reconnect deadline
  useEffect(() => {
    if (!room.offlineDeadline || isRevealed) {
      setSecondsRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = Math.max(0, (room.offlineDeadline || 0) - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setSecondsRemaining(remainingSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [room.offlineDeadline, isRevealed]);

  // Reset selected option and clear DOM focus when moving to a new question
  useEffect(() => {
    if (room.status === 'in_quiz') {
      setSelectedOption(null);
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [room.currentQuestionIndex, room.status]);

  // Trigger celebration confetti if current player was first correct
  useEffect(() => {
    if (isRevealed && room.revealData?.firstCorrectPlayer?.id === currentSocketId) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  }, [isRevealed, room.revealData, currentSocketId]);

  if (!currentQ) {
    return (
      <div className="text-center p-8 text-slate-300">
        <p>Loading question...</p>
      </div>
    );
  }

  const handleSelectOption = (index: number) => {
    if (isRevealed || myPlayer?.hasAnswered || selectedOption !== null) return;
    setSelectedOption(index);
    submitRoomAnswer(index);
  };

  const handleForceReveal = () => {
    forceRevealAnswers();
  };

  const handleKickPlayer = (e: React.MouseEvent, playerId: string, playerName: string) => {
    e.stopPropagation();
    if (window.confirm(`Remove ${playerName} from the room?`)) {
      kickPlayer(playerId);
    }
  };

  const answeredCount = room.players.filter((p) => p.isOnline && p.hasAnswered).length;
  const totalOnline = room.players.filter((p) => p.isOnline).length;
  const questionNumber = room.currentQuestionIndex + 1;
  const totalQuestions = room.totalQuestions || room.questionCount;
  const hasOfflinePlayers = room.players.some((p) => !p.isOnline);

  const getOptionStyle = (index: number) => {
    if (!isRevealed) {
      if (selectedOption === index || (myPlayer?.hasAnswered && selectedOption === index)) {
        return 'bg-cyan-900/70 border-cyan-400 text-white shadow-lg ring-2 ring-cyan-500/50';
      }
      return 'bg-slate-800/90 border-slate-700 text-slate-100 sm:hover:bg-slate-700/80 sm:hover:border-slate-600 active:bg-slate-700/90';
    }

    // Revealed state
    const isCorrectAnswer = index === room.revealData?.correctAnswerIndex;
    const isMyPick = selectedOption === index;

    if (isCorrectAnswer) {
      return 'bg-green-950/70 border-green-400 text-green-100 ring-2 ring-green-500/60 shadow-lg font-medium';
    }
    if (isMyPick && !isCorrectAnswer) {
      return 'bg-red-950/70 border-red-500 text-red-200 ring-1 ring-red-500/40';
    }
    return 'bg-slate-800/50 border-slate-700/60 text-slate-400 opacity-60';
  };

  return (
    <div className="w-full text-slate-100 animate-fade-in flex flex-col">
      {/* Top Bar: Progress & Live Scoreboard */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold mb-2">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 truncate max-w-[160px] sm:max-w-xs">{room.topicName}</span>
          </div>
          <div className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            Room: <span className="text-cyan-400 font-bold">{room.roomName}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700/70 rounded-full h-2.5 mb-4">
          <div
            className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Players Live Tracker */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>PLAYER SCOREBOARD</span>
            <span>
              {!isRevealed ? (
                <span className="text-cyan-300 font-bold">
                  Answers: {answeredCount} / {totalOnline} online
                </span>
              ) : (
                <span className="text-green-400 font-bold">Answers Revealed!</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {room.players.map((p) => {
              const isMe = p.id === currentSocketId;
              const hasAnswered = p.hasAnswered;
              const isOnline = p.isOnline;

              return (
                <div
                  key={p.id}
                  className={`flex flex-col p-2 rounded-lg border text-xs transition relative group ${
                    !isOnline
                      ? 'bg-slate-900/50 border-red-900/40 opacity-70'
                      : isMe
                      ? 'bg-cyan-950/40 border-cyan-600/50'
                      : 'bg-slate-800/70 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-slate-200 truncate flex items-center gap-1">
                      {p.isHost && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                      {p.name}
                      {isMe && <span className="text-[10px] text-cyan-400">(You)</span>}
                      {!isOnline && (
                        <span className="text-[10px] text-red-400 flex items-center gap-0.5 font-normal">
                          <WifiOff className="w-2.5 h-2.5" /> (Offline)
                        </span>
                      )}
                    </span>

                    {!isRevealed ? (
                      hasAnswered ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      ) : isOnline ? (
                        <Clock className="w-3.5 h-3.5 text-amber-400/80 animate-pulse flex-shrink-0" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" />
                      )
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">✓ {p.correctCount}</span>
                      <span className="text-red-400 font-bold">✗ {p.wrongCount}</span>
                    </div>

                    {/* Host kick/remove button if player disconnected */}
                    {isHost && !isMe && !isOnline && (
                      <button
                        type="button"
                        onClick={(e) => handleKickPlayer(e, p.id, p.name)}
                        className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer ml-1"
                        title="Remove disconnected player"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Question Text */}
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center leading-relaxed text-white">
        {currentQ.questionText}
      </h2>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {currentQ.options.map((option, index) => {
          // Find which players picked this option during reveal
          const pickingPlayers = isRevealed && room.revealData?.playerAnswers
            ? room.revealData.playerAnswers.filter((pa) => pa.chosenIndex === index)
            : [];

          return (
            <button
              key={`${room.currentQuestionIndex}-${index}`}
              onClick={() => handleSelectOption(index)}
              disabled={isRevealed || (myPlayer?.hasAnswered ?? false)}
              className={`w-full p-4 rounded-xl text-left text-base sm:text-lg border transition-all duration-200 flex flex-col justify-between select-none outline-none focus:outline-none ${getOptionStyle(
                index
              )} ${!isRevealed && !myPlayer?.hasAnswered ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-600/60 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-0.5">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="leading-snug">{option}</span>
              </div>

              {/* Reveal Player badges */}
              {isRevealed && pickingPlayers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-700/60">
                  {pickingPlayers.map((pa) => (
                    <span
                      key={pa.playerId}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        pa.isCorrect
                          ? 'bg-green-800/80 text-green-200 border border-green-600'
                          : 'bg-red-900/70 text-red-200 border border-red-700'
                      }`}
                    >
                      {pa.isCorrect ? '✓' : '✗'} {pa.name}
                      {pa.playerId === currentSocketId ? ' (You)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Answering Status Banner when waiting */}
      {!isRevealed && (
        <div className="p-4 bg-slate-900/90 border border-slate-700/90 rounded-xl mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-center sm:text-left">
              {myPlayer?.hasAnswered ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="font-semibold text-sm sm:text-base text-cyan-300">
                    Your answer is submitted! Waiting for other players... ({answeredCount}/{totalOnline})
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse flex-shrink-0" />
                  <span className="font-semibold text-sm sm:text-base text-slate-300">
                    Choose your answer above — results reveal once everyone answers!
                  </span>
                </>
              )}
            </div>

            {/* Skip / Force Reveal button if player answered or if host wants to skip waiting */}
            {(isHost || myPlayer?.hasAnswered) && (
              <button
                type="button"
                onClick={handleForceReveal}
                className="bg-amber-600/80 hover:bg-amber-500 text-white font-bold py-2 px-3.5 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition-transform transform hover:scale-105 cursor-pointer whitespace-nowrap border border-amber-400/40 shadow-md"
                title="Reveal answers now without waiting for remaining players"
              >
                <FastForward className="w-4 h-4" />
                <span>Skip Waiting & Reveal</span>
              </button>
            )}
          </div>

          {/* Offline Reconnect Countdown Banner */}
          {secondsRemaining !== null && secondsRemaining > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between bg-amber-950/30 -mx-4 -mb-4 p-3 rounded-b-xl border-amber-900/30">
              <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm">
                <WifiOff className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                <span>
                  Waiting for disconnected player to reconnect: <strong>{secondsRemaining}s remaining</strong>
                </span>
              </div>
              <span className="text-[11px] text-amber-400/80 hidden sm:inline">
                Auto-reveals in {secondsRemaining}s or skip now ➔
              </span>
            </div>
          )}

          {hasOfflinePlayers && secondsRemaining === null && (
            <p className="text-[11px] text-slate-400 mt-2 text-center sm:text-left flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              An offline player is in the room. Answers will reveal automatically once online players submit, after a 30s reconnect window.
            </p>
          )}
        </div>
      )}

      {/* Revealed Section: First Correct Winner & Explanation */}
      {isRevealed && room.revealData && (
        <div className="space-y-4 mb-6 animate-fade-in">
          {/* Winner Banner */}
          {room.revealData.firstCorrectPlayer ? (
            <div className="p-4 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900 border border-amber-500/50 rounded-xl flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40">
                  <Zap className="w-6 h-6 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                      First Correct Answer
                    </span>
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {room.revealData.firstCorrectPlayer.name}{' '}
                    {room.revealData.firstCorrectPlayer.id === currentSocketId && (
                      <span className="text-amber-300 text-sm font-normal">(That's you! 🏆)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-amber-300/80 font-mono">
                {(room.revealData.firstCorrectPlayer.timeMs / 1000).toFixed(1)}s speed
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl flex items-center gap-3 text-slate-300">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span>No one answered correctly this question. Check the explanation below!</span>
            </div>
          )}

          {/* Explanation Box */}
          {room.revealData.explanation && (
            <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl text-left">
              <h3 className="font-bold text-cyan-400 mb-1.5 text-sm flex items-center gap-1.5">
                Official CDL Explanation
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">{room.revealData.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Host / Player Next Action Controls */}
      {isRevealed && (
        <div className="text-center pt-2">
          {isHost ? (
            <button
              onClick={advanceNextQuestion}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-xl text-lg flex items-center justify-center gap-2 mx-auto shadow-lg shadow-cyan-500/20 transition-transform transform hover:scale-105 cursor-pointer"
            >
              <span>{questionNumber === totalQuestions ? 'View Final Results' : 'Next Question'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-2">
              <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Waiting for room host ({room.players.find((p) => p.isHost)?.name || 'Host'}) to advance...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
