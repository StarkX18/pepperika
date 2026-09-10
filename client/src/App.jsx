import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import MatchScreen from './components/MatchScreen';
import JoinScreen from './components/JoinScreen';
import ChatRoom from './components/ChatRoom';
import AgentPanel from './components/AgentPanel';
import './App.css';

const API = import.meta.env.VITE_API_URL || '';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

function getJoinCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('join')?.toUpperCase() || null;
}

export default function App() {
  const joinCode = getJoinCodeFromUrl();
  const [screen, setScreen] = useState(joinCode ? 'join' : 'match');
  const [conversation, setConversation] = useState(null);
  const [myParticipantId, setMyParticipantId] = useState(null);
  const [agents, setAgents] = useState(null);
  const [guessResult, setGuessResult] = useState(null);
  const [hintResult, setHintResult] = useState(null);
  const [error, setError] = useState(null);
  const [aiTyping, setAiTyping] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/agents`)
      .then((r) => r.json())
      .then(setAgents)
      .catch(() => {});
  }, []);

  const connectSocket = (conv, participantId) => {
    socketRef.current?.disconnect();
    const socket = io(WS_URL);
    socketRef.current = socket;
    setMyParticipantId(participantId);

    socket.on('connect', () => {
      socket.emit('join', { conversationId: conv.id, participantId });
    });

    socket.on('conversation', setConversation);
    socket.on('room_ready', setConversation);
    socket.on('guess_result', setGuessResult);
    socket.on('hint_result', setHintResult);
    socket.on('ai_typing', (e) => setAiTyping(Boolean(e.typing)));
    socket.on('error', (e) => setError(e.message));
  };

  const enterChat = (conv, participantId) => {
    setConversation(conv);
    connectSocket(conv, participantId);
    setScreen('chat');
    setGuessResult(null);
    setHintResult(null);
    setError(null);
    setAiTyping(false);
  };

  const startAiMatch = async (userProfile, matchProfileId) => {
    const res = await fetch(`${API}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile, matchProfileId }),
    });
    const conv = await res.json();
    enterChat(conv, conv.participants[0].id);
  };

  const startTwoPlayerRoom = async (userProfile) => {
    const res = await fetch(`${API}/api/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile }),
    });
    const conv = await res.json();
    enterChat(conv, conv.participants[0].id);
  };

  const joinRoom = async (code, userProfile) => {
    const res = await fetch(`${API}/api/room/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not join room');
    enterChat(data.conversation, data.conversation.participants[1].id);
    window.history.replaceState({}, '', '/');
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
    setMyParticipantId(null);
    setScreen('match');
    setGuessResult(null);
    setHintResult(null);
    setError(null);
    setAiTyping(false);
    window.history.replaceState({}, '', '/');
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
        {screen === 'match' && (
          <MatchScreen onAiMatch={startAiMatch} onTwoPlayer={startTwoPlayerRoom} />
        )}
        {screen === 'join' && (
          <JoinScreen inviteCode={joinCode} onJoin={joinRoom} onBack={() => { window.history.replaceState({}, '', '/'); setScreen('match'); }} />
        )}
        {screen === 'chat' && (
          <div className="chat-layout">
            <ChatRoom
              conversation={conversation}
              myParticipantId={myParticipantId}
              onSend={sendMessage}
              onGuess={submitGuess}
              onHint={requestHint}
              guessResult={guessResult}
              hintResult={hintResult}
              error={error}
              aiTyping={aiTyping}
            />
            <AgentPanel agents={agents} agentLog={conversation?.agentLog} llmEnabled={conversation?.llmEnabled} />
          </div>
        )}
      </main>
    </div>
  );
}
