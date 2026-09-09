const AGENT_ICONS = {
  RuleGeneratorAgent: '🎲',
  RuleJudgeAgent: '⚖️',
  HintAgent: '💡',
  ModerationAgent: '🛡️',
  RuleMonitorAgent: '👁️',
};

export default function AgentPanel({ agents, agentLog = [] }) {
  return (
    <aside className="agent-panel card">
      <h3>Agent orchestra</h3>
      <p className="muted">Five specialized agents run each conversation.</p>

      <div className="agent-list">
        {agents?.agents?.map((a) => (
          <div key={a.name} className="agent-card">
            <span className="agent-icon">{AGENT_ICONS[a.name] || '🤖'}</span>
            <div>
              <strong>{a.name.replace('Agent', '')}</strong>
              <p>{a.role}</p>
            </div>
          </div>
        ))}
      </div>

      <h4>Live agent log</h4>
      <div className="agent-log">
        {agentLog.length === 0 && <p className="muted">Agents idle — start chatting.</p>}
        {[...agentLog].reverse().map((entry, i) => (
          <div key={i} className="log-entry">
            <span>{AGENT_ICONS[entry.agent] || '🤖'}</span>
            <div>
              <strong>{entry.agent?.replace('Agent', '')}</strong>
              <p>{entry.message}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
