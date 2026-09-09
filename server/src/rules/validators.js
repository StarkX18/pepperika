const EMOJI_RE = /\p{Extended_Pictographic}/u;
const COMPLIMENT_RE =
  /\b(cute|hot|beautiful|handsome|gorgeous|attractive|sexy|pretty|amazing|perfect|love you|crush)\b/i;

/** @param {import('../types.js').Message[]} messages */
function previousMessage(messages, senderId) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderId !== senderId) return messages[i];
  }
  return null;
}

/** @param {import('../types.js').Rule} rule */
export function validateMessage(rule, text, messages, senderId) {
  if (rule.revealed) return { violated: false };

  switch (rule.type) {
    case 'max_words': {
      const max = Number(rule.params?.max ?? 15);
      const words = text.trim().split(/\s+/).filter(Boolean);
      return {
        violated: words.length > max,
        reason: `Message has ${words.length} words (max ${max})`,
      };
    }
    case 'require_emoji': {
      const min = Number(rule.params?.min ?? 1);
      const count = (text.match(new RegExp(EMOJI_RE, 'gu')) || []).length;
      return {
        violated: count < min,
        reason: 'Missing required emoji',
      };
    }
    case 'ban_word': {
      const word = String(rule.params?.word ?? '').toLowerCase();
      const re = new RegExp(`\\b${word}\\b`, 'i');
      return {
        violated: re.test(text),
        reason: `Forbidden word: ${word}`,
      };
    }
    case 'no_first_person': {
      return {
        violated: /\b(I|me|my|mine)\b/i.test(text),
        reason: 'First-person pronouns not allowed',
      };
    }
    case 'must_end_question': {
      return {
        violated: !text.trim().endsWith('?'),
        reason: 'Message must end with ?',
      };
    }
    case 'no_caps': {
      const letters = text.replace(/[^a-zA-Z]/g, '');
      return {
        violated: letters.length > 0 && letters !== letters.toLowerCase(),
        reason: 'Capital letters detected',
      };
    }
    case 'mirror_length': {
      const prev = previousMessage(messages, senderId);
      if (!prev) return { violated: false };
      const delta = Number(rule.params?.delta ?? 10);
      const diff = Math.abs(text.length - prev.text.length);
      return {
        violated: diff > delta,
        reason: `Length differs by ${diff} chars (max ${delta})`,
      };
    }
    case 'ban_topic': {
      const topic = String(rule.params?.topic ?? '').toLowerCase();
      return {
        violated: text.toLowerCase().includes(topic),
        reason: `Topic "${topic}" is off limits`,
      };
    }
    case 'no_compliment': {
      return {
        violated: COMPLIMENT_RE.test(text),
        reason: 'Compliments locked until rule is found',
      };
    }
    case 'date_quest': {
      const max = Number(rule.params?.max ?? 25);
      const hasProposal =
        /\b(coffee|drink|dinner|walk|date|meet|grab|tomorrow|tonight|saturday|sunday|monday|friday)\b/i.test(
          text
        );
      if (!hasProposal) return { violated: false };
      const words = text.trim().split(/\s+/).filter(Boolean);
      return {
        violated: words.length > max,
        reason: `Date proposal must be under ${max} words`,
        special: true,
      };
    }
    default:
      return { violated: false };
  }
}

/** @param {import('../types.js').Rule} rule */
export function guessMatchesRule(guess, rule) {
  const g = guess.toLowerCase();
  const keywords = {
    max_words: ['word', 'length', 'short', 'long', 'limit'],
    require_emoji: ['emoji', 'emoticon', 'symbol'],
    ban_word: ['word', 'forbidden', 'banned', 'hey'],
    no_first_person: ['i ', 'me', 'first person', 'pronoun'],
    must_end_question: ['question', '?'],
    no_caps: ['capital', 'uppercase', 'caps'],
    mirror_length: ['length', 'mirror', 'match', 'character'],
    ban_topic: ['topic', 'ex', 'forbidden subject'],
    no_compliment: ['compliment', 'sweet', 'flirt', 'praise'],
    date_quest: ['date', 'meet', 'coffee', 'proposal', 'offline'],
  };

  const keys = keywords[rule.type] || [];
  const typeMatch = keys.some((k) => g.includes(k));
  const descWords = rule.description.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  const descMatch = descWords.filter((w) => g.includes(w)).length >= 2;
  return typeMatch || descMatch;
}
