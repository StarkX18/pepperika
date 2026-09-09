/** Curated rule templates — RuleGeneratorAgent picks from these (AI can extend later). */

export const RULE_TEMPLATES = [
  {
    type: 'max_words',
    tier: 'tier1',
    description: 'No message may exceed {max} words',
    hint: 'Think about message length',
    params: { max: 15 },
    sparkReward: 10,
  },
  {
    type: 'require_emoji',
    tier: 'tier1',
    description: 'Every message must include at least one emoji',
    hint: 'Express yourself visually',
    params: { min: 1 },
    sparkReward: 10,
  },
  {
    type: 'ban_word',
    tier: 'tier1',
    description: 'The word "{word}" is forbidden',
    hint: 'Watch your vocabulary — common openers might be off limits',
    params: { word: 'hey' },
    sparkReward: 12,
  },
  {
    type: 'no_first_person',
    tier: 'tier1',
    description: 'Messages cannot contain "I" or "me"',
    hint: 'Who is the subject of your sentences?',
    params: {},
    sparkReward: 15,
  },
  {
    type: 'must_end_question',
    tier: 'tier1',
    description: 'Every message must end with a question mark',
    hint: 'Curiosity is key',
    params: {},
    sparkReward: 10,
  },
  {
    type: 'no_caps',
    tier: 'tier2',
    description: 'Capital letters are not allowed',
    hint: 'Check your shift key',
    params: {},
    sparkReward: 18,
  },
  {
    type: 'mirror_length',
    tier: 'tier2',
    description: 'Each reply must be within {delta} characters of the previous message',
    hint: 'Match their energy — literally',
    params: { delta: 10 },
    sparkReward: 22,
  },
  {
    type: 'ban_topic',
    tier: 'tier3',
    description: 'Do not mention {topic}',
    hint: 'Some topics are off the table for now',
    params: { topic: 'ex' },
    sparkReward: 25,
  },
  {
    type: 'no_compliment',
    tier: 'tier3',
    description: 'Compliments are forbidden until this rule is discovered',
    hint: 'Hold back the sweet talk',
    params: {},
    sparkReward: 25,
  },
  {
    type: 'date_quest',
    tier: 'tier4',
    description: 'Propose a specific date activity in under {max} words to complete the quest',
    hint: 'Ready to take this offline?',
    params: { max: 25 },
    sparkReward: 50,
  },
];

export const FEATURE_UNLOCKS = {
  tier1: 'stickers',
  tier2: 'voice_notes',
  tier3: 'deep_dive_prompt',
  tier4: 'date_quest',
};

export const TIER_ORDER = ['tier1', 'tier2', 'tier3', 'tier4'];
