import { useEffect, useState } from 'react';

export default function JoinScreen({ inviteCode, onJoin, onBack }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`/api/room/${inviteCode}`)
      .then((r) => {
        if (!r.ok) throw new Error('Invalid or expired invite');
        return r.json();
      })
      .then(setRoom)
      .catch((e) => setError(e.message));
  }, [inviteCode]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      await onJoin(inviteCode, {
        id: 'guest-' + Date.now(),
        name: name || 'Guest',
        avatar: '🌟',
        bio: '',
      });
    } catch (err) {
      setError(err.message);
      setJoining(false);
    }
  };

  if (error && !room) {
    return (
      <div className="match-screen">
        <section className="card center">
          <h2>Can&apos;t join room</h2>
          <p className="muted">{error}</p>
          <button className="btn secondary" onClick={onBack}>Back home</button>
        </section>
      </div>
    );
  }

  if (!room) {
    return <div className="card center">Loading invite…</div>;
  }

  return (
    <div className="match-screen">
      <section className="card hero">
        <h2>Join mystery chat</h2>
        <p>
          <strong>{room.hostName}</strong> invited you to solve hidden rules together.
        </p>
        <p className="invite-badge">Code: {inviteCode}</p>
      </section>

      <section className="card">
        <form onSubmit={handleJoin}>
          <label className="label">Your display name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should they call you?"
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn primary full" type="submit" disabled={joining || room.status === 'completed'}>
            {joining ? 'Joining…' : room.playerCount >= 2 ? 'Room full' : 'Join game'}
          </button>
        </form>
      </section>
    </div>
  );
}
