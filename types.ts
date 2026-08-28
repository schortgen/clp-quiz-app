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
  GAME_LOBBY = 'game_lobby',
}

export type QuizMode = 'practice' | 'timed' | 'game';

export interface QuizTopic {
  id: string;
  name: string;
  description: string;
  questionCount: number;
}

export interface GamePlayer {
  id: string;
  name: string;
  isHost: boolean;
  correctCount: number;
  wrongCount: number;
  hasAnswered: boolean;
  chosenIndex?: number | null;
  answerTimeMs?: number | null;
  isOnline: boolean;
}

export type GameStatus = 'lobby' | 'in_quiz' | 'question_reveal' | 'finished';

export interface QuestionRevealData {
  correctAnswerIndex: number;
  explanation?: string;
  firstCorrectPlayer: {
    id: string;
    name: string;
    timeMs: number;
  } | null;
  playerAnswers: {
    playerId: string;
    name: string;
    chosenIndex: number;
    isCorrect: boolean;
    timeMs?: number;
  }[];
}

export interface GameRoomState {
  roomId: string;
  roomName: string;
  hostId: string;
  status: GameStatus;
  topicId: string;
  topicName: string;
  questionCount: number;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentQuestion?: {
    questionText: string;
    options: string[];
  };
  players: GamePlayer[];
  revealData: QuestionRevealData | null;
  offlineDeadline?: number | null;
  allQuestionsReview?: {
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }[];
}
