import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  createMatch,
  getDemoProfiles,
  getAgentStatus,
  joinConversation,
  bindSocket,
  getParticipantId,
  sendMessage,
  submitGuess,
  requestHint,
} from './ConversationManager.js';

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:4173'], methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

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

io.on('connection', (socket) => {
  socket.on('join', ({ conversationId, participantId }) => {
    bindSocket(socket.id, participantId);
    socket.join(conversationId);
    const conv = joinConversation(conversationId, participantId);
    if (conv) socket.emit('conversation', conv);
  });

  socket.on('message', ({ conversationId, text }) => {
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
    io.to(conversationId).emit('conversation', result.conversation);
  });

  socket.on('guess', ({ conversationId, guess }) => {
    const participantId = getParticipantId(socket.id);
    if (!participantId) return;
    const result = submitGuess(conversationId, participantId, guess);
    io.to(conversationId).emit('guess_result', result);
    if (result.conversation) io.to(conversationId).emit('conversation', result.conversation);
  });

  socket.on('hint', ({ conversationId }) => {
    const participantId = getParticipantId(socket.id);
    if (!participantId) return;
    const result = requestHint(conversationId, participantId);
    socket.emit('hint_result', result);
    if (result.conversation) io.to(conversationId).emit('conversation', result.conversation);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Mystery Rules Chat server on http://localhost:${PORT}`);
  console.log('Agents: RuleGenerator, RuleJudge, Hint, Moderation, RuleMonitor');
});
