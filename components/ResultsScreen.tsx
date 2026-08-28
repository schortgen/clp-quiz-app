import React from 'react';
import type { QuizQuestion } from '../types';

interface ResultsScreenProps {
  score: number;
  totalQuestions: number;
  onRestart: () => void;
  wrongAnswers: QuizQuestion[];
  currentTopicName: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ score, totalQuestions, onRestart, wrongAnswers, currentTopicName }) => {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  let message = '';
  let messageColor = '';

  if (percentage >= 80) {
    message = 'Excellent work! You\'re on the right track.';
    messageColor = 'text-green-400';
  } else if (percentage >= 50) {
    message = 'Good effort! A little more practice will help.';
    messageColor = 'text-yellow-400';
  } else {
    message = 'Keep studying! You can do it.';
    messageColor = 'text-red-400';
  }
  
  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = `CLP Quiz Review: Missed Questions for ${currentTopicName}`;
    const body = `Here are the questions I missed on the ${currentTopicName} test:\n\n` +
      wrongAnswers.map((item, index) => {
        const optionsText = item.options.map((option, optIndex) => 
          `${optIndex === item.correctAnswerIndex ? '-> ' : '   '}${option}`
        ).join('\n');
      
        return `Question ${index + 1}: ${item.questionText}\n\nOptions:\n${optionsText}\n\nExplanation: ${item.explanation || 'N/A'}`;
    }).join('\n\n---------------------------------\n\n');

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="text-center w-full flex flex-col items-center">
      <div className="no-print w-full flex flex-col items-center justify-between min-h-[300px]">
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Quiz Complete!</h2>
          <p className="text-lg mb-8 text-slate-300">You scored</p>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-slate-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
              <circle
                className="text-cyan-500"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-bold text-cyan-400">{percentage}%</span>
              <span className="text-slate-400">{score} / {totalQuestions}</span>
            </div>
          </div>
          <p className={`text-xl font-semibold ${messageColor}`}>{message}</p>
        </div>

        <button
          onClick={onRestart}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold mt-8 py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
        >
          Take Another Quiz
        </button>
      </div>

      {wrongAnswers.length > 0 && (
        <div className="w-full mt-10 text-left">
           <div className="printable-section">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Review Your Missed Questions for {currentTopicName}</h3>
            <div className="space-y-6">
              {wrongAnswers.map((item, index) => (
                <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                  <p className="font-semibold text-lg mb-2">{index + 1}. {item.questionText}</p>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    {item.options.map((option, optIndex) => (
                      <li key={optIndex} className={`${optIndex === item.correctAnswerIndex ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                        {option}
                      </li>
                    ))}
                  </ul>
                  {item.explanation && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-cyan-400 font-bold">Explanation:</p>
                      <p className="text-slate-300">{item.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 no-print">
            <button
              onClick={handlePrint}
              className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
            >
              Print Missed Questions
            </button>
            <button
              onClick={handleEmail}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
            >
              Email Missed Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsScreen;