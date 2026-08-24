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
};

export type SubagentStatus =
  | "succeeded"
  | "failed"
  | "cancelled";

export type SubagentResult = {
  runId: string;
  agentId: string;
  status: SubagentStatus;
  output: string;
  durationMs: number;
  toolCalls: number;
  error?: string;
};
