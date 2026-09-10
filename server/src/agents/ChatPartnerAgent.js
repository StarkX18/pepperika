import { chatCompletion, isLlmEnabled } from '../llm/llmClient.js';
import { validateMessage } from '../rules/validators.js';

const FALLBACK_OPENERS = [
  'okay so… this chat feels like it has secret rules 😏 what do you think?',
  'hi! something tells me we are playing a game here 👀',
  'love the vibe already — feels like there are hidden rules, no?',
];

const FALLBACK_REPLIES = [
  'haha fair — this is fun though ✨',
  'interesting… keep going, I am paying attention 👀',
  'noted! dating app chess is wild 😄',
  'tell me more — something feels off about how we are texting',
];

/**
 * ChatPartnerAgent — LLM-powered dating match that chats in-character
 * and tries to respect hidden rules without knowing them explicitly.
 */
export class ChatPartnerAgent {
  /** @param {object} matchProfile @param {import('../types.js').Message[]} messages @param {import('../types.js').Rule[]} rules @param {string} partnerName */
  async generateReply(matchProfile, messages, rules, partnerName = 'you') {
    const hiddenRules = rules.filter((r) => !r.revealed);
    const recent = messages.slice(-8);

    let reply = null;
    if (isLlmEnabled()) {
      reply = await this.#llmReply(matchProfile, recent, hiddenRules, partnerName);
    }

    if (!reply) {
      reply = this.#fallbackReply(recent);
    }

    reply = await this.#makeRuleCompliant(reply, rules, messages, matchProfile.id || 'ai');

    return {
      text: reply,
      agent: 'ChatPartnerAgent',
      llm: isLlmEnabled(),
    };
  }

  /** @param {import('../types.js').Message[]} recent @param {import('../types.js').Rule[]} hiddenRules @param {string} partnerName */
  async #llmReply(matchProfile, recent, hiddenRules, partnerName) {
    const transcript = recent
      .map((m) => {
        const who = m.senderId === matchProfile.id ? matchProfile.name : partnerName;
        return `${who}: ${m.text}`;
      })
      .join('\n');

    const system = `You are ${matchProfile.name}, a person on a dating app called Spark.
Bio: ${matchProfile.bio}
Interests: ${(matchProfile.interests || []).join(', ') || 'conversation'}
Humor: ${matchProfile.humor || 'warm'}

You are in a chat with hidden mystery rules neither of you knows yet. Your job:
- Flirt lightly and be playful, like a real dating chat
- Keep replies under 20 words unless necessary
- Do NOT reveal or guess the hidden rules out loud
- React naturally to nudges and the puzzle vibe
- Use 1 emoji often
- Never be creepy, pushy, or ask for off-app contact early
- Reply with ONLY your message text, no quotes or labels`;

    const user = recent.length === 0
      ? `Start the conversation with a short opener.`
      : `Recent chat:\n${transcript}\n\nWrite ${matchProfile.name}'s next reply.`;

    return chatCompletion({ system, user, maxTokens: 80 });
  }

  /** @param {import('../types.js').Message[]} recent */
  #fallbackReply(recent) {
    if (recent.length === 0) {
      return FALLBACK_OPENERS[Math.floor(Math.random() * FALLBACK_OPENERS.length)];
    }
    return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
  }

  /** Try to adjust reply so it doesn't trip obvious hidden validators */
  async #makeRuleCompliant(text, rules, messages, senderId) {
    let candidate = text;
    for (let attempt = 0; attempt < 4; attempt++) {
      const violations = rules
        .filter((r) => !r.revealed)
        .map((r) => ({ rule: r, ...validateMessage(r, candidate, messages, senderId) }))
        .filter((v) => v.violated);

      if (violations.length === 0) return candidate;

      candidate = this.#patchForRule(candidate, violations[0].rule);
    }
    return candidate;
  }

  /** @param {import('../types.js').Rule} rule */
  #patchForRule(text, rule) {
    switch (rule.type) {
      case 'require_emoji':
        return /\p{Extended_Pictographic}/u.test(text) ? text : `${text} ✨`;
      case 'must_end_question':
        return text.trim().endsWith('?') ? text : `${text.replace(/[.!]+$/, '')}?`;
      case 'no_caps':
        return text.toLowerCase();
      case 'no_first_person':
        return text.replace(/\b(I|me|my|mine)\b/gi, 'someone');
      case 'max_words': {
        const max = Number(rule.params?.max ?? 15);
        const words = text.split(/\s+/).slice(0, max);
        return words.join(' ');
      }
      case 'ban_word': {
        const word = String(rule.params?.word ?? '');
        return text.replace(new RegExp(`\\b${word}\\b`, 'gi'), '…');
      }
      default:
        return text;
    }
  }
}

export const chatPartnerAgent = new ChatPartnerAgent();
