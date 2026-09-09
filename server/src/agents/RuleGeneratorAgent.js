import { nanoid } from 'nanoid';
import { RULE_TEMPLATES, TIER_ORDER } from '../rules/templates.js';

/**
 * RuleGeneratorAgent — picks a balanced rule set per match.
 * Uses profile-aware heuristics; swap in LLM via OPENAI_API_KEY later.
 */
export class RuleGeneratorAgent {
  /** @param {{ interests?: string[], humor?: string }} [profileA] @param {{ interests?: string[], humor?: string }} [profileB] */
  generate(profileA = {}, profileB = {}) {
    const pool = [...RULE_TEMPLATES];
    const picked = [];
    const usedTypes = new Set();

    for (const tier of TIER_ORDER) {
      const tierRules = pool.filter((r) => r.tier === tier && !usedTypes.has(r.type));
      if (tierRules.length === 0) continue;

      let chosen = tierRules[Math.floor(Math.random() * tierRules.length)];

      if (tier === 'tier1' && profileA.interests?.includes('food')) {
        const emojiRule = tierRules.find((r) => r.type === 'require_emoji');
        if (emojiRule) chosen = emojiRule;
      }

      if (chosen.type === 'ban_word') {
        chosen = {
          ...chosen,
          params: { word: ['hey', 'hi', 'hello', 'sup'][Math.floor(Math.random() * 4)] },
        };
      }

      usedTypes.add(chosen.type);
      picked.push(this.#toRule(chosen));
    }

    return {
      rules: picked,
      summary: `Generated ${picked.length} mystery rules across ${TIER_ORDER.length} tiers for this match.`,
    };
  }

  /** @param {typeof RULE_TEMPLATES[0]} template */
  #toRule(template) {
    return {
      id: nanoid(8),
      description: template.description.replace(/\{(\w+)\}/g, (_, k) =>
        String(template.params?.[k] ?? '')
      ),
      hint: template.hint,
      tier: template.tier,
      type: template.type,
      params: { ...template.params },
      revealed: false,
      guessedBy: null,
      sparkReward: template.sparkReward,
    };
  }
}
