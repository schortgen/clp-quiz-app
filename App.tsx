import React, { useState, useCallback, useEffect } from 'react';
import StartScreen from './components/StartScreen.tsx';
import QuestionCard from './components/QuestionCard.tsx';
import ResultsScreen from './components/ResultsScreen.tsx';
import Spinner from './components/Spinner.tsx';
import { GameRoomLobby } from './components/GameRoomLobby.tsx';
import { GameQuestionCard } from './components/GameQuestionCard.tsx';
import { GameResultsScreen } from './components/GameResultsScreen.tsx';
import { getQuizQuestions } from './services/quizService.ts';
import { getSocket } from './services/socketService.ts';
import { QuizState, type QuizQuestion, type QuizMode, type GameRoomState } from './types.ts';
import { QUIZ_TOPICS } from './constants.ts';

const App: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState>(QuizState.NOT_STARTED);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopicName, setCurrentTopicName] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('practice');

  // Multiplayer Game State
  const [gameRoom, setGameRoom] = useState<GameRoomState | null>(null);
  const [socketId, setSocketId] = useState<string>('');

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setSocketId(socket.id || '');
    };

    const onRoomUpdated = (updatedRoom: GameRoomState) => {
      setGameRoom(updatedRoom);
    };

    socket.on('connect', onConnect);
    socket.on('room_updated', onRoomUpdated);

    if (socket.connected) {
      setSocketId(socket.id || '');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('room_updated', onRoomUpdated);
    };
  }, []);

  const handleStartQuiz = useCallback(async (topicId: string, questionCount: number) => {
    setLoading(true);
    setError(null);
    setQuizState(QuizState.LOADING);
    const topic = QUIZ_TOPICS.find((t) => t.id === topicId);
    if (topic) {
      setCurrentTopicName(topic.name);
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newQuestions = await getQuizQuestions(topicId, questionCount);
      if (newQuestions.length === 0) {
        throw new Error('No questions available for this topic. Please add questions to the data file.');
      }
      setQuestions(newQuestions);
      setQuizState(QuizState.IN_PROGRESS);
    } catch (err) {
      setError((err as Error).message || 'Failed to load quiz questions. Please try again.');
      setQuizState(QuizState.NOT_STARTED);
      setCurrentTopicName(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [...prev, questions[currentQuestionIndex]]);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizState(QuizState.FINISHED);
    }
  };

  const handleRestart = () => {
    setQuizState(QuizState.NOT_STARTED);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setError(null);
    setCurrentTopicName(null);
  };

  const handleOpenGameMode = () => {
    setQuizMode('game');
    setQuizState(QuizState.GAME_LOBBY);
  };

  const handleLeaveGameRoom = () => {
    setGameRoom(null);
    setQuizMode('practice');
    setQuizState(QuizState.NOT_STARTED);
  };

  const renderContent = () => {
    // If in multiplayer Game Room Mode
    if (quizState === QuizState.GAME_LOBBY || quizMode === 'game') {
      if (!gameRoom || gameRoom.status === 'lobby') {
        return (
          <GameRoomLobby
            currentRoom={gameRoom}
            onRoomUpdated={setGameRoom}
            onBackToMenu={handleLeaveGameRoom}
            currentSocketId={socketId}
          />
        );
      }

      if (gameRoom.status === 'in_quiz' || gameRoom.status === 'question_reveal') {
        return <GameQuestionCard room={gameRoom} currentSocketId={socketId} />;
      }

      if (gameRoom.status === 'finished') {
        return (
          <GameResultsScreen
            room={gameRoom}
            currentSocketId={socketId}
            onLeaveRoom={handleLeaveGameRoom}
          />
        );
      }
    }

    // Single-Player modes (Practice / Timed)
    switch (quizState) {
      case QuizState.LOADING:
        return (
          <div className="text-center">
            <Spinner /> <p className="mt-4 text-lg">Loading your quiz...</p>
          </div>
        );
      case QuizState.IN_PROGRESS:
        return (
          questions.length > 0 && (
            <QuestionCard
              question={questions[currentQuestionIndex]}
              onAnswer={handleAnswer}
              onNext={handleNext}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              quizMode={quizMode}
            />
          )
        );
      case QuizState.FINISHED:
        return (
          <ResultsScreen
            score={score}
            totalQuestions={questions.length}
            onRestart={handleRestart}
            wrongAnswers={wrongAnswers}
            currentTopicName={currentTopicName || 'CLP Quiz'}
          />
        );
      case QuizState.NOT_STARTED:
      default:
        return (
          <StartScreen
            onStartQuiz={handleStartQuiz}
            error={error}
            selectedMode={quizMode}
            onModeChange={setQuizMode}
            onOpenGameMode={handleOpenGameMode}
          />
        );
    }
  };

  const isGameActive = quizMode === 'game' && gameRoom !== null && gameRoom.status !== 'lobby';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-3 sm:p-4 font-sans">
      <div className={`w-full ${isGameActive ? 'max-w-3xl' : 'max-w-2xl'} mx-auto transition-all duration-300`}>
        <header className="text-center mb-6 sm:mb-8 no-print">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 tracking-wider">
            CLP Quiz
          </h1>
          {currentTopicName && quizMode !== 'game' && (
            <h2 className="text-xl sm:text-2xl text-slate-300 mt-2 font-semibold">
              Current test - {currentTopicName}
            </h2>
          )}
        </header>
        <main className="bg-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700 min-h-[300px] flex items-center justify-center">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;