import { randomUUID } from "node:crypto";

import type { AgentDefinition, SubagentResult } from "./types.js";
import { AgentRegistry } from "./registry.js";
import type {  AgentExecutor,} from "./agent-executor.js";

export type SequentialFailurePolicy =
  | "stop"
  | "continue";

export type SequentialTask = {
  agentId: string;
  task: string;
};

export type SequentialExecutorOptions = {
  failurePolicy?: SequentialFailurePolicy;
  model?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
};

export type SequentialTaskResult = {
  index: number;
  agentId: string;
  task: string;
  result: SubagentResult;
};

export type SequentialExecutionResult = {
  executionId: string;

  status:
    | "succeeded"
    | "failed"
    | "cancelled";

  results: SequentialTaskResult[];

  durationMs: number;

  error?: string;
};

/**
 * Executes an explicitly defined sequence of registered agents.
 *
 * This class intentionally contains no planning or agent-selection logic.
 * The caller defines the sequence; this executor only executes it.
 */
export class SequentialExecutor {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly runner: AgentExecutor,
  ) {}

  async execute(
    tasks: readonly SequentialTask[],
    options: SequentialExecutorOptions = {},
  ): Promise<SequentialExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    const failurePolicy =
      options.failurePolicy ?? "stop";

    const results: SequentialTaskResult[] = [];

    if (tasks.length === 0) {
      return {
        executionId,
        status: "succeeded",
        results: [],
        durationMs: Date.now() - startTime,
      };
    }

    try {
      let previousOutput = "";

      for (
        let index = 0;
        index < tasks.length;
        index += 1
      ) {
        const taskDefinition = tasks[index];

        if (!taskDefinition) {
          continue;
        }

        if (options.signal?.aborted) {
          return {
            executionId,
            status: "cancelled",
            results,
            durationMs: Date.now() - startTime,
            error:
              "Sequential execution was cancelled.",
          };
        }

        const agent =
          this.registry.get(taskDefinition.agentId);

        if (!agent) {
          const error =
            `Unknown agent: ${taskDefinition.agentId}`;

          if (failurePolicy === "stop") {
            return {
              executionId,
              status: "failed",
              results,
              durationMs: Date.now() - startTime,
              error,
            };
          }

          results.push({
            index,
            agentId: taskDefinition.agentId,
            task: taskDefinition.task,
            result: {
              runId: randomUUID(),
              agentId: taskDefinition.agentId,
              status: "failed",
              output: "",
              durationMs: 0,
              toolCalls: 0,
              usage: {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
                contextTokens: 0,
                reasoningTokens: 0,
                turns: 0,
              },
              error,
            },
          });

          continue;
        }

        const effectiveTask =
          this.buildTask(
            taskDefinition.task,
            previousOutput,
          );

        const result =
          await this.runner.run(
            agent,
            effectiveTask,
            {
              model:
                options.model ??
                agent.model,
              thinkingLevel:
                options.thinkingLevel ??
                agent.thinkingLevel,
            },
            options.signal,
          );

        results.push({
          index,
          agentId: agent.id,
          task: effectiveTask,
          result,
        });

        if (
          result.status === "cancelled"
        ) {
          return {
            executionId,
            status: "cancelled",
            results,
            durationMs:
              Date.now() - startTime,
            error:
              result.error ??
              "Sequential execution was cancelled.",
          };
        }

        if (result.status === "failed") {
          if (failurePolicy === "stop") {
            return {
              executionId,
              status: "failed",
              results,
              durationMs:
                Date.now() - startTime,
              error:
                result.error ??
                `Agent failed: ${agent.id}`,
            };
          }

          /*
           * Continue policy deliberately does not pass failed
           * output to the next agent as useful context.
           */
          previousOutput = "";
          continue;
        }

        previousOutput = result.output;
      }

      const hasFailure = results.some(
        (entry) =>
          entry.result.status === "failed",
      );

      return {
        executionId,
        status: hasFailure
          ? "failed"
          : "succeeded",
        results,
        durationMs:
          Date.now() - startTime,
        ...(hasFailure
          ? {
              error:
                "One or more sequential tasks failed.",
            }
          : {}),
      };
    } catch (error) {
      return {
        executionId,
        status: "failed",
        results,
        durationMs: Date.now() - startTime,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }
  }

  /**
   * Build the task presented to an agent.
   *
   * The original task remains explicit. Previous output is appended
   * only when a previous successful agent produced output.
   */
  private buildTask(
    task: string,
    previousOutput: string,
  ): string {
    if (!previousOutput.trim()) {
      return task;
    }

    return [
      task,
      "",
      "Previous agent output:",
      previousOutput,
    ].join("\n");
  }
}
