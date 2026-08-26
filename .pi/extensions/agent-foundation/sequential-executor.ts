import { randomUUID } from "node:crypto";

import type { AgentDefinition, ExecutionNode, ExecutionRecord,SubagentResult } from "./types.js";
import { AgentRegistry } from "./registry.js";
import type {  AgentExecutor,} from "./agent-executor.js";
import type {
  Orchestrator,
  OrchestrationOptions,
  OrchestrationResult,
  OrchestrationTask,
} from "./orchestration.js";

export type SequentialFailurePolicy =
  | "stop"
  | "continue";

export type SequentialTask = OrchestrationTask;

export type SequentialExecutorOptions = OrchestrationOptions;

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

   /**
   * Coordinator-independent execution representation.
   *
   * Consumers that need execution visualization, telemetry,
   * persistence, or reporting should prefer this record rather
   * than depending on sequential-specific result structures.
   */
  executionRecord: ExecutionRecord;
};



/**
 * Executes an explicitly defined sequence of registered agents.
 *
 * This class intentionally contains no planning or agent-selection logic.
 * The caller defines the sequence; this executor only executes it.
 */
export class SequentialExecutor implements Orchestrator {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly runner: AgentExecutor,
  ) {}

private createExecutionNode(
  index: number,
  task: SequentialTaskResult,
): ExecutionNode {
  return {
    id: `task-${index}`,
    agentId: task.agentId,
    dependsOn:
      index > 0
        ? [`task-${index - 1}`]
        : [],
    runId: task.result.runId,
    status: task.result.status,
    durationMs:
      task.result.durationMs,
    toolCalls:
      task.result.toolCalls,
    model:
      task.result.model,
    usage:
      task.result.usage,
    output:
      task.result.output,
    ...(task.result.error
      ? {
          error: task.result.error,
        }
      : {}),
  };
}

private buildExecutionRecord(
  executionId: string,
  startTime: number,
  status: ExecutionRecord["status"],
  results: readonly SequentialTaskResult[],
  error?: string,
): ExecutionRecord {
  const completedAt = Date.now();

  return {
    executionId,
    coordinator: "sequential",
    status,
    startedAt: startTime,
    completedAt,
    durationMs:
      completedAt - startTime,
    nodes: results.map(
      (result, index) =>
        this.createExecutionNode(
          index,
          result,
        ),
    ),
    ...(error
      ? {
          error,
        }
      : {}),
  };
}
  

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
        executionRecord:
      this.buildExecutionRecord(
        executionId,
        startTime,
        "succeeded",
        [],
      ),
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

          const error =  "Sequential execution was cancelled.";

          const durationMs =  Date.now() - startTime;

          return {
            executionId,
            status: "cancelled",
            results,
            durationMs,
            error,
            executionRecord:this.buildExecutionRecord(
                              executionId,
                              startTime,
                              "cancelled",
                              results,
                              error,
                            ),
          };
        }

        const agent =
          this.registry.get(taskDefinition.agentId);

        if (!agent) {
          const error =
            `Unknown agent: ${taskDefinition.agentId}`;

          if (failurePolicy === "stop") {

          const durationMs =  Date.now() - startTime;

            return {
              executionId,
              status: "failed",
              results,
              durationMs: Date.now() - startTime,
              error,
              executionRecord:this.buildExecutionRecord(
                              executionId,
                              startTime,
                              "failed",
                              results,
                              error,
                            ),
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
          const error =
  "Sequential execution was cancelled.";

const durationMs =
  Date.now() - startTime;

          return {
            executionId,
            status: "cancelled",
            results,
            durationMs,
            error,
               executionRecord:
                              this.buildExecutionRecord(
                                executionId,
                                startTime,
                                "cancelled",
                                results,
                                error,
                              ),
          };
        }

        if (result.status === "failed") {
          if (failurePolicy === "stop") {
            const error =
  result.error ??
  `Agent failed: ${agent.id}`;

const durationMs =
  Date.now() - startTime;

            return {
              executionId,
              status: "failed",
              results,
              durationMs,
              error,
                executionRecord:
    this.buildExecutionRecord(
      executionId,
      startTime,
      "failed",
      results,
      error,
    ),
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

      const status = hasFailure
  ? "failed"
  : "succeeded";

const error = hasFailure
  ? "One or more sequential tasks failed."
  : undefined;

const durationMs =
  Date.now() - startTime;


    return {
  executionId,
  status,
  results,
  durationMs,
  ...(error
    ? {
        error,
      }
    : {}),
  executionRecord:
    this.buildExecutionRecord(
      executionId,
      startTime,
      status,
      results,
      error,
    ),
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
  executionRecord:
    this.buildExecutionRecord(
      executionId,
      startTime,
      "failed",
      results,
      error instanceof Error
            ? error.message
            : String(error),
    ),
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
