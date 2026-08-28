import React, { useState } from 'react';
import { QUIZ_TOPICS } from '../constants';
import type { QuizMode } from '../types';
import { Users } from 'lucide-react';

interface StartScreenProps {
  onStartQuiz: (topicId: string, questionCount: number) => void;
  error: string | null;
  selectedMode: QuizMode;
  onModeChange: (mode: QuizMode) => void;
  onOpenGameMode: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartQuiz,
  error,
  selectedMode,
  onModeChange,
  onOpenGameMode,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(QUIZ_TOPICS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTopic = QUIZ_TOPICS.find((t) => t.id === selectedTopicId);
    if (selectedTopic) {
      onStartQuiz(selectedTopic.id, selectedTopic.questionCount);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <p className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-lg mb-4 text-center">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="w-4/5 mx-auto mb-8">
          <h3 className="text-lg font-medium text-center text-slate-300 mb-4">Select Mode</h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <label className="flex items-center justify-center p-3 w-full sm:w-[45%] md:w-[35%] bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition border-2 border-transparent has-[:checked]:border-cyan-500 has-[:checked]:bg-slate-600">
              <input
                type="radio"
                name="quiz-mode"
                value="practice"
                checked={selectedMode === 'practice'}
                onChange={() => onModeChange('practice')}
                className="w-5 h-5 appearance-none border-2 border-slate-500 rounded-full bg-slate-800 checked:bg-cyan-500 checked:border-transparent focus:outline-none"
              />
              <span className="ml-4 text-lg text-white">Practice</span>
            </label>
            <label className="flex items-center justify-center p-3 w-full sm:w-[45%] md:w-[35%] bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition border-2 border-transparent has-[:checked]:border-cyan-500 has-[:checked]:bg-slate-600">
              <input
                type="radio"
                name="quiz-mode"
                value="timed"
                checked={selectedMode === 'timed'}
                onChange={() => onModeChange('timed')}
                className="w-5 h-5 appearance-none border-2 border-slate-500 rounded-full bg-slate-800 checked:bg-cyan-500 checked:border-transparent focus:outline-none"
              />
              <span className="ml-4 text-lg text-white">Timed</span>
            </label>
          </div>

          {/* Game Mode Button below Practice & Timed buttons */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onOpenGameMode}
              className="w-full sm:w-[92%] md:w-[72%] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-5 rounded-lg text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-500/20 transition-transform transform hover:scale-[1.02] cursor-pointer border border-cyan-400/40"
            >
              <Users className="w-5 h-5" />
              <span>Game Mode (Create / Join Room)</span>
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-6 text-center">Choose your test...</h2>

        <div className="space-y-4 mb-8 w-4/5 mx-auto">
          {QUIZ_TOPICS.map((topic) => (
            <React.Fragment key={topic.id}>
              {topic.id === 'passenger' && (
                <div className="flex items-center justify-center h-[70px] text-slate-400 italic font-medium text-center">
                  All the categories below are under construction and do not have any questions yet.
                </div>
              )}
              <label className="flex items-center px-12 py-1 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition border-2 border-transparent has-[:checked]:border-cyan-500 has-[:checked]:bg-slate-600">
                <input
                  type="radio"
                  name="quiz-topic"
                  value={topic.id}
                  checked={selectedTopicId === topic.id}
                  onChange={() => setSelectedTopicId(topic.id)}
                  className="w-5 h-5 appearance-none border-2 border-slate-500 rounded-full bg-slate-800 checked:bg-cyan-500 checked:border-transparent focus:outline-none"
                />
                <span className="ml-4 text-lg text-white">{topic.name}</span>
              </label>
            </React.Fragment>
          ))}
        </div>
        <div className="w-4/5 mx-auto">
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 cursor-pointer"
          >
            NEXT
          </button>
        </div>
      </form>
    </div>
  );
};

export default StartScreen;