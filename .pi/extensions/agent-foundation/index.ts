import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { AGENTS } from "./agents.js";
import { AgentRegistry } from "./registry.js";
import { SubagentRunner } from "./runner.js";
import { SequentialExecutor } from "./sequential-executor.js";
import { ParallelExecutor } from "./parallel-executor.js";
import { renderExecutionSummary } from "./execution-ui.js";

import type { ExecutionRecord } from "./types.js";

export default function (pi: ExtensionAPI) {
  const registry = new AgentRegistry();
  const runner = new SubagentRunner();

  const sequentialExecutor =
    new SequentialExecutor(
      registry,
      runner,
    );

  const parallelExecutor =
    new ParallelExecutor(
      registry,
      runner,
    );

  let lastExecution:
    | ExecutionRecord
    | undefined;

  for (const agent of AGENTS) {
    registry.register(agent);
  }

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      `Agent Foundation loaded: ${registry.list().length} agents`,
      "info",
    );
  });

  pi.registerCommand("agents", {
    description: "List registered agents",

    handler: async (_args, ctx) => {
      const agents = registry.list();

      if (agents.length === 0) {
        ctx.ui.notify(
          "No agents registered.",
          "warning",
        );
        return;
      }

      const lines = [
        "Registered agents:",
        "",
        ...agents.map(
          (agent) =>
            `${agent.id} — ${agent.name}\n  ${agent.description}`,
        ),
      ];

      ctx.ui.setWidget(
        "agent-foundation",
        lines,
        {
          placement: "aboveEditor",
        },
      );
    },
  });

  pi.registerCommand("agent", {
    description:
      "Show details for a registered agent",

    handler: async (args, ctx) => {
      const agentId = args?.trim();

      if (!agentId) {
        ctx.ui.notify(
          "Usage: /agent <agent-id>",
          "warning",
        );
        return;
      }

      const agent =
        registry.get(agentId);

      if (!agent) {
        ctx.ui.notify(
          `Unknown agent: ${agentId}`,
          "error",
        );
        return;
      }

      const lines = [
        `Agent: ${agent.id}`,
        "",
        `Name: ${agent.name}`,
        `Description: ${agent.description}`,
        "",
        "Permissions:",
        `  read:    ${agent.permissions.read ? "yes" : "no"}`,
        `  write:   ${agent.permissions.write ? "yes" : "no"}`,
        `  execute: ${agent.permissions.execute ? "yes" : "no"}`,
      ];

      ctx.ui.setWidget(
        "agent-foundation",
        lines,
        {
          placement: "aboveEditor",
        },
      );
    },
  });

  pi.registerCommand("run-agent", {
    description:
      "Run a registered agent task",

    handler: async (args, ctx) => {
      const input = args?.trim();

      if (!input) {
        ctx.ui.notify(
          "Usage: /run-agent <agent-id> <task>",
          "warning",
        );
        return;
      }

      const firstSpace =
        input.indexOf(" ");

      if (firstSpace === -1) {
        ctx.ui.notify(
          "Usage: /run-agent <agent-id> <task>",
          "warning",
        );
        return;
      }

      const agentId =
        input
          .slice(0, firstSpace)
          .trim();

      const task =
        input
          .slice(firstSpace + 1)
          .trim();

      const agent =
        registry.get(agentId);

      if (!agent) {
        ctx.ui.notify(
          `Unknown agent: ${agentId}`,
          "error",
        );
        return;
      }

      if (!task) {
        ctx.ui.notify(
          "A task is required.",
          "warning",
        );
        return;
      }

      ctx.ui.setStatus(
        "agent-foundation",
        `Running ${agent.id}...`,
      );

      try {
        const result =
          await runner.run(
            agent,
            task,
            {
              model:
                ctx.model
                  ? `${ctx.model.provider}/${ctx.model.id}`
                  : undefined,

              thinkingLevel:
                ctx.thinkingLevel,
            },
          );

        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        ctx.ui.setWidget(
          "agent-foundation-result",
          [
            `Agent: ${result.agentId}`,
            `Run: ${result.runId}`,
            `Status: ${result.status}`,
            `Duration: ${result.durationMs} ms`,
            `Tool calls: ${result.toolCalls}`,
            `Model: ${result.model}`,
            `Stop Reason: ${result.stopReason}`,
            `Usage: ${JSON.stringify(result.usage)}`,
            "",
            result.output,
          ],
          {
            placement: "aboveEditor",
          },
        );
      } catch (error) {
        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        ctx.ui.notify(
          error instanceof Error
            ? error.message
            : String(error),
          "error",
        );
      }
    },
  });

  /*
   * Execute an explicit sequential plan.
   *
   * Sequential execution passes the previous successful
   * agent output into the next task.
   */
  pi.registerCommand("run-sequence", {
    description:
      "Run an explicit sequence of registered agents",

    handler: async (args, ctx) => {
      const input = args?.trim();

      if (!input) {
        ctx.ui.notify(
          'Usage: /run-sequence [{"agentId":"explorer","task":"Inspect the repository."},...]',
          "warning",
        );
        return;
      }

      let tasks: Array<{
        agentId: string;
        task: string;
      }>;

      try {
        const parsed: unknown =
          JSON.parse(input);

        if (!Array.isArray(parsed)) {
          throw new Error(
            "Sequence must be a JSON array.",
          );
        }

        tasks = parsed.map(
          (
            item: unknown,
            index: number,
          ) => {
            if (
              !item ||
              typeof item !== "object" ||
              Array.isArray(item)
            ) {
              throw new Error(
                `Task ${index + 1} must be an object.`,
              );
            }

            const taskItem =
              item as {
                agentId?: unknown;
                task?: unknown;
              };

            if (
              typeof taskItem.agentId !==
                "string" ||
              !taskItem.agentId.trim()
            ) {
              throw new Error(
                `Task ${index + 1} requires agentId.`,
              );
            }

            if (
              typeof taskItem.task !==
                "string" ||
              !taskItem.task.trim()
            ) {
              throw new Error(
                `Task ${index + 1} requires task.`,
              );
            }

            return {
              agentId:
                taskItem.agentId.trim(),

              task:
                taskItem.task.trim(),
            };
          },
        );
      } catch (error) {
        ctx.ui.notify(
          error instanceof Error
            ? `Invalid sequence: ${error.message}`
            : `Invalid sequence: ${String(error)}`,
          "error",
        );
        return;
      }

      if (tasks.length === 0) {
        ctx.ui.notify(
          "At least one task is required.",
          "warning",
        );
        return;
      }

      ctx.ui.setStatus(
        "agent-foundation",
        `Running sequence (${tasks.length} agents)...`,
      );

      try {
        const result =
          await sequentialExecutor.execute(
            tasks,
            {
              model:
                ctx.model
                  ? `${ctx.model.provider}/${ctx.model.id}`
                  : undefined,

              thinkingLevel:
                ctx.thinkingLevel,

              failurePolicy:
                "stop",
            },
          );

        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        lastExecution =
          result.executionRecord;

        ctx.ui.setWidget(
          "agent-foundation-sequence-result",
          renderExecutionSummary(
            lastExecution,
          ),
          {
            placement: "aboveEditor",
          },
        );
      } catch (error) {
        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        ctx.ui.notify(
          error instanceof Error
            ? error.message
            : String(error),
          "error",
        );
      }
    },
  });

  /*
   * Execute independent tasks concurrently.
   *
   * Unlike /run-sequence, parallel tasks do not receive
   * previous-agent output and therefore have no dependencies.
   */
  pi.registerCommand("run-parallel", {
    description:
      "Run independent registered agent tasks in parallel",

    handler: async (args, ctx) => {
      const input = args?.trim();

      if (!input) {
        ctx.ui.notify(
          'Usage: /run-parallel [{"agentId":"explorer","task":"Inspect..."},...] or /run-parallel {"tasks":[...],"maxConcurrency":2}',
          "warning",
        );
        return;
      }
    let parsed: unknown;

    try {
      parsed = JSON.parse(input);
    } catch (error) {
      ctx.ui.notify(
        error instanceof Error
          ? `Invalid JSON: ${error.message}`
          : `Invalid JSON: ${String(error)}`,
        "error",
      );
      return;
    }

    let rawTasks: unknown;
    let requestedMaxConcurrency:
      | unknown
      | undefined;

    /*
     * Support both:
     *
     * 1. /run-parallel [ ...tasks ]
     *
     * 2. /run-parallel {
     *      "tasks": [ ... ],
     *      "maxConcurrency": 2
     *    }
     *
     * The array form is the convenient default.
     * The object form exposes execution options.
     */
    if (Array.isArray(parsed)) {
      rawTasks = parsed;
    } else if (
      parsed &&
      typeof parsed === "object"
    ) {
      const inputObject =
        parsed as {
          tasks?: unknown;
          maxConcurrency?: unknown;
        };

      rawTasks =
        inputObject.tasks;

      requestedMaxConcurrency =
        inputObject.maxConcurrency;
    } else {
      ctx.ui.notify(
        'Input must be either a JSON task array or an object containing a "tasks" array.',
        "warning",
      );
      return;
    }

    if (!Array.isArray(rawTasks)) {
      ctx.ui.notify(
        '"tasks" must be an array.',
        "warning",
      );
      return;
    }

    if (rawTasks.length === 0) {
      ctx.ui.notify(
        "At least one task is required.",
        "warning",
      );
      return;
    }

    const tasks: Array<{
      agentId: string;
      task: string;
    }> = [];

    for (
      let index = 0;
      index < rawTasks.length;
      index += 1
    ) {
      const item =
        rawTasks[index];

      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        ctx.ui.notify(
          `Task ${index + 1} must be an object.`,
          "error",
        );
        return;
      }

      const taskObject =
        item as {
          agentId?: unknown;
          task?: unknown;
        };

      if (
        typeof taskObject.agentId !==
          "string" ||
        !taskObject.agentId.trim()
      ) {
        ctx.ui.notify(
          `Task ${index + 1} requires agentId.`,
          "error",
        );
        return;
      }

      if (
        typeof taskObject.task !==
          "string" ||
        !taskObject.task.trim()
      ) {
        ctx.ui.notify(
          `Task ${index + 1} requires task.`,
          "error",
        );
        return;
      }

      tasks.push({
        agentId:
          taskObject.agentId.trim(),
        task:
          taskObject.task.trim(),
      });
    }

    let maxConcurrency:
      | number
      | undefined;

    if (
      requestedMaxConcurrency !==
      undefined
    ) {
      if (
        typeof requestedMaxConcurrency !==
          "number" ||
        !Number.isFinite(
          requestedMaxConcurrency,
        ) ||
        requestedMaxConcurrency < 1
      ) {
        ctx.ui.notify(
          '"maxConcurrency" must be a positive number.',
          "error",
        );
        return;
      }

      maxConcurrency =
        Math.floor(
          requestedMaxConcurrency,
        );
    
      }

      ctx.ui.setStatus(
        "agent-foundation",
        `Running ${tasks.length} agents in parallel...`,
      );

      try {
        const result =
          await parallelExecutor.execute(
            tasks,
            {
              maxConcurrency,

              /*
               * Parallel execution deliberately
               * collects independent failures.
               */
              failurePolicy:
                "collect",

              model:
                ctx.model
                  ? `${ctx.model.provider}/${ctx.model.id}`
                  : undefined,

              thinkingLevel:
                ctx.thinkingLevel,
            },
          );

        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        /*
         * Both sequential and parallel execution now
         * expose the same coordinator-independent record.
         */
        lastExecution =
          result.executionRecord;

        ctx.ui.setWidget(
          "agent-foundation-parallel-result",
          renderExecutionSummary(
            lastExecution,
          ),
          {
            placement: "aboveEditor",
          },
        );
      } catch (error) {
        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        ctx.ui.notify(
          error instanceof Error
            ? error.message
            : String(error),
          "error",
        );
      }
    },
  });
}