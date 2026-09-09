const BLOCKED = [
  /\b(send nudes|nude|explicit)\b/i,
  /\b(ssn|social security|credit card)\b/i,
  /\b(kill yourself|kys)\b/i,
];

const PRESSURE = [
  /\b(send me your (number|address|location) now)\b/i,
  /\b(come over tonight right now)\b/i,
];

/**
 * ModerationAgent — safety layer; rules never override this.
 */
export class ModerationAgent {
  /** @param {string} text @param {import('../types.js').Message[]} messages */
  checkMessage(text, messages = []) {
    for (const re of BLOCKED) {
      if (re.test(text)) {
        return {
          allowed: false,
          severity: 'block',
          reason: 'Message blocked for safety.',
          action: 'block',
        };
      }
    }

    for (const re of PRESSURE) {
      if (re.test(text)) {
        return {
          allowed: true,
          severity: 'warn',
          reason: 'Moving fast — make sure you both feel comfortable.',
          action: 'warn',
        };
      }
    }

    if (messages.length < 5 && /\b(whatsapp|telegram|snap|instagram|ig)\b/i.test(text)) {
      return {
        allowed: true,
        severity: 'warn',
        reason: 'Early off-platform invites can wait until you trust the vibe.',
        action: 'warn',
      };
    }

    return { allowed: true, severity: 'ok', action: 'allow' };
  }

  /** @param {import('../types.js').Rule[]} rules */
  sanitizeRules(rules) {
    return rules.filter((r) => {
      const desc = r.description.toLowerCase();
      return !desc.includes('share address') && !desc.includes('send photo');
    });
  }
}
