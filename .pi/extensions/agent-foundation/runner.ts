import { randomUUID } from "node:crypto";

import type {
  AgentDefinition,
  SubagentResult,
} from "./types.js";

export class SubagentRunner {
  async run(
    agent: AgentDefinition,
    task: string,
  ): Promise<SubagentResult> {
    const runId = randomUUID();
    const startTime = Date.now();

    try {
      return {
        runId,
        agentId: agent.id,
        status: "succeeded",
        output: [
          `Subagent: ${agent.name}`,
          "",
          `Task: ${task}`,
          "",
          "Runner execution is not connected yet.",
        ].join("\n"),
        durationMs: Date.now() - startTime,
        toolCalls: 0,
      };
    } catch (error) {
      return {
        runId,
        agentId: agent.id,
        status: "failed",
        output: "",
        durationMs: Date.now() - startTime,
        toolCalls: 0,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }
}
