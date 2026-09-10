import { useEffect, useRef, useState } from 'react';

const TIER_LABELS = {
  tier1: 'First impressions',
  tier2: 'Finding rhythm',
  tier3: 'Going deeper',
  tier4: 'Date quest',
};

export default function ChatRoom({
  conversation,
  myParticipantId,
  onSend,
  onGuess,
  onHint,
  guessResult,
  hintResult,
  error,
  aiTyping,
}) {
  const [text, setText] = useState('');
  const [guess, setGuess] = useState('');
  const [showGuess, setShowGuess] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);

  const me = conversation?.participants?.find((p) => p.id === myParticipantId);
  const them = conversation?.participants?.find((p) => p.id !== myParticipantId && p.id !== 'pending-partner');
  const hiddenCount = (conversation?.ruleCount || 0) - (conversation?.revealedCount || 0);
  const isWaiting = conversation?.status === 'waiting';
  const isTwoPlayer = conversation?.mode === 'two_player';
  const inviteUrl = conversation?.inviteCode
    ? `${window.location.origin}/?join=${conversation.inviteCode}`
    : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length, aiTyping]);

  if (!conversation) return <div className="card">Connecting…</div>;

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || isWaiting) return;
    onSend(text);
    setText('');
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    onGuess(guess);
    setGuess('');
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const headerName = isWaiting ? 'Waiting for partner…' : them?.name || 'Match';
  const headerBio = isWaiting
    ? 'Share your invite link below'
    : them?.bio || (conversation.mode === 'solo_ai' ? 'AI match · LLM chat' : '');

  return (
    <div className="chat-room card">
      <div className="chat-header">
        <div className="match-info">
          <span className="avatar lg">{isWaiting ? '⏳' : them?.avatar}</span>
          <div>
            <h2>{headerName}</h2>
            <p>{headerBio}</p>
            {conversation.mode === 'solo_ai' && (
              <span className="mode-badge">{conversation.llmEnabled ? 'LLM chat on' : 'Template chat (add OPENAI_API_KEY)'}</span>
            )}
            {isTwoPlayer && !isWaiting && (
              <span className="mode-badge">{conversation.onlineCount || 0} online</span>
            )}
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

      {isTwoPlayer && inviteUrl && (
        <div className="invite-bar">
          <code>{inviteUrl}</code>
          <button type="button" className="btn secondary small" onClick={copyInvite}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {isWaiting && (
        <div className="waiting-banner">
          Waiting for player 2… send them the invite link above.
        </div>
      )}

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
        {!isWaiting && conversation.messages.length === 0 && (
          <div className="empty-state">
            <p>Say something — but something feels… different about this chat.</p>
            <p className="muted">{hiddenCount} mystery rules are active. Watch for nudges.</p>
          </div>
        )}
        {conversation.messages.map((m) => {
          const isMe = m.senderId === myParticipantId;
          const sender = conversation.participants.find((p) => p.id === m.senderId);
          return (
            <div key={m.id} className={`message ${isMe ? 'mine' : 'theirs'}`}>
              <div className="bubble">
                {!isMe && <span className="msg-avatar">{sender?.avatar}</span>}
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
        {aiTyping && (
          <div className="message theirs">
            <div className="bubble">
              <span className="msg-avatar">{them?.avatar}</span>
              <div className="typing-indicator">typing…</div>
            </div>
          </div>
        )}
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

      {!isWaiting && (
        <>
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
              placeholder={isWaiting ? 'Waiting for partner…' : 'Type a message…'}
              disabled={conversation.status === 'completed' || isWaiting}
            />
            <button className="btn primary" type="submit" disabled={conversation.status === 'completed' || isWaiting}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
