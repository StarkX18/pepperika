import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import MatchScreen from './components/MatchScreen';
import ChatRoom from './components/ChatRoom';
import AgentPanel from './components/AgentPanel';
import './App.css';

const API = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [screen, setScreen] = useState('match');
  const [conversation, setConversation] = useState(null);
  const [agents, setAgents] = useState(null);
  const [guessResult, setGuessResult] = useState(null);
  const [hintResult, setHintResult] = useState(null);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/agents`)
      .then((r) => r.json())
      .then(setAgents)
      .catch(() => {});
  }, []);

  const startMatch = async (userProfile, matchProfileId) => {
    const res = await fetch(`${API}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, matchProfileId }),
    });
    const conv = await res.json();
    setConversation(conv);

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', {
        conversationId: conv.id,
        participantId: conv.participants[0].id,
      });
    });

    socket.on('conversation', setConversation);
    socket.on('guess_result', setGuessResult);
    socket.on('hint_result', setHintResult);
    socket.on('error', (e) => setError(e.message));

    setScreen('chat');
    setGuessResult(null);
    setHintResult(null);
    setError(null);
  };

  const sendMessage = (text) => {
    if (!socketRef.current || !conversation) return;
    socketRef.current.emit('message', { conversationId: conversation.id, text });
    setError(null);
  };

  const submitGuess = (guess) => {
    if (!socketRef.current || !conversation) return;
    socketRef.current.emit('guess', { conversationId: conversation.id, guess });
  };

  const requestHint = () => {
    if (!socketRef.current || !conversation) return;
    socketRef.current.emit('hint', { conversationId: conversation.id });
  };

  const reset = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConversation(null);
    setScreen('match');
    setGuessResult(null);
    setHintResult(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">✨</span>
          <div>
            <h1>Spark</h1>
            <p>Mystery rules dating chat</p>
          </div>
        </div>
        {screen === 'chat' && (
          <button className="btn ghost" onClick={reset}>
            New match
          </button>
        )}
      </header>

      <main className="app-main">
        {screen === 'match' ? (
          <MatchScreen onMatch={startMatch} />
        ) : (
          <div className="chat-layout">
            <ChatRoom
              conversation={conversation}
              onSend={sendMessage}
              onGuess={submitGuess}
              onHint={requestHint}
              guessResult={guessResult}
              hintResult={hintResult}
              error={error}
            />
            <AgentPanel agents={agents} agentLog={conversation?.agentLog} />
          </div>
        )}
      </main>
    </div>
  );
}
