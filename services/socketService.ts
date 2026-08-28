import { io, Socket } from 'socket.io-client';
import type { GameRoomState } from '../types.ts';

let socket: Socket | null = null;

export const getSocketBaseUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (origin.includes('onrender.com') || hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    // Default to the live Render multiplayer server when hosted on Netlify or elsewhere
    return 'https://clp-quiz-app.onrender.com';
  }
  return '';
};

export const getSocket = (): Socket => {
  if (!socket) {
    const baseUrl = getSocketBaseUrl();
    socket = io(baseUrl || undefined, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
  }
  return socket;
};

export const createGameRoom = (
  roomName: string,
  playerName: string,
  isTeacher: boolean = false,
  roomType: 'standard' | 'classroom' = 'standard'
): Promise<{ success: boolean; room?: GameRoomState; error?: string }> => {
  const s = getSocket();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        error: 'Multiplayer server connection timed out. If running on Netlify, a Node/Socket.IO backend server (like Render or Railway) is required for multiplayer rooms.',
      });
    }, 7000);

    if (!s.connected) {
      s.connect();
    }

    s.emit(
      'create_room',
      { roomName, playerName, isTeacher, roomType },
      (res: { success: boolean; room?: GameRoomState; error?: string }) => {
        clearTimeout(timer);
        resolve(res);
      }
    );
  });
};

export const joinGameRoom = (
  roomName: string,
  playerName: string
): Promise<{ success: boolean; room?: GameRoomState; error?: string }> => {
  const s = getSocket();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        error: 'Multiplayer server connection timed out. If running on Netlify, a Node/Socket.IO backend server (like Render or Railway) is required for multiplayer rooms.',
      });
    }, 7000);

    if (!s.connected) {
      s.connect();
    }

    s.emit('join_room', { roomName, playerName }, (res: { success: boolean; room?: GameRoomState; error?: string }) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
};

export const selectRoomTopic = (topicId: string, questionCount?: number) => {
  const s = getSocket();
  s.emit('select_topic', { topicId, questionCount });
};

export const startRoomGame = () => {
  const s = getSocket();
  s.emit('start_game');
};

export const submitRoomAnswer = (optionIndex: number) => {
  const s = getSocket();
  s.emit('submit_answer', { optionIndex });
};

export const advanceNextQuestion = () => {
  const s = getSocket();
  s.emit('next_question');
};

export const retestGame = () => {
  const s = getSocket();
  s.emit('retest_game');
};

export const changeGameTest = () => {
  const s = getSocket();
  s.emit('change_test');
};

export const forceRevealAnswers = () => {
  const s = getSocket();
  s.emit('force_reveal');
};

export const kickPlayer = (playerId: string) => {
  const s = getSocket();
  s.emit('kick_player', { playerId });
};

export const leaveGameRoom = () => {
  const s = getSocket();
  s.emit('leave_room');
};
