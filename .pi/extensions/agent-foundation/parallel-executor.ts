import { randomUUID } from "node:crypto";

import type {
  AgentExecutor,
} from "./agent-executor.js";

import {
  AgentRegistry,
} from "./registry.js";

import type {
  Orchestrator,
  OrchestrationOptions,
  OrchestrationResult,
  OrchestrationTask,
} from "./orchestration.js";


import type {
  ExecutionNode,
  ExecutionRecord,
  SubagentResult,
} from "./types.js";

export type ParallelFailurePolicy =
  | "collect"
  | "stop";

export type ParallelTask = OrchestrationTask;

export type ParallelExecutorOptions = {
  /**
   * Maximum number of agents allowed to execute concurrently.
   *
   * Default: 2
   */
  maxConcurrency?: number;

  /**
   * "collect":
   *   Continue scheduling independent tasks after failures.
   *
   * "stop":
   *   Stop scheduling new tasks after the first failure.
   *   Already-running tasks are allowed to finish.
   *
   * Default: "collect"
   */
  failurePolicy?: ParallelFailurePolicy;

  model?: string;
  thinkingLevel?: string;
  signal?: AbortSignal;
};

export type ParallelTaskResult = {
  index: number;
  agentId: string;
  task: string;
  result: SubagentResult;
};

export type ParallelExecutionResult = {
  executionId: string;

  status:
    | "succeeded"
    | "failed"
    | "cancelled";

  results: ParallelTaskResult[];

  durationMs: number;

  error?: string;

  /**
   * Coordinator-independent execution representation.
   *
   * Consumers that need visualization, telemetry,
   * persistence, or reporting should prefer this record.
   */
  executionRecord: ExecutionRecord;
};

/**
 * Executes independent registered agents concurrently.
 *
 * The executor is intentionally non-intelligent:
 * the caller supplies the complete execution plan.
 *
 * This class controls concurrency and result aggregation only.
 */
export class ParallelExecutor implements Orchestrator{
  constructor(
    private readonly registry: AgentRegistry,
    private readonly runner: AgentExecutor,
  ) {}

  async execute(
    tasks: readonly ParallelTask[],
    options: ParallelExecutorOptions = {},
  ): Promise<ParallelExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    const maxConcurrency =
      this.normalizeConcurrency(
        options.maxConcurrency,
      );

    const failurePolicy =
      options.failurePolicy ?? "collect";

    if (tasks.length === 0) {
      const durationMs =
        Date.now() - startTime;

      return {
        executionId,
        status: "succeeded",
        results: [],
        durationMs,
        executionRecord:
          this.buildExecutionRecord(
            executionId,
            startTime,
            "succeeded",
            [],
          ),
      };
    }

    const results: Array<
      ParallelTaskResult | undefined
    > = new Array(tasks.length);

    let nextIndex = 0;
    let schedulingStopped = false;
    let cancellationObserved =
      options.signal?.aborted ?? false;

    const workerCount = Math.min(
      maxConcurrency,
      tasks.length,
    );

    const worker = async (): Promise<void> => {
      while (true) {
        if (
          cancellationObserved ||
          options.signal?.aborted
        ) {
          cancellationObserved = true;
          return;
        }

        if (schedulingStopped) {
          return;
        }

        const index = nextIndex;

        if (index >= tasks.length) {
          return;
        }

        nextIndex += 1;

        const task = tasks[index];

        if (!task) {
          continue;
        }

        const agent =
          this.registry.get(task.agentId);

        if (!agent) {
          const result =
            this.createFailureResult(
              task.agentId,
              `Unknown agent: ${task.agentId}`,
            );

          results[index] = {
            index,
            agentId: task.agentId,
            task: task.task,
            result,
          };

          if (failurePolicy === "stop") {
            schedulingStopped = true;
          }

          continue;
        }

        try {
          const result =
            await this.runner.run(
              agent,
              task.task,
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

          results[index] = {
            index,
            agentId: agent.id,
            task: task.task,
            result,
          };

          if (
            result.status === "failed" &&
            failurePolicy === "stop"
          ) {
            schedulingStopped = true;
          }

          if (
            result.status === "cancelled"
          ) {
            cancellationObserved = true;
          }
        } catch (error) {
          const failure =
            this.createFailureResult(
              agent.id,
              error instanceof Error
                ? error.message
                : String(error),
            );

          results[index] = {
            index,
            agentId: agent.id,
            task: task.task,
            result: failure,
          };

          if (failurePolicy === "stop") {
            schedulingStopped = true;
          }
        }
      }
    };

    const workers = Array.from(
      { length: workerCount },
      () => worker(),
    );

    await Promise.all(workers);

    /*
     * Only actual execution results are returned.
     *
     * Tasks that were never started because of cancellation
     * or stop-on-failure are intentionally omitted.
     */
    const completedResults =
      results
        .filter(
          (
            result,
          ): result is ParallelTaskResult =>
            result !== undefined,
        )
        .sort(
          (a, b) =>
            a.index - b.index,
        );

    const hasFailure =
      completedResults.some(
        (entry) =>
          entry.result.status === "failed",
      );

    const hasCancellation =
      cancellationObserved ||
      completedResults.some(
        (entry) =>
          entry.result.status ===
          "cancelled",
      );

    const status:
      | "succeeded"
      | "failed"
      | "cancelled" =
      hasCancellation
        ? "cancelled"
        : hasFailure
          ? "failed"
          : schedulingStopped
            ? "failed"
            : "succeeded";

    const error =
      hasCancellation
        ? "Parallel execution was cancelled."
        : hasFailure
          ? "One or more parallel tasks failed."
          : schedulingStopped
            ? "Parallel scheduling stopped after a task failure."
            : undefined;

    const durationMs =
      Date.now() - startTime;

    return {
      executionId,
      status,
      results: completedResults,
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
          completedResults,
          error,
        ),
    };
  }

  /**
   * Creates a coordinator-independent execution node.
   *
   * Parallel nodes have no dependencies.
   */
  private createExecutionNode(
    result: ParallelTaskResult,
  ): ExecutionNode {
    return {
      id: `task-${result.index}`,
      agentId: result.agentId,
      dependsOn: [],
      runId: result.result.runId,
      status: result.result.status,
      durationMs:
        result.result.durationMs,
      toolCalls:
        result.result.toolCalls,
      model:
        result.result.model,
      usage:
        result.result.usage,
      output:
        result.result.output,
      ...(result.result.error
        ? {
            error:
              result.result.error,
          }
        : {}),
    };
  }

  /**
   * Builds the coordinator-independent execution record
   * consumed by UI, telemetry, persistence, and reporting.
   */
  private buildExecutionRecord(
    executionId: string,
    startTime: number,
    status:
      | "succeeded"
      | "failed"
      | "cancelled",
    results:
      readonly ParallelTaskResult[],
    error?: string,
  ): ExecutionRecord {
    const completedAt = Date.now();

    return {
      executionId,
      coordinator: "parallel",
      status,
      startedAt: startTime,
      completedAt,
      durationMs:
        completedAt - startTime,
      nodes: results.map(
        (result) =>
          this.createExecutionNode(
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

  private normalizeConcurrency(
    value: number | undefined,
  ): number {
    if (
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return 2;
    }

    return Math.max(
      1,
      Math.floor(value),
    );
  }

  private createFailureResult(
    agentId: string,
    error: string,
  ): SubagentResult {
    return {
      runId: randomUUID(),
      agentId,
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
    };
  }
}