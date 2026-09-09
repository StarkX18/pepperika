import { nanoid } from 'nanoid';
import { FEATURE_UNLOCKS } from './rules/templates.js';
import { orchestrator } from './agents/AgentOrchestrator.js';

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

/** @type {Map<string, import('../types.js').Conversation>} */
const conversations = new Map();

/** @type {Map<string, string>} socketId -> participantId */
const socketParticipants = new Map();

export function getDemoProfiles() {
  return DEMO_PROFILES.map(({ id, name, avatar, bio }) => ({ id, name, avatar, bio }));
}

export function createMatch(userProfile, matchProfileId) {
  const match = DEMO_PROFILES.find((p) => p.id === matchProfileId) || DEMO_PROFILES[0];
  const { rules, agentLog } = orchestrator.onMatch(userProfile, match);

  /** @type {import('../types.js').Conversation} */
  const conversation = {
    id: nanoid(10),
    participants: [
      {
        id: userProfile.id || nanoid(6),
        name: userProfile.name || 'You',
        avatar: userProfile.avatar || '💫',
        bio: userProfile.bio || '',
        spark: 0,
      },
      {
        id: match.id,
        name: match.name,
        avatar: match.avatar,
        bio: match.bio,
        spark: 0,
      },
    ],
    rules,
    messages: [],
    level: 1,
    unlockedFeatures: [],
    status: 'active',
    agentLog: agentLog.slice(),
  };

  conversations.set(conversation.id, conversation);
  return sanitizeConversation(conversation, conversation.participants[0].id);
}

export function joinConversation(conversationId, participantId) {
  const conv = conversations.get(conversationId);
  if (!conv) return null;
  return sanitizeConversation(conv, participantId);
}

export function bindSocket(socketId, participantId) {
  socketParticipants.set(socketId, participantId);
}

export function getParticipantId(socketId) {
  return socketParticipants.get(socketId);
}

export function sendMessage(conversationId, senderId, text) {
  const conv = conversations.get(conversationId);
  if (!conv || conv.status !== 'active') return { error: 'Conversation not found' };

  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty message' };

  const pipeline = orchestrator.onMessage(conv.rules, trimmed, senderId, conv.messages);
  if (pipeline.blocked) {
    return { error: pipeline.moderation.reason, moderation: pipeline.moderation };
  }

  /** @type {import('../types.js').Message} */
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
    conversation: sanitizeConversation(conv, senderId),
  };
}

export function submitGuess(conversationId, participantId, guess) {
  const conv = conversations.get(conversationId);
  if (!conv) return { error: 'Conversation not found' };

  const result = orchestrator.onGuess(conv.rules, guess, participantId, conv.messages);
  conv.agentLog.push(...result.agentLog);

  if (!result.correct) {
    return {
      correct: false,
      feedback: result.feedback,
      nearMiss: result.nearMiss,
      conversation: sanitizeConversation(conv, participantId),
    };
  }

  const rule = conv.rules.find((r) => r.id === result.ruleId);
  if (!rule || rule.revealed) {
    return { correct: false, feedback: 'Rule already revealed', conversation: sanitizeConversation(conv, participantId) };
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
    conversation: sanitizeConversation(conv, participantId),
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
    conversation: sanitizeConversation(conv, participantId),
  };
}

/** @param {import('../types.js').Conversation} conv @param {string} viewerId */
function sanitizeConversation(conv, viewerId) {
  return {
    id: conv.id,
    participants: conv.participants,
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
    viewerId,
    agentLog: conv.agentLog.slice(-8),
  };
}

export function getAgentStatus() {
  return {
    agents: [
      { name: 'RuleGeneratorAgent', role: 'Creates per-match mystery rule sets' },
      { name: 'RuleJudgeAgent', role: 'Adjudicates rule guesses with evidence' },
      { name: 'HintAgent', role: 'Non-spoiling hints when stuck' },
      { name: 'ModerationAgent', role: 'Safety layer — always wins over game rules' },
      { name: 'RuleMonitorAgent', role: 'Live violation detection & nudges' },
    ],
    activeConversations: conversations.size,
  };
}
