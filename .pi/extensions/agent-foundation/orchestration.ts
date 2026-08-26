import type {
  ExecutionRecord,
} from "./types.js";

export type OrchestrationTask = {
  agentId: string;
  task: string;
};

export type OrchestrationFailurePolicy =
  | "stop"
  | "continue"
  | "collect";

export type OrchestrationOptions = {
  /**
   * Maximum number of tasks that may execute
   * concurrently.
   *
   * Sequential implementations should treat
   * this as 1.
   */
  maxConcurrency?: number;

  /**
   * Controls behavior after task failure.
   *
   * "stop":
   *   Do not schedule further work.
   *
   * "continue":
   *   Continue with eligible work.
   *
   * "collect":
   *   Continue independent work and report failures.
   */
  failurePolicy?:
    OrchestrationFailurePolicy;

  model?: string;
  thinkingLevel?: string;

  signal?: AbortSignal;
};

export type OrchestrationResult = {
  executionId: string;

  status:
    | "succeeded"
    | "failed"
    | "cancelled";

  durationMs: number;

  error?: string;

  /**
   * Normalized representation of the
   * complete orchestration execution.
   *
   * Consumers should use this rather than
   * coordinator-specific result structures
   * when possible.
   */
  executionRecord: ExecutionRecord;
};

/**
 * Common contract implemented by higher-level
 * execution coordinators.
 *
 * This interface intentionally does not expose:
 *
 * - SubagentRunner
 * - child processes
 * - Pi runtime details
 * - AgentRegistry internals
 *
 * Those belong below the orchestration boundary.
 */
export interface Orchestrator {
  execute(
    tasks: readonly OrchestrationTask[],
    options?: OrchestrationOptions,
  ): Promise<OrchestrationResult>;
}
