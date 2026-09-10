import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  createMatch,
  createTwoPlayerRoom,
  getRoomByInvite,
  joinTwoPlayerRoom,
  getDemoProfiles,
  getAgentStatus,
  getConversation,
  joinConversation,
  bindSocket,
  unbindSocket,
  getParticipantId,
  sendMessage,
  generateAiReply,
  submitGuess,
  requestHint,
} from './ConversationManager.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'], methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

function broadcastConversation(conversationId) {
  const conv = getConversation(conversationId);
  if (conv) io.to(conversationId).emit('conversation', conv);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mystery-rules-chat' });
});

app.get('/api/profiles', (_req, res) => {
  res.json(getDemoProfiles());
});

app.get('/api/agents', (_req, res) => {
  res.json(getAgentStatus());
});

app.post('/api/match', (req, res) => {
  const { userProfile, matchProfileId } = req.body;
  const conversation = createMatch(userProfile || { name: 'You', avatar: '💫' }, matchProfileId);
  res.json(conversation);
});

app.post('/api/room', (req, res) => {
  const { userProfile } = req.body;
  const conversation = createTwoPlayerRoom(userProfile || { name: 'Player 1', avatar: '💫' });
  res.json(conversation);
});

app.get('/api/room/:code', (req, res) => {
  const room = getRoomByInvite(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.post('/api/room/:code/join', (req, res) => {
  const result = joinTwoPlayerRoom(req.params.code, req.body.userProfile || {});
  if (result.error) return res.status(400).json(result);
  io.to(result.conversation.id).emit('room_ready', result.conversation);
  broadcastConversation(result.conversation.id);
  res.json(result);
});

io.on('connection', (socket) => {
  let activeConversationId = null;

  socket.on('join', async ({ conversationId, participantId }) => {
    activeConversationId = conversationId;
    bindSocket(socket.id, participantId, conversationId);
    socket.join(conversationId);
    const conv = joinConversation(conversationId, participantId);
    if (conv) {
      socket.emit('conversation', conv);
      broadcastConversation(conversationId);

      if (conv.mode === 'solo_ai' && conv.messages.length === 0 && conv.status === 'active') {
        const aiResult = await generateAiReply(conversationId);
        if (aiResult?.message) {
          io.to(conversationId).emit('message', {
            message: aiResult.message,
            fromAi: true,
          });
          broadcastConversation(conversationId);
        }
      }
    }
  });

  socket.on('message', async ({ conversationId, text }) => {
    const senderId = getParticipantId(socket.id);
    if (!senderId) return;

    const result = sendMessage(conversationId, senderId, text);
    if (result.error) {
      socket.emit('error', { message: result.error, moderation: result.moderation });
      return;
    }

    io.to(conversationId).emit('message', {
      message: result.message,
      nudges: result.nudges,
      moderation: result.moderation,
      suggestGuess: result.suggestGuess,
    });
    broadcastConversation(conversationId);

    const conv = getConversation(conversationId);
    if (conv?.mode === 'solo_ai' && conv.status === 'active') {
      const human = conv.participants.find((p) => !p.isAi);
      if (human?.id === senderId) {
        socket.emit('ai_typing', { typing: true });
        const aiResult = await generateAiReply(conversationId);
        socket.emit('ai_typing', { typing: false });
        if (aiResult?.message) {
          io.to(conversationId).emit('message', {
            message: aiResult.message,
            nudges: aiResult.nudges,
            moderation: aiResult.moderation,
            suggestGuess: aiResult.suggestGuess,
            fromAi: true,
          });
          broadcastConversation(conversationId);
        }
      }
    }
  });

  socket.on('guess', ({ conversationId, guess }) => {
    const participantId = getParticipantId(socket.id);
    if (!participantId) return;
    const result = submitGuess(conversationId, participantId, guess);
    io.to(conversationId).emit('guess_result', result);
    if (result.conversation) broadcastConversation(conversationId);
  });

  socket.on('hint', ({ conversationId }) => {
    const participantId = getParticipantId(socket.id);
    if (!participantId) return;
    const result = requestHint(conversationId, participantId);
    socket.emit('hint_result', result);
    if (result.conversation) broadcastConversation(conversationId);
  });

  socket.on('disconnect', () => {
    if (activeConversationId) {
      unbindSocket(socket.id, activeConversationId);
      broadcastConversation(activeConversationId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mystery Rules Chat server on http://localhost:${PORT}`);
  console.log(`LLM: ${process.env.OPENAI_API_KEY ? 'enabled' : 'fallback mode (set OPENAI_API_KEY)'}`);
});
