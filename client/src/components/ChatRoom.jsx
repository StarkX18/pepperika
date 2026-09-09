import { useEffect, useRef, useState } from 'react';

const TIER_LABELS = {
  tier1: 'First impressions',
  tier2: 'Finding rhythm',
  tier3: 'Going deeper',
  tier4: 'Date quest',
};

export default function ChatRoom({
  conversation,
  onSend,
  onGuess,
  onHint,
  guessResult,
  hintResult,
  error,
}) {
  const [text, setText] = useState('');
  const [guess, setGuess] = useState('');
  const [showGuess, setShowGuess] = useState(false);
  const bottomRef = useRef(null);

  const me = conversation?.participants?.[0];
  const them = conversation?.participants?.[1];
  const hiddenCount = (conversation?.ruleCount || 0) - (conversation?.revealedCount || 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  if (!conversation) return <div className="card">Connecting…</div>;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    onGuess(guess);
    setGuess('');
  };

  return (
    <div className="chat-room card">
      <div className="chat-header">
        <div className="match-info">
          <span className="avatar lg">{them?.avatar}</span>
          <div>
            <h2>{them?.name}</h2>
            <p>{them?.bio}</p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <span className="stat-value">{conversation.revealedCount}/{conversation.ruleCount}</span>
            <span className="stat-label">Rules found</span>
          </div>
          <div className="stat spark">
            <span className="stat-value">{me?.spark ?? 0}</span>
            <span className="stat-label">Spark</span>
          </div>
          <div className="stat">
            <span className="stat-value">Lv {conversation.level}</span>
            <span className="stat-label">Chemistry</span>
          </div>
        </div>
      </div>

      {conversation.unlockedFeatures?.length > 0 && (
        <div className="unlocks">
          Unlocked: {conversation.unlockedFeatures.join(' · ')}
        </div>
      )}

      <div className="rules-bar">
        {conversation.rules.map((r) => (
          <div
            key={r.id}
            className={`rule-chip ${r.revealed ? 'revealed' : 'hidden'}`}
            title={r.revealed ? r.description : TIER_LABELS[r.tier]}
          >
            {r.revealed ? '✓' : '?'} {TIER_LABELS[r.tier]}
          </div>
        ))}
      </div>

      <div className="messages">
        {conversation.messages.length === 0 && (
          <div className="empty-state">
            <p>Say something — but something feels… different about this chat.</p>
            <p className="muted">{hiddenCount} mystery rules are active. Watch for nudges.</p>
          </div>
        )}
        {conversation.messages.map((m) => {
          const isMe = m.senderId === me?.id;
          return (
            <div key={m.id} className={`message ${isMe ? 'mine' : 'theirs'}`}>
              <div className="bubble">
                {!isMe && <span className="msg-avatar">{them?.avatar}</span>}
                <div>
                  <p>{m.text}</p>
                  {m.violations?.length > 0 && (
                    <div className="nudge">{m.violations[0]}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(guessResult || hintResult || error) && (
        <div className={`toast ${guessResult?.correct ? 'success' : guessResult ? 'info' : hintResult ? 'info' : 'error'}`}>
          {error && <p>{error}</p>}
          {guessResult && (
            <>
              <p>{guessResult.feedback}</p>
              {guessResult.reward && (
                <p className="reward">+{guessResult.reward.spark} Spark
                  {guessResult.reward.feature && ` · Unlocked ${guessResult.reward.feature}`}
                </p>
              )}
            </>
          )}
          {hintResult?.hint && !hintResult.error && <p>Hint: {hintResult.hint}</p>}
          {hintResult?.error && <p>{hintResult.error}</p>}
        </div>
      )}

      {conversation.status === 'completed' && (
        <div className="win-banner">
          You cracked every rule together. Date quest complete — chemistry verified.
        </div>
      )}

      <div className="actions-row">
        <button className="btn secondary" onClick={() => setShowGuess(!showGuess)}>
          Guess a rule ({hiddenCount} left)
        </button>
        <button className="btn secondary" onClick={onHint}>
          Get hint (10 Spark)
        </button>
      </div>

      {showGuess && (
        <form className="guess-form" onSubmit={handleGuess}>
          <input
            className="input"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder='e.g. "messages must include an emoji"'
          />
          <button className="btn primary" type="submit">Submit guess</button>
        </form>
      )}

      <form className="composer" onSubmit={handleSend}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={conversation.status === 'completed'}
        />
        <button className="btn primary" type="submit" disabled={conversation.status === 'completed'}>
          Send
        </button>
      </form>
    </div>
  );
}
