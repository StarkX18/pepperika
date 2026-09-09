/** @typedef {'tier1' | 'tier2' | 'tier3' | 'tier4'} RuleTier */

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} description - Shown only after reveal
 * @property {string} hint - Soft hint for wrong guesses
 * @property {RuleTier} tier
 * @property {string} type - Validator key
 * @property {Record<string, unknown>} [params]
 * @property {boolean} revealed
 * @property {string|null} guessedBy
 * @property {number} sparkReward
 */

/**
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} name
 * @property {string} avatar
 * @property {string} bio
 * @property {number} spark
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} senderId
 * @property {string} text
 * @property {number} timestamp
 * @property {string[]} [violations]
 * @property {boolean} [blocked]
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {Participant[]} participants
 * @property {Rule[]} rules
 * @property {Message[]} messages
 * @property {number} level
 * @property {string[]} unlockedFeatures
 * @property {string} status - 'active' | 'completed'
 */

export {};
