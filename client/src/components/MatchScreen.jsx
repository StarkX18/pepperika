import { useEffect, useState } from 'react';

export default function MatchScreen({ onMatch }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('You');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data);
        setSelected(data[0]?.id);
        setLoading(false);
      });
  }, []);

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
        <h3>Pick a match</h3>
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
        <button
          className="btn primary full"
          disabled={!selected}
          onClick={() =>
            onMatch({ id: 'user-' + Date.now(), name, avatar: '💫', bio: '' }, selected)
          }
        >
          Start mystery chat
        </button>
      </section>

      <section className="card agents-intro">
        <h3>5 AI agents power each conversation</h3>
        <ul>
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
