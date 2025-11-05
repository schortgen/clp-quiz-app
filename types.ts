export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export enum QuizState {
  NOT_STARTED = 'not_started',
  LOADING = 'loading',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
}

export type QuizMode = 'practice' | 'timed';

export interface QuizTopic {
  id: string;
  name: string;
  description: string;
  questionCount: number;
}