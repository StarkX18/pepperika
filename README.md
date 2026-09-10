# Spark — Mystery Rules Dating Chat

A dating chat prototype where **every match has hidden conversation rules**. Two people discover them together, earn Spark rewards, and unlock deeper features — powered by **five specialized AI agents**.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                     │
├─────────────┬─────────────┬──────────┬─────────┬────────┤
│ RuleGenerator│ RuleMonitor │ RuleJudge│  Hint   │Moderation│
│   Agent      │   Agent     │  Agent   │ Agent   │  Agent   │
└─────────────┴─────────────┴──────────┴─────────┴────────┘
                              │
                    ConversationManager
                              │
                     Socket.io + Express
                              │
                        React Client
```

## Play modes

| Mode | Description |
|------|-------------|
| **AI Match** | Chat with an LLM-powered dating match (`ChatPartnerAgent`) |
| **2 Player** | Create a room, share the invite link, solve rules together |

## LLM setup (optional)

Set these env vars on the server for real LLM chat:

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini          # optional
export OPENAI_BASE_URL=https://api.openai.com/v1  # optional, for compatible APIs
```

Without a key, AI matches use smart template fallbacks.

## 2-player flow

1. Choose **2 Player** on the home screen → **Create 2-player room**
2. Copy the invite link (e.g. `http://localhost:5173/?join=ABC123`)
3. Friend opens the link, enters their name, joins
4. Both players chat in real time and guess rules together

## Agents

| Agent | Role |
|-------|------|
| **ChatPartnerAgent** | LLM dating match replies (solo mode) |
| **RuleGeneratorAgent** | Creates per-match rule sets |
| **RuleMonitorAgent** | Violation detection & nudges |
| **RuleJudgeAgent** | Adjudicates rule guesses |
| **HintAgent** | Non-spoiling hints |
| **ModerationAgent** | Safety layer |

## Quick start

```bash
npm install
npm run dev
```

- **Client:** http://localhost:5173
- **Server:** http://localhost:3001

## How to play

1. Pick a match and start a mystery chat
2. Send messages — watch for nudges when rules are violated
3. **Guess a rule** when you think you've figured one out
4. Earn **Spark** and unlock features (stickers → voice notes → deep dive → date quest)
5. Watch the **Agent panel** for live orchestration logs

## Example guesses

- "messages must include an emoji"
- "no capital letters"
- "messages must end with a question"
- "compliments are forbidden"

## API

- `GET /api/profiles` — demo match profiles
- `GET /api/agents` — agent roster & status
- `POST /api/match` — create conversation with generated rules

WebSocket events: `join`, `message`, `guess`, `hint`

## Extending with LLMs

Agents use heuristic/template logic by default. To plug in OpenAI:

1. Set `OPENAI_API_KEY`
2. Extend agents in `server/src/agents/` to call your LLM for generation, judging, and hints

## Project structure

```
server/src/agents/     # Five agent classes + orchestrator
server/src/rules/      # Rule templates & validators
server/src/ConversationManager.js
client/src/components/ # MatchScreen, ChatRoom, AgentPanel
```
