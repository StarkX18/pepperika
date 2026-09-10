import { nanoid } from 'nanoid';
import { FEATURE_UNLOCKS } from './rules/templates.js';
import { orchestrator } from './agents/AgentOrchestrator.js';
import { chatPartnerAgent } from './agents/ChatPartnerAgent.js';
import { isLlmEnabled } from './llm/llmClient.js';

const DEMO_PROFILES = [
  {
    id: 'alex',
    name: 'Alex',
    avatar: '🌿',
    bio: 'Plant mom, trivia nerd, always down for coffee',
    interests: ['food', 'trivia', 'hiking'],
    humor: 'dry',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    avatar: '🎸',
    bio: 'Musician who cooks too much pasta',
    interests: ['music', 'food', 'film'],
    humor: 'playful',
  },
  {
    id: 'sam',
    name: 'Sam',
    avatar: '📚',
    bio: 'Bookstore person — will recommend you three novels',
    interests: ['books', 'coffee', 'art'],
    humor: 'witty',
  },
  {
    id: 'riley',
    name: 'Riley',
    avatar: '🏃',
    bio: 'Marathon training but make it brunch',
    interests: ['fitness', 'brunch', 'travel'],
    humor: 'energetic',
  },
];

/** @type {Map<string, import('./types.js').Conversation>} */
const conversations = new Map();

/** @type {Map<string, string>} inviteCode -> conversationId */
const inviteIndex = new Map();

/** @type {Map<string, string>} socketId -> participantId */
const socketParticipants = new Map();

/** @type {Map<string, Set<string>>} conversationId -> socketIds */
const conversationSockets = new Map();

function getMatchProfile(matchProfileId) {
  return DEMO_PROFILES.find((p) => p.id === matchProfileId) || DEMO_PROFILES[0];
}

function trackSocket(conversationId, socketId) {
  if (!conversationSockets.has(conversationId)) {
    conversationSockets.set(conversationId, new Set());
  }
  conversationSockets.get(conversationId).add(socketId);
}

function buildConversationBase(userProfile, matchProfile, mode) {
  const { rules, agentLog } = orchestrator.onMatch(userProfile, matchProfile);
  return {
    id: nanoid(10),
    mode,
    inviteCode: null,
    participants: [
      {
        id: userProfile.id || nanoid(6),
        name: userProfile.name || 'You',
        avatar: userProfile.avatar || '💫',
        bio: userProfile.bio || '',
        spark: 0,
        isAi: false,
      },
      {
        id: matchProfile.id,
        name: matchProfile.name,
        avatar: matchProfile.avatar,
        bio: matchProfile.bio,
        spark: 0,
        isAi: mode === 'solo_ai',
        interests: matchProfile.interests,
        humor: matchProfile.humor,
      },
    ],
    rules,
    messages: [],
    level: 1,
    unlockedFeatures: [],
    status: 'active',
    agentLog: agentLog.slice(),
    aiProfile: mode === 'solo_ai' ? matchProfile : null,
  };
}

export function getDemoProfiles() {
  return DEMO_PROFILES.map(({ id, name, avatar, bio }) => ({ id, name, avatar, bio }));
}

/** Solo mode: human vs LLM-powered AI match */
export function createMatch(userProfile, matchProfileId) {
  const match = getMatchProfile(matchProfileId);
  const conversation = buildConversationBase(userProfile, match, 'solo_ai');
  conversations.set(conversation.id, conversation);
  return serializeConversation(conversation);
}

/** Two-player: host creates a waiting room with invite code */
export function createTwoPlayerRoom(hostProfile) {
  const inviteCode = nanoid(6).toUpperCase();
  const placeholder = {
    id: 'pending-partner',
    name: 'Waiting for partner…',
    avatar: '⏳',
    bio: 'Share your invite link',
    spark: 0,
    isAi: false,
  };

  const { rules, agentLog } = orchestrator.onMatch(hostProfile, {
    name: 'Partner',
    interests: [],
    humor: 'playful',
  });

  /** @type {import('./types.js').Conversation} */
  const conversation = {
    id: nanoid(10),
    mode: 'two_player',
    inviteCode,
    participants: [
      {
        id: hostProfile.id || nanoid(6),
        name: hostProfile.name || 'Player 1',
        avatar: hostProfile.avatar || '💫',
        bio: hostProfile.bio || '',
        spark: 0,
        isAi: false,
      },
      placeholder,
    ],
    rules,
    messages: [],
    level: 1,
    unlockedFeatures: [],
    status: 'waiting',
    agentLog: agentLog.slice(),
    aiProfile: null,
  };

  conversations.set(conversation.id, conversation);
  inviteIndex.set(inviteCode, conversation.id);
  return serializeConversation(conversation);
}

export function getRoomByInvite(inviteCode) {
  const id = inviteIndex.get(String(inviteCode).toUpperCase());
  if (!id) return null;
  const conv = conversations.get(id);
  if (!conv) return null;
  return {
    inviteCode: conv.inviteCode,
    conversationId: conv.id,
    status: conv.status,
    hostName: conv.participants[0]?.name,
    playerCount: conv.participants.filter((p) => p.id !== 'pending-partner').length,
  };
}

export function joinTwoPlayerRoom(inviteCode, guestProfile) {
  const id = inviteIndex.get(String(inviteCode).toUpperCase());
  if (!id) return { error: 'Invalid invite code' };

  const conv = conversations.get(id);
  if (!conv) return { error: 'Room not found' };
  if (conv.status === 'completed') return { error: 'This game is already finished' };
  if (conv.participants[1]?.id !== 'pending-partner') {
    return { error: 'Room is full — only 2 players allowed' };
  }

  conv.participants[1] = {
    id: guestProfile.id || nanoid(6),
    name: guestProfile.name || 'Player 2',
    avatar: guestProfile.avatar || '🌟',
    bio: guestProfile.bio || '',
    spark: 0,
    isAi: false,
  };
  conv.status = 'active';
  conv.agentLog.push({
    agent: 'RuleGeneratorAgent',
    message: `${guestProfile.name || 'Player 2'} joined — mystery rules are live!`,
  });

  return { conversation: serializeConversation(conv), joined: true };
}

export function getConversation(conversationId) {
  const conv = conversations.get(conversationId);
  return conv ? serializeConversation(conv) : null;
}

export function joinConversation(conversationId, participantId) {
  const conv = conversations.get(conversationId);
  if (!conv) return null;
  return serializeConversation(conv);
}

export function bindSocket(socketId, participantId, conversationId) {
  socketParticipants.set(socketId, participantId);
  if (conversationId) trackSocket(conversationId, socketId);
}

export function unbindSocket(socketId, conversationId) {
  socketParticipants.delete(socketId);
  if (conversationId) conversationSockets.get(conversationId)?.delete(socketId);
}

export function getParticipantId(socketId) {
  return socketParticipants.get(socketId);
}

export function getOnlineCount(conversationId) {
  return conversationSockets.get(conversationId)?.size || 0;
}

function appendMessage(conv, senderId, trimmed) {
  const pipeline = orchestrator.onMessage(conv.rules, trimmed, senderId, conv.messages);
  if (pipeline.blocked) {
    return { error: pipeline.moderation.reason, moderation: pipeline.moderation };
  }

  /** @type {import('./types.js').Message} */
  const message = {
    id: nanoid(8),
    senderId,
    text: trimmed,
    timestamp: Date.now(),
    violations: pipeline.monitor.violations.map((v) => v.subtle),
    blocked: false,
  };

  conv.messages.push(message);
  conv.agentLog.push(...pipeline.agentLog);

  return {
    message,
    nudges: pipeline.monitor.nudges,
    moderation: pipeline.moderation,
    suggestGuess: pipeline.monitor.suggestGuess,
    conversation: serializeConversation(conv),
  };
}

export function sendMessage(conversationId, senderId, text) {
  const conv = conversations.get(conversationId);
  if (!conv) return { error: 'Conversation not found' };
  if (conv.status === 'waiting') return { error: 'Waiting for your partner to join' };
  if (conv.status !== 'active') return { error: 'Conversation is not active' };

  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty message' };

  return appendMessage(conv, senderId, trimmed);
}

/** Generate AI match reply after human message (solo mode) */
export async function generateAiReply(conversationId) {
  const conv = conversations.get(conversationId);
  if (!conv || conv.mode !== 'solo_ai' || conv.status !== 'active') return null;

  const human = conv.participants.find((p) => !p.isAi);
  const ai = conv.participants.find((p) => p.isAi);
  if (!human || !ai || !conv.aiProfile) return null;

  const { text, agent, llm } = await chatPartnerAgent.generateReply(
    { ...conv.aiProfile, id: ai.id },
    conv.messages,
    conv.rules,
    human.name
  );

  const result = appendMessage(conv, ai.id, text);
  if (result.error) return null;

  conv.agentLog.push({
    agent,
    message: llm ? 'LLM reply sent' : 'Template reply sent (set OPENAI_API_KEY for LLM)',
  });

  return result;
}

