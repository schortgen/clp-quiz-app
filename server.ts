import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { rawQuizData } from './assets/data/index.ts';
import { parseQuizData } from './services/quizParser.ts';
import { QUIZ_TOPICS } from './constants.ts';
import type { GamePlayer, GameRoomState, QuestionRevealData, QuizQuestion } from './types.ts';

interface InternalRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  roomType: 'standard' | 'classroom';
  status: 'lobby' | 'in_quiz' | 'question_reveal' | 'finished';
  topicId: string;
  topicName: string;
  questionCount: number;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  questionStartTime: number;
  players: Map<string, GamePlayer>;
  revealData: QuestionRevealData | null;
  offlineTimer?: NodeJS.Timeout | null;
  offlineDeadline?: number | null;
}

const rooms = new Map<string, InternalRoom>();

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getQuestionsForTopic = (topicId: string, count: number): QuizQuestion[] => {
  const rawText = rawQuizData[topicId];
  if (!rawText) return [];
  const parsed = parseQuizData(rawText);
  return shuffleArray(parsed).slice(0, count);
};

const sanitizeRoomStateForClient = (room: InternalRoom): GameRoomState => {
  const playersList = Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    isTeacher: !!p.isTeacher,
    correctCount: p.correctCount,
    wrongCount: p.wrongCount,
    hasAnswered: p.hasAnswered,
    chosenIndex: room.status === 'question_reveal' || room.status === 'finished' ? p.chosenIndex : (p.hasAnswered ? -1 : null),
    answerTimeMs: room.status === 'question_reveal' || room.status === 'finished' ? p.answerTimeMs : null,
    isOnline: p.isOnline,
  }));

  const currentQ = room.questions[room.currentQuestionIndex];

  let currentQuestionSummary: GameRoomState['currentQuestion'] | undefined;
  if (currentQ && (room.status === 'in_quiz' || room.status === 'question_reveal')) {
    currentQuestionSummary = {
      questionText: currentQ.questionText,
      options: currentQ.options,
    };
  }

  let allQuestionsReview: GameRoomState['allQuestionsReview'];
  if (room.status === 'finished') {
    allQuestionsReview = room.questions.map(q => ({
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
    }));
  }

  return {
    roomId: room.roomId,
    roomName: room.roomName,
    hostId: room.hostId,
    roomType: room.roomType || 'standard',
    status: room.status,
    topicId: room.topicId,
    topicName: room.topicName,
    questionCount: room.questionCount,
    totalQuestions: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex,
    currentQuestion: currentQuestionSummary,
    players: playersList,
    revealData: room.revealData,
    offlineDeadline: room.offlineDeadline,
    allQuestionsReview,
  };
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // CORS middleware for API endpoints
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/active-rooms', (req, res) => {
    const list = Array.from(rooms.values()).map((r) => {
      const teacher = Array.from(r.players.values()).find((p) => p.isTeacher);
      return {
        roomId: r.roomId,
        roomName: r.roomName,
        roomType: r.roomType || 'standard',
        teacherName: teacher ? teacher.name : undefined,
        status: r.status,
        topicName: r.topicName,
        playerCount: Array.from(r.players.values()).filter((p) => p.isOnline).length,
      };
    });
    res.json(list);
  });

  app.get('/api/topics', (req, res) => {
    res.json(QUIZ_TOPICS);
  });

  const clearOfflineTimer = (room: InternalRoom) => {
    if (room.offlineTimer) {
      clearTimeout(room.offlineTimer);
      room.offlineTimer = null;
    }
    room.offlineDeadline = null;
  };

  const checkAndTriggerReveal = (room: InternalRoom, force: boolean = false) => {
    if (room.status !== 'in_quiz') return;

    // Filter students (players who are taking the test, excluding the teacher)
    const allStudents = Array.from(room.players.values()).filter(p => !p.isTeacher);
    const onlineStudents = allStudents.filter(p => p.isOnline);
    const offlineStudents = allStudents.filter(p => !p.isOnline);

    // If in classroom mode and there are no students at all yet, only reveal if forced by teacher
    if (room.roomType === 'classroom' && allStudents.length === 0 && !force) {
      return;
    }

    if (!force) {
      // Check if online students have all answered
      const allOnlineAnswered = onlineStudents.length > 0 && onlineStudents.every(p => p.hasAnswered);
      if (!allOnlineAnswered && onlineStudents.length > 0) {
        // Still waiting for online students to answer
        return;
      }

      // If all online students answered, check if there are offline students who haven't answered yet
      const unAnsweredOffline = offlineStudents.filter(p => !p.hasAnswered);
      if (unAnsweredOffline.length > 0) {
        // Start 30-second countdown for offline players to reconnect if not already started
        if (!room.offlineTimer) {
          const GRACE_PERIOD_MS = 30000;
          room.offlineDeadline = Date.now() + GRACE_PERIOD_MS;
          
          // Broadcast the deadline so clients can display a live 30s countdown timer
          io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));

          room.offlineTimer = setTimeout(() => {
            room.offlineTimer = null;
            room.offlineDeadline = null;
            // Grace period expired: reveal answers!
            checkAndTriggerReveal(room, true);
          }, GRACE_PERIOD_MS);
        }
        return;
      }
    }

    // Clear any active offline timer if we are revealing
    clearOfflineTimer(room);

    const currentQ = room.questions[room.currentQuestionIndex];
    if (!currentQ) return;

    // Calculate answers & correctness for student players (excluding teacher from scoring)
    const playerAnswers: QuestionRevealData['playerAnswers'] = [];
    const correctPlayers: { id: string; name: string; timeMs: number }[] = [];

    for (const p of room.players.values()) {
      // Teachers do not answer or get graded
      if (p.isTeacher) {
        continue;
      }

      if (p.hasAnswered && p.chosenIndex !== null && p.chosenIndex !== undefined && p.chosenIndex >= 0) {
        const isCorrect = p.chosenIndex === currentQ.correctAnswerIndex;
        if (isCorrect) {
          p.correctCount += 1;
          if (p.answerTimeMs !== null && p.answerTimeMs !== undefined) {
            correctPlayers.push({
              id: p.id,
              name: p.name,
              timeMs: p.answerTimeMs,
            });
          }
        } else {
          p.wrongCount += 1;
        }

        playerAnswers.push({
          playerId: p.id,
          name: p.name,
          chosenIndex: p.chosenIndex,
          isCorrect,
          timeMs: p.answerTimeMs ?? undefined,
        });
      } else {
        // Student did not answer (e.g. disconnected or teacher revealed early)
        p.wrongCount += 1;
        playerAnswers.push({
          playerId: p.id,
          name: p.name,
          chosenIndex: -1,
          isCorrect: false,
          timeMs: undefined,
        });
      }
    }

    correctPlayers.sort((a, b) => a.timeMs - b.timeMs);
    const firstCorrectPlayer = correctPlayers.length > 0 ? correctPlayers[0] : null;

    room.status = 'question_reveal';
    room.revealData = {
      correctAnswerIndex: currentQ.correctAnswerIndex,
      explanation: currentQ.explanation,
      firstCorrectPlayer,
      playerAnswers,
    };

    io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
  };

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentPlayerName: string | null = null;

    socket.on(
      'create_room',
      (
        data: { roomName: string; playerName: string; isTeacher?: boolean; roomType?: 'standard' | 'classroom' },
        callback
      ) => {
        const roomName = data.roomName?.trim();
        const playerName = data.playerName?.trim();
        const isTeacher = !!data.isTeacher;
        const roomType = data.roomType || (isTeacher ? 'classroom' : 'standard');

        if (!roomName || !playerName) {
          return callback({ success: false, error: 'Room name and your name are required.' });
        }

        const roomId = roomName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        if (rooms.has(roomId)) {
          const existing = rooms.get(roomId)!;
          const onlineCount = Array.from(existing.players.values()).filter((p) => p.isOnline).length;
          if (onlineCount > 0) {
            return callback({
              success: false,
              error: 'A room with this name already exists. Please join it or choose another name.',
            });
          }
        }

        const defaultTopic = QUIZ_TOPICS[0];
        const initialPlayer: GamePlayer = {
          id: socket.id,
          name: playerName,
          isHost: true,
          isTeacher,
          correctCount: 0,
          wrongCount: 0,
          hasAnswered: false,
          chosenIndex: null,
          answerTimeMs: null,
          isOnline: true,
        };

        const newRoom: InternalRoom = {
          roomId,
          roomName,
          hostId: socket.id,
          roomType,
          status: 'lobby',
          topicId: defaultTopic.id,
          topicName: defaultTopic.name,
          questionCount: defaultTopic.questionCount,
          questions: [],
          currentQuestionIndex: 0,
          questionStartTime: 0,
          players: new Map([[socket.id, initialPlayer]]),
          revealData: null,
        };

        rooms.set(roomId, newRoom);
        currentRoomId = roomId;
        currentPlayerName = playerName;

        socket.join(roomId);
        callback({ success: true, room: sanitizeRoomStateForClient(newRoom) });
      }
    );

    socket.on('join_room', (data: { roomName: string; playerName: string }, callback) => {
      const roomName = data.roomName?.trim();
      const playerName = data.playerName?.trim();

      if (!roomName || !playerName) {
        return callback({ success: false, error: 'Room name and your name are required.' });
      }

      const roomId = roomName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      let room = rooms.get(roomId);

      if (!room) {
        // Try looking up by exact roomName case-insensitively
        for (const r of rooms.values()) {
          if (r.roomName.toLowerCase() === roomName.toLowerCase()) {
            room = r;
            break;
          }
        }
      }

      if (!room) {
        return callback({ success: false, error: `Room "${roomName}" not found. Please check the name or create it first.` });
      }

      // Check if player name is already used in this room
      const existingPlayerEntry = Array.from(room.players.values()).find(
        p => p.name.toLowerCase() === playerName.toLowerCase()
      );

      if (existingPlayerEntry && existingPlayerEntry.isOnline && existingPlayerEntry.id !== socket.id) {
        return callback({ success: false, error: `The name "${playerName}" is already taken in this room. Please pick a different name.` });
      }

      let player: GamePlayer;
      if (existingPlayerEntry) {
        // Reconnecting player
        room.players.delete(existingPlayerEntry.id);
        player = {
          ...existingPlayerEntry,
          id: socket.id,
          isOnline: true,
        };
      } else {
        player = {
          id: socket.id,
          name: playerName,
          isHost: room.players.size === 0,
          correctCount: 0,
          wrongCount: 0,
          hasAnswered: false,
          chosenIndex: null,
          answerTimeMs: null,
          isOnline: true,
        };
      }

      room.players.set(socket.id, player);
      currentRoomId = room.roomId;
      currentPlayerName = playerName;

      socket.join(room.roomId);
      callback({ success: true, room: sanitizeRoomStateForClient(room) });
      socket.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
      socket.to(room.roomId).emit('player_joined', { name: playerName });

      // If game is in progress and player needs to answer, check status
      if (room.status === 'in_quiz') {
        // If the reconnecting player was the only offline player, and has now come back online, clear timer if they're online
        const offlineUnanswered = Array.from(room.players.values()).filter(p => !p.isOnline && !p.hasAnswered);
        if (offlineUnanswered.length === 0) {
          clearOfflineTimer(room);
        }
        checkAndTriggerReveal(room);
      }
    });

    socket.on('select_topic', (data: { topicId: string; questionCount?: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;

      const topic = QUIZ_TOPICS.find(t => t.id === data.topicId);
      if (topic) {
        room.topicId = topic.id;
        room.topicName = topic.name;
        room.questionCount = data.questionCount || topic.questionCount;
        io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
      }
    });

    socket.on('start_game', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;

      clearOfflineTimer(room);
      const questions = getQuestionsForTopic(room.topicId, room.questionCount);
      if (questions.length === 0) {
        socket.emit('error_message', 'No questions available for this category yet.');
        return;
      }

      room.questions = questions;
      room.currentQuestionIndex = 0;
      room.status = 'in_quiz';
      room.revealData = null;
      room.questionStartTime = Date.now();

      // Reset players
      for (const p of room.players.values()) {
        p.correctCount = 0;
        p.wrongCount = 0;
        p.hasAnswered = false;
        p.chosenIndex = null;
        p.answerTimeMs = null;
      }

      io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
    });

    socket.on('submit_answer', (data: { optionIndex: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.status !== 'in_quiz') return;

      const player = room.players.get(socket.id);
      if (!player || player.hasAnswered || player.isTeacher) return;

      player.hasAnswered = true;
      player.chosenIndex = data.optionIndex;
      player.answerTimeMs = Math.max(0, Date.now() - room.questionStartTime);

      // Broadcast progress update (names answered, without revealing their option index yet)
      io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));

      // Check if everyone has answered
      checkAndTriggerReveal(room);
    });

    socket.on('next_question', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;
      if (room.status !== 'question_reveal') return;

      clearOfflineTimer(room);
      if (room.currentQuestionIndex + 1 < room.questions.length) {
        room.currentQuestionIndex += 1;
        room.status = 'in_quiz';
        room.revealData = null;
        room.questionStartTime = Date.now();

        for (const p of room.players.values()) {
          p.hasAnswered = false;
          p.chosenIndex = null;
          p.answerTimeMs = null;
        }

        io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
      } else {
        // Quiz completed
        room.status = 'finished';
        io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
      }
    });

    socket.on('retest_game', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;

      clearOfflineTimer(room);
      const questions = getQuestionsForTopic(room.topicId, room.questionCount);
      if (questions.length === 0) return;

      room.questions = questions;
      room.currentQuestionIndex = 0;
      room.status = 'in_quiz';
      room.revealData = null;
      room.questionStartTime = Date.now();

      for (const p of room.players.values()) {
        p.correctCount = 0;
        p.wrongCount = 0;
        p.hasAnswered = false;
        p.chosenIndex = null;
        p.answerTimeMs = null;
      }

      io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
    });

    socket.on('force_reveal', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.status !== 'in_quiz') return;

      // Allow host or any player (if only 1 player online or stuck) to force reveal
      checkAndTriggerReveal(room, true);
    });

    socket.on('kick_player', (data: { playerId: string }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;

      const targetId = data.playerId;
      if (targetId && targetId !== socket.id && room.players.has(targetId)) {
        room.players.delete(targetId);
        io.to(targetId).emit('player_kicked');
        io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));

        if (room.status === 'in_quiz') {
          // If no other offline unanswered players remain, clear offline timer
          const offlineUnanswered = Array.from(room.players.values()).filter(p => !p.isOnline && !p.hasAnswered);
          if (offlineUnanswered.length === 0) {
            clearOfflineTimer(room);
          }
          checkAndTriggerReveal(room);
        }
      }
    });

    socket.on('change_test', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (!room || room.hostId !== socket.id) return;

      clearOfflineTimer(room);
      room.status = 'lobby';
      room.revealData = null;
      room.questions = [];
      room.currentQuestionIndex = 0;

      for (const p of room.players.values()) {
        p.hasAnswered = false;
        p.chosenIndex = null;
        p.answerTimeMs = null;
      }

      io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
    });

    socket.on('leave_room', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(socket.id);
        socket.leave(room.roomId);

        if (room.hostId === socket.id) {
          const nextPlayer = Array.from(room.players.values()).find(p => p.isOnline);
          if (nextPlayer) {
            nextPlayer.isHost = true;
            room.hostId = nextPlayer.id;
          }
        }

        const onlineCount = Array.from(room.players.values()).filter(p => p.isOnline).length;
        if (onlineCount === 0) {
          clearOfflineTimer(room);
          rooms.delete(room.roomId);
        } else {
          io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
          if (room.status === 'in_quiz') {
            const offlineUnanswered = Array.from(room.players.values()).filter(p => !p.isOnline && !p.hasAnswered);
            if (offlineUnanswered.length === 0) {
              clearOfflineTimer(room);
            }
            checkAndTriggerReveal(room);
          }
        }
      }
      currentRoomId = null;
      currentPlayerName = null;
    });

    socket.on('disconnect', () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        const player = room.players.get(socket.id);
        if (player) {
          player.isOnline = false;
        }

        if (room.hostId === socket.id) {
          const nextPlayer = Array.from(room.players.values()).find(p => p.isOnline);
          if (nextPlayer) {
            nextPlayer.isHost = true;
            room.hostId = nextPlayer.id;
          }
        }

        const onlineCount = Array.from(room.players.values()).filter(p => p.isOnline).length;
        if (onlineCount === 0) {
          // Delay deletion in case of quick refresh / reconnection
          setTimeout(() => {
            const r = rooms.get(currentRoomId!);
            if (r && Array.from(r.players.values()).filter(p => p.isOnline).length === 0) {
              rooms.delete(currentRoomId!);
            }
          }, 30000);
        } else {
          io.to(room.roomId).emit('room_updated', sanitizeRoomStateForClient(room));
          // If in quiz and the remaining online players have all answered, immediately reveal!
          if (room.status === 'in_quiz') {
            checkAndTriggerReveal(room);
          }
        }
      }
    });
  });

  // Vite development middleware vs Static Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CLP Quiz Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
