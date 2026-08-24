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
