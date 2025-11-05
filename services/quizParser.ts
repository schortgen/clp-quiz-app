
import type { QuizQuestion } from '../types';

export const parseQuizData = (text: string): QuizQuestion[] => {
  const questionsData: QuizQuestion[] = [];
  // Split by "Q\" that is at the beginning of a line
  const questionBlocks = text.trim().split(/(?=^Q\\)/m);

  for (const block of questionBlocks) {
    if (block.trim() === '') continue;

    const lines = block.trim().split('\n');
    const questionText = lines.find(line => line.startsWith('Q\\'))?.substring(3).trim() ?? '';
    const options = lines.filter(line => line.startsWith('O\\')).map(line => line.substring(3).trim());
    const correctAnswer = lines.find(line => line.startsWith('A\\'))?.substring(3).trim() ?? '';
    const explanation = lines.find(line => line.startsWith('E\\'))?.substring(3).trim() ?? '';
    
    const correctAnswerIndex = options.indexOf(correctAnswer);

    if (questionText && options.length > 0 && correctAnswerIndex !== -1) {
      questionsData.push({
        questionText,
        options,
        correctAnswerIndex,
        explanation: explanation || undefined,
      });
    }
  }

  return questionsData;
};
