
import type { QuizQuestion } from '../types';
import { rawQuizData } from '../assets/data';
import { parseQuizData } from './quizParser';

/**
 * Shuffles an array in place and returns it.
 * @param array The array to shuffle.
 */
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Fetches a specified number of quiz questions for a given topic.
 * @param topicId The ID of the quiz topic.
 * @param numberOfQuestions The number of questions to return.
 * @returns A promise that resolves to an array of QuizQuestion objects.
 */
export const getQuizQuestions = async (
  topicId: string,
  numberOfQuestions: number
): Promise<QuizQuestion[]> => {
  return new Promise((resolve, reject) => {
    const rawQuestionsText = rawQuizData[topicId];

    if (rawQuestionsText === undefined) {
      // Reject if the topic doesn't exist at all
      return reject(new Error(`Topic not found: ${topicId}`));
    }
    
    const questionsForTopic = parseQuizData(rawQuestionsText);

    // Shuffle the questions to provide a different quiz each time
    const shuffledQuestions = shuffleArray([...questionsForTopic]);

    // Take the requested number of questions
    const selectedQuestions = shuffledQuestions.slice(0, numberOfQuestions);

    resolve(selectedQuestions);
  });
};