export function submitGuess(conversationId, participantId, guess) {
  const conv = conversations.get(conversationId);
  if (!conv) return { error: 'Conversation not found' };
  if (conv.status === 'waiting') return { error: 'Waiting for partner' };

  const result = orchestrator.onGuess(conv.rules, guess, participantId, conv.messages);
  conv.agentLog.push(...result.agentLog);

  if (!result.correct) {
    return {
      correct: false,
      feedback: result.feedback,
      nearMiss: result.nearMiss,
      conversation: serializeConversation(conv),
    };
  }

  const rule = conv.rules.find((r) => r.id === result.ruleId);
  if (!rule || rule.revealed) {
    return {
      correct: false,
      feedback: 'Rule already revealed',
      conversation: serializeConversation(conv),
    };
  }

  rule.revealed = true;
  rule.guessedBy = participantId;

  const participant = conv.participants.find((p) => p.id === participantId);
  if (participant) participant.spark += rule.sparkReward;

  const feature = FEATURE_UNLOCKS[rule.tier];
  if (feature && !conv.unlockedFeatures.includes(feature)) {
    conv.unlockedFeatures.push(feature);
  }

  const revealedCount = conv.rules.filter((r) => r.revealed).length;
  conv.level = Math.min(4, revealedCount + 1);

  if (revealedCount === conv.rules.length) {
    conv.status = 'completed';
  }

  return {
    correct: true,
    feedback: result.feedback,
    rule: { id: rule.id, description: rule.description, tier: rule.tier, sparkReward: rule.sparkReward },
    reward: { spark: rule.sparkReward, feature: feature || null },
    conversation: serializeConversation(conv),
  };
}

export function requestHint(conversationId, participantId) {
  const conv = conversations.get(conversationId);
  if (!conv) return { error: 'Conversation not found' };

  const participant = conv.participants.find((p) => p.id === participantId);
  if (!participant) return { error: 'Participant not found' };

  const hintResult = orchestrator.onHintRequest(conv.rules, conv.messages);
  if (hintResult.cost > participant.spark && conv.messages.length > 3) {
    return { error: 'Not enough Spark (need 10). Keep chatting to earn more!', cost: hintResult.cost };
  }

  if (participant.spark >= hintResult.cost) {
    participant.spark -= hintResult.cost;
  }

  conv.agentLog.push(...hintResult.agentLog);

  return {
    hint: hintResult.hint,
    cost: hintResult.cost,
    conversation: serializeConversation(conv),
  };
}

/** @param {import('./types.js').Conversation} conv */
function serializeConversation(conv) {
  return {
    id: conv.id,
    mode: conv.mode,
    inviteCode: conv.inviteCode,
    participants: conv.participants.map(({ interests, humor, isAi, ...rest }) => rest),
    rules: conv.rules.map((r) => ({
      id: r.id,
      tier: r.tier,
      revealed: r.revealed,
      description: r.revealed ? r.description : null,
      guessedBy: r.guessedBy,
      sparkReward: r.sparkReward,
    })),
    ruleCount: conv.rules.length,
    revealedCount: conv.rules.filter((r) => r.revealed).length,
    messages: conv.messages,
    level: conv.level,
    unlockedFeatures: conv.unlockedFeatures,
    status: conv.status,
    onlineCount: getOnlineCount(conv.id),
    llmEnabled: isLlmEnabled(),
    agentLog: conv.agentLog.slice(-10),
  };
}

export function getAgentStatus() {
  return {
    agents: [
      { name: 'RuleGeneratorAgent', role: 'Creates per-match mystery rule sets' },
      { name: 'RuleMonitorAgent', role: 'Live violation detection & nudges' },
      { name: 'RuleJudgeAgent', role: 'Adjudicates rule guesses with evidence' },
      { name: 'HintAgent', role: 'Non-spoiling hints when stuck' },
      { name: 'ModerationAgent', role: 'Safety layer — always wins over game rules' },
      { name: 'ChatPartnerAgent', role: 'LLM-powered dating match replies (solo mode)' },
    ],
    activeConversations: conversations.size,
    llmEnabled: isLlmEnabled(),
  };
}
