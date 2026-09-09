import { RuleGeneratorAgent } from './RuleGeneratorAgent.js';
import { RuleJudgeAgent } from './RuleJudgeAgent.js';
import { HintAgent } from './HintAgent.js';
import { ModerationAgent } from './ModerationAgent.js';
import { RuleMonitorAgent } from './RuleMonitorAgent.js';

/**
 * AgentOrchestrator — coordinates all specialized agents for each conversation event.
 */
export class AgentOrchestrator {
  constructor() {
    this.generator = new RuleGeneratorAgent();
    this.judge = new RuleJudgeAgent();
    this.hinter = new HintAgent();
    this.moderator = new ModerationAgent();
    this.monitor = new RuleMonitorAgent();
  }

  /** @param {object} profileA @param {object} profileB */
  onMatch(profileA, profileB) {
    const { rules, summary } = this.generator.generate(profileA, profileB);
    return {
      rules: this.moderator.sanitizeRules(rules),
      agentLog: [{ agent: 'RuleGeneratorAgent', message: summary }],
    };
  }

  /** @param {import('../types.js').Rule[]} rules @param {string} text @param {string} senderId @param {import('../types.js').Message[]} messages */
  onMessage(rules, text, senderId, messages) {
    const mod = this.moderator.checkMessage(text, messages);
    if (!mod.allowed) {
      return { blocked: true, moderation: mod, agentLog: [{ agent: 'ModerationAgent', message: mod.reason }] };
    }

    const analysis = this.monitor.analyze(rules, text, senderId, messages);
    const log = [{ agent: 'RuleMonitorAgent', message: `${analysis.violations.length} violation(s) detected` }];
    if (mod.action === 'warn') {
      log.push({ agent: 'ModerationAgent', message: mod.reason });
    }

    return {
      blocked: false,
      moderation: mod,
      monitor: analysis,
      agentLog: log,
    };
  }

  /** @param {import('../types.js').Rule[]} rules @param {string} guess @param {string} participantId @param {import('../types.js').Message[]} messages */
  onGuess(rules, guess, participantId, messages) {
    const result = this.judge.judge(rules, guess, participantId, messages);
    return {
      ...result,
      agentLog: [{ agent: 'RuleJudgeAgent', message: result.feedback, confidence: result.confidence }],
    };
  }

  /** @param {import('../types.js').Rule[]} rules @param {import('../types.js').Message[]} messages */
  onHintRequest(rules, messages) {
    const hint = this.hinter.generateHint(rules, messages);
    return {
      ...hint,
      agentLog: [{ agent: 'HintAgent', message: hint.hint }],
    };
  }
}

export const orchestrator = new AgentOrchestrator();
