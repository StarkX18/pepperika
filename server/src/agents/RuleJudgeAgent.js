import { guessMatchesRule } from '../rules/validators.js';

/**
 * RuleJudgeAgent — adjudicates player guesses against hidden rules.
 */
export class RuleJudgeAgent {
  /** @param {import('../types.js').Rule[]} rules @param {string} guess @param {string} participantId @param {import('../types.js').Message[]} messages */
  judge(rules, guess, participantId, messages = []) {
    const hidden = rules.filter((r) => !r.revealed);
    if (hidden.length === 0) {
      return {
        correct: false,
        feedback: 'All rules have already been discovered!',
        confidence: 1,
      };
    }

    const matches = hidden.filter((r) => guessMatchesRule(guess, r));

    if (matches.length === 1) {
      const rule = matches[0];
      return {
        correct: true,
        ruleId: rule.id,
        rule,
        feedback: `Correct! Rule revealed: "${rule.description}"`,
        confidence: 0.92,
        evidence: this.#buildEvidence(rule, messages),
      };
    }

    if (matches.length > 1) {
      return {
        correct: false,
        feedback: 'Close — your guess matches multiple possibilities. Be more specific.',
        confidence: 0.5,
        nearMiss: matches.map((r) => r.tier),
      };
    }

    const semantic = this.#semanticScore(guess, hidden);
    if (semantic.best && semantic.score > 0.55) {
      return {
        correct: false,
        feedback: `Warm! You're circling something about ${semantic.best.tier.replace('tier', 'tier ')}. Try again.`,
        confidence: semantic.score,
        nearMiss: [semantic.best.tier],
      };
    }

    return {
      correct: false,
      feedback: 'Not quite — keep observing how the conversation behaves.',
      confidence: 0.15,
    };
  }

  /** @param {import('../types.js').Rule} rule @param {import('../types.js').Message[]} messages */
  #buildEvidence(rule, messages) {
    const recent = messages.slice(-6);
    return `Pattern detected across ${recent.length} recent messages for rule type "${rule.type}".`;
  }

  /** @param {string} guess @param {import('../types.js').Rule[]} hidden */
  #semanticScore(guess, hidden) {
    const g = guess.toLowerCase();
    let best = null;
    let score = 0;
    for (const rule of hidden) {
      const words = rule.hint.toLowerCase().split(/\W+/).filter(Boolean);
      const hits = words.filter((w) => g.includes(w)).length;
      const s = hits / Math.max(words.length, 1);
      if (s > score) {
        score = s;
        best = rule;
      }
    }
    return { best, score };
  }
}
