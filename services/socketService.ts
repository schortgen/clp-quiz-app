import { io, Socket } from 'socket.io-client';
import type { GameRoomState } from '../types.ts';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 6000,
    });
  }
  return socket;
};

export const createGameRoom = (
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

    s.emit('create_room', { roomName, playerName }, (res: { success: boolean; room?: GameRoomState; error?: string }) => {
      clearTimeout(timer);
      resolve(res);
    });
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
