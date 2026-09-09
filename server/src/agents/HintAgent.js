/**
 * HintAgent — generates non-spoiling hints when players are stuck.
 */
export class HintAgent {
  /** @param {import('../types.js').Rule[]} rules @param {import('../types.js').Message[]} messages @param {number} [tierFilter] */
  generateHint(rules, messages, tierFilter) {
    const hidden = rules.filter((r) => !r.revealed);
    if (hidden.length === 0) {
      return { hint: 'You cracked every rule — time to plan that date!', cost: 0 };
    }

    const pool = tierFilter
      ? hidden.filter((r) => r.tier === `tier${tierFilter}`)
      : hidden;

    const target = pool[0] || hidden[0];
    const tierNum = target.tier.replace('tier', '');

    const hints = [
      target.hint,
      `Focus on tier ${tierNum} behavior — something about how you write.`,
      `There are ${hidden.length} rule(s) left. This one relates to: ${this.#category(target.type)}.`,
      this.#behavioralHint(target, messages),
    ];

    return {
      hint: hints[Math.floor(Math.random() * hints.length)],
      cost: 10,
      tier: target.tier,
      agent: 'HintAgent',
    };
  }

  /** @param {string} type */
  #category(type) {
    const map = {
      max_words: 'brevity',
      require_emoji: 'expression',
      ban_word: 'vocabulary',
      no_first_person: 'perspective',
      must_end_question: 'curiosity',
      no_caps: 'formatting',
      mirror_length: 'mirroring',
      ban_topic: 'boundaries',
      no_compliment: 'restraint',
      date_quest: 'taking it offline',
    };
    return map[type] || 'conversation style';
  }

  /** @param {import('../types.js').Rule} rule @param {import('../types.js').Message[]} messages */
  #behavioralHint(rule, messages) {
    if (messages.length < 3) return 'Send a few more messages — patterns emerge quickly.';
    const last = messages[messages.length - 1];
    if (rule.type === 'max_words') {
      const wc = last.text.split(/\s+/).length;
      return wc > 10
        ? 'Shorter messages might feel safer here.'
        : 'Length seems fine — maybe another dimension?';
    }
    if (rule.type === 'require_emoji' && !/\p{Extended_Pictographic}/u.test(last.text)) {
      return 'The last message felt a bit plain — anything missing?';
    }
    return 'Watch for subtle nudges when messages feel "off".';
  }
}
