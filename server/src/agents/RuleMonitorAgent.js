import { validateMessage } from '../rules/validators.js';

/**
 * RuleMonitorAgent — watches live messages for rule violations & compliance signals.
 */
export class RuleMonitorAgent {
  /** @param {import('../types.js').Rule[]} rules @param {string} text @param {string} senderId @param {import('../types.js').Message[]} messages */
  analyze(rules, text, senderId, messages) {
    const hidden = rules.filter((r) => !r.revealed);
    const violations = [];
    const nudges = [];

    for (const rule of hidden) {
      const result = validateMessage(rule, text, messages, senderId);
      if (result.violated) {
        violations.push({
          ruleId: rule.id,
          tier: rule.tier,
          reason: result.reason,
          subtle: this.#subtleNudge(rule.type),
        });
      }
    }

    if (violations.length > 0) {
      nudges.push(violations[0].subtle);
    }

    const complianceScore = this.#complianceScore(hidden, messages, senderId);

    return {
      violations,
      nudges,
      complianceScore,
      suggestGuess: violations.length >= 2 && messages.length > 8,
    };
  }

  /** @param {import('../types.js').Rule[]} hidden @param {import('../types.js').Message[]} messages @param {string} senderId */
  #complianceScore(hidden, messages, senderId) {
    if (hidden.length === 0 || messages.length === 0) return 1;
    const userMsgs = messages.filter((m) => m.senderId === senderId).slice(-5);
    let ok = 0;
    let total = 0;
    for (const msg of userMsgs) {
      for (const rule of hidden) {
        total++;
        const r = validateMessage(rule, msg.text, messages, senderId);
        if (!r.violated) ok++;
      }
    }
    return total ? ok / total : 1;
  }

  /** @param {string} type */
  #subtleNudge(type) {
    const nudges = {
      max_words: 'That message felt a little long for this vibe 👀',
      require_emoji: 'Something missing from your message?',
      ban_word: 'Hmm — that word might not fly here',
      no_first_person: 'Try talking without making it about you',
      must_end_question: 'Curious minds want to know…?',
      no_caps: 'Easy on the caps lock energy',
      mirror_length: 'Match their message length maybe?',
      ban_topic: 'Let\'s skip that topic for now',
      no_compliment: 'Sweet talk might be locked 🔒',
      date_quest: 'Feeling ready to take this offline?',
    };
    return nudges[type] || 'Something about that message triggered a rule vibe';
  }
}
