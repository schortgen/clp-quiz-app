
import React, { useState, useEffect } from 'react';
import type { QuizQuestion, QuizMode } from '../types';

interface QuestionCardProps {
  question: QuizQuestion;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
  quizMode: QuizMode;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, onNext, questionNumber, totalQuestions, quizMode }) => {
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);

  // Reset state for new question
  useEffect(() => {
    setSelectedAnswerIndex(null);
    setIsAnswered(false);
    if (quizMode === 'timed') {
      setTimeLeft(180);
    }
  }, [question, quizMode]);

  // Timer countdown logic
  useEffect(() => {
    if (quizMode === 'timed' && !isAnswered && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [quizMode, isAnswered, timeLeft]);

  // Handle timeout
  useEffect(() => {
    if (quizMode === 'timed' && !isAnswered && timeLeft === 0) {
      setIsAnswered(true);
      onAnswer(false); // Mark as incorrect
      const timeoutId = setTimeout(onNext, 2000); // Automatically move to next question after a delay
      return () => clearTimeout(timeoutId);
    }
  }, [quizMode, isAnswered, timeLeft, onAnswer, onNext]);


  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedAnswerIndex(index);
    const isCorrect = index === question.correctAnswerIndex;
    onAnswer(isCorrect);
  };
  
  const getButtonClass = (index: number) => {
    if (!isAnswered) {
      return 'bg-slate-700 hover:bg-slate-600';
    }
    if (index === question.correctAnswerIndex) {
      return 'bg-green-600 animate-pulse';
    }
    if (index === selectedAnswerIndex && index !== question.correctAnswerIndex) {
      return 'bg-red-600';
    }
    return 'bg-slate-700 opacity-50';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="w-full flex flex-col">
       <div className="mb-6">
        <div className="flex justify-between items-center text-xl font-semibold mb-2">
          <p className="text-cyan-400">Question {questionNumber} of {totalQuestions}</p>
          {quizMode === 'timed' && (
            <p className={`text-3xl font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
              {formatTime(timeLeft)}
            </p>
          )}
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}></div>
        </div>
      </div>
      <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">{question.questionText}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(index)}
            disabled={isAnswered}
            className={`w-full p-4 rounded-lg text-left text-lg transition-all duration-300 ${getButtonClass(index)} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {option}
          </button>
        ))}
      </div>
      {isAnswered && selectedAnswerIndex !== question.correctAnswerIndex && question.explanation && (
        <div className="mt-6 p-4 bg-slate-900/70 border border-slate-700 rounded-lg animate-fade-in">
          <h3 className="font-bold text-cyan-400 mb-2 text-lg">
            {quizMode === 'timed' && timeLeft === 0 ? "Time's Up! Explanation" : "Explanation"}
          </h3>
          <p className="text-slate-300">{question.explanation}</p>
        </div>
      )}
      {isAnswered && (
        <div className="mt-8 text-center animate-fade-in">
          <button
            onClick={onNext}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            {questionNumber === totalQuestions ? 'Calculate Score' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;