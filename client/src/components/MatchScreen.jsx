import { useEffect, useState } from 'react';

export default function MatchScreen({ onAiMatch, onTwoPlayer }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('You');
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('solo_ai');

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data);
        setSelected(data[0]?.id);
        setLoading(false);
      });
  }, []);

  const profile = { id: 'user-' + Date.now(), name, avatar: '💫', bio: '' };

  const handleStart = () => {
    if (mode === 'solo_ai') {
      onAiMatch(profile, selected);
    } else {
      onTwoPlayer(profile);
    }
  };

  if (loading) {
    return <div className="card center">Finding your next match…</div>;
  }

  return (
    <div className="match-screen">
      <section className="card hero">
        <h2>Every match is a puzzle</h2>
        <p>
          Chat with hidden rules. Discover them together. Earn Spark and unlock deeper connection —
          before the first date.
        </p>
      </section>

      <section className="card">
        <label className="label">Your display name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should they call you?"
        />
      </section>

      <section className="card">
        <h3>Play mode</h3>
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'solo_ai' ? 'active' : ''}`}
            onClick={() => setMode('solo_ai')}
          >
            <strong>AI Match</strong>
            <span>LLM-powered dating chat</span>
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'two_player' ? 'active' : ''}`}
            onClick={() => setMode('two_player')}
          >
            <strong>2 Player</strong>
            <span>Share a link with a friend</span>
          </button>
        </div>
      </section>

      {mode === 'solo_ai' && (
        <section className="card">
          <h3>Pick your AI match</h3>
          <div className="profile-grid">
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`profile-card ${selected === p.id ? 'selected' : ''}`}
                onClick={() => setSelected(p.id)}
                type="button"
              >
                <span className="avatar">{p.avatar}</span>
                <strong>{p.name}</strong>
                <span className="bio">{p.bio}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'two_player' && (
        <section className="card">
          <h3>2-player mode</h3>
          <p className="muted">
            You&apos;ll get an invite link. Send it to someone — you&apos;ll both chat and solve
            the mystery rules together in real time.
          </p>
        </section>
      )}

      <section className="card">
        <button
          className="btn primary full"
          disabled={mode === 'solo_ai' && !selected}
          onClick={handleStart}
        >
          {mode === 'solo_ai' ? 'Start AI mystery chat' : 'Create 2-player room'}
        </button>
      </section>

      <section className="card agents-intro">
        <h3>6 AI agents power each conversation</h3>
        <ul>
          <li><strong>ChatPartner</strong> — LLM replies in solo mode</li>
          <li><strong>RuleGenerator</strong> — crafts your unique rule set</li>
          <li><strong>RuleMonitor</strong> — watches messages for clues & nudges</li>
          <li><strong>RuleJudge</strong> — scores your guesses</li>
          <li><strong>Hint</strong> — helps when you&apos;re stuck</li>
          <li><strong>Moderation</strong> — keeps safety first</li>
        </ul>
      </section>
    </div>
  );
}
