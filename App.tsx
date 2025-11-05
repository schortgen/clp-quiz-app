import React, { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import QuestionCard from './components/QuestionCard';
import ResultsScreen from './components/ResultsScreen';
import Spinner from './components/Spinner';
import { getQuizQuestions } from './services/quizService';
import type { QuizQuestion, QuizMode } from './types';
import { QuizState } from './types';
import { QUIZ_TOPICS } from './constants';

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

  const handleStartQuiz = useCallback(async (topicId: string, questionCount: number) => {
    setLoading(true);
    setError(null);
    setQuizState(QuizState.LOADING);
    const topic = QUIZ_TOPICS.find(t => t.id === topicId);
    if (topic) {
      setCurrentTopicName(topic.name);
    }
    try {
      // Simulate loading for a better user experience
      await new Promise(resolve => setTimeout(resolve, 500));
      const newQuestions = await getQuizQuestions(topicId, questionCount);
      if (newQuestions.length === 0) {
        throw new Error("No questions available for this topic. Please add questions to the data file.");
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
      setScore(prev => prev + 1);
    } else {
      setWrongAnswers(prev => [...prev, questions[currentQuestionIndex]]);
    }
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
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

  const renderContent = () => {
    switch (quizState) {
      case QuizState.LOADING:
        return <div className="text-center"><Spinner /> <p className="mt-4 text-lg">Loading your quiz...</p></div>;
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
        return <StartScreen onStartQuiz={handleStartQuiz} error={error} selectedMode={quizMode} onModeChange={setQuizMode} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8 no-print">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 tracking-wider">
            CLP Quiz
          </h1>
          {currentTopicName && (
            <h2 className="text-2xl text-slate-300 mt-2 font-semibold">
              Current test - {currentTopicName}
            </h2>
          )}
        </header>
        <main className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-slate-700 min-h-[300px] flex items-center justify-center">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;