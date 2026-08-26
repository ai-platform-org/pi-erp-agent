export type AgentPermission = {
  read: boolean;
  write: boolean;
  execute: boolean;
};

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  permissions: AgentPermission;

  tools?: string[];

  model?: string;
  thinkingLevel?: string;
};

export type SubagentUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  // Latest context size reported by the model runtime.
  // This is NOT accumulated across turns.
  contextTokens: number;
  // Reasoning/thinking tokens reported by the model runtime.
  reasoningTokens: number;
  turns: number;
};

export type SubagentResult = {
  runId: string;
  agentId: string;

  status:
    | "succeeded"
    | "failed"
    | "cancelled";

  output: string;
  durationMs: number;
  toolCalls: number;
  usage: SubagentUsage;
  model?: string;
  stopReason?: string;
  error?: string;
};

export type ExecutionCoordinator =
  | "sequential"
  | "parallel"
  | "dag"
  | "custom";

export type ExecutionStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type ExecutionNode = {
  id: string;
  agentId: string;

  /**
   * Dependency node IDs.
   *
   * Sequential coordinators populate this as a chain.
   * Parallel coordinators can leave multiple nodes independent.
   * DAG coordinators can construct arbitrary dependency graphs.
   */
  dependsOn: string[];

  runId?: string;

  status: ExecutionStatus;

  startedAt?: number;
  completedAt?: number;
  durationMs?: number;

  toolCalls?: number;

  model?: string;

  usage?: SubagentUsage;

  output?: string;
  error?: string;
};

export type ExecutionRecord = {
  executionId: string;

  coordinator: ExecutionCoordinator;

  status: ExecutionStatus;

  startedAt: number;
  completedAt?: number;
  durationMs?: number;

  nodes: ExecutionNode[];

  error?: string;
};