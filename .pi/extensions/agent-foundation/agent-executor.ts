import type {
  AgentDefinition,
  SubagentResult,
} from "./types.js";

export type AgentRunOptions = {
  model?: string;
  thinkingLevel?: string;
};

/**
 * Low-level execution contract used by orchestration strategies.
 *
 * Implementations are responsible for executing exactly one agent run.
 * Higher-level orchestration must not depend on the implementation
 * details of the underlying agent runtime.
 */
export interface AgentExecutor {
  run(
    agent: AgentDefinition,
    task: string,
    options?: AgentRunOptions,
    signal?: AbortSignal,
  ): Promise<SubagentResult>;
}
