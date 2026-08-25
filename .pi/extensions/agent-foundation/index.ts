import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";


import { AGENTS } from "./agents.js";
import { AgentRegistry } from "./registry.js";
import { SubagentRunner } from "./runner.js";
import { SequentialExecutor } from "./sequential-executor.js";

export default function (pi: ExtensionAPI) {
  const registry = new AgentRegistry();
  const runner = new SubagentRunner();
  const sequentialExecutor = new SequentialExecutor(registry, runner);

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
        ctx.ui.notify("No agents registered.", "warning");
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

      ctx.ui.setWidget("agent-foundation", lines, {
        placement: "aboveEditor",
      });
    },
  });

  pi.registerCommand("agent", {
    description: "Show details for a registered agent",
    handler: async (args, ctx) => {
      const agentId = args?.trim();

      if (!agentId) {
        ctx.ui.notify(
          "Usage: /agent <agent-id>",
          "warning",
        );
        return;
      }

      const agent = registry.get(agentId);

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

      ctx.ui.setWidget("agent-foundation", lines, {
        placement: "aboveEditor",
      });
    },
  });

  pi.registerCommand("run-agent", {
    description: "Run a registered agent task",
    handler: async (args, ctx) => {
      const input = args?.trim();

      if (!input) {
        ctx.ui.notify(
          "Usage: /run-agent <agent-id> <task>",
          "warning",
        );
        return;
      }

      const firstSpace = input.indexOf(" ");

      if (firstSpace === -1) {
        ctx.ui.notify(
          "Usage: /run-agent <agent-id> <task>",
          "warning",
        );
        return;
      }

      const agentId = input.slice(0, firstSpace).trim();
      const task = input.slice(firstSpace + 1).trim();

      const agent = registry.get(agentId);

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
        const result = await runner.run(agent, task,
				      		{
   					        	model: ctx.model
     							 ? `${ctx.model.provider}/${ctx.model.id}`
     					 		: undefined,
   					 		thinkingLevel: ctx.thinkingLevel,
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
	    `Usage: ${result.usage}`,
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

/* This is for integrating SequentialExecutor so that /run-sequence command can run Agen A -> B -> C */
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
        const parsed = JSON.parse(input);

        if (!Array.isArray(parsed)) {
          throw new Error(
            "Sequence must be a JSON array.",
          );
        }

        tasks = parsed.map(
          (item, index) => {
            if (
              !item ||
              typeof item !== "object"
            ) {
              throw new Error(
                `Task ${index + 1} must be an object.`,
              );
            }

            if (
              typeof item.agentId !== "string" ||
              !item.agentId.trim()
            ) {
              throw new Error(
                `Task ${index + 1} requires agentId.`,
              );
            }

            if (
              typeof item.task !== "string" ||
              !item.task.trim()
            ) {
              throw new Error(
                `Task ${index + 1} requires task.`,
              );
            }

            return {
              agentId: item.agentId.trim(),
              task: item.task.trim(),
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
              failurePolicy: "stop",
            },
          );

        ctx.ui.setStatus(
          "agent-foundation",
          "",
        );

        const lines = [
          "Sequential Agent Execution",
          "",
          `Execution: ${result.executionId}`,
          `Status: ${result.status}`,
          `Duration: ${result.durationMs} ms`,
          `Agents executed: ${result.results.length}`,
          "",
          ...result.results.flatMap(
            (entry) => [
              `--- Agent ${entry.index + 1}: ${entry.agentId} ---`,
              `Run: ${entry.result.runId}`,
              `Status: ${entry.result.status}`,
              `Duration: ${entry.result.durationMs} ms`,
              `Tool calls: ${entry.result.toolCalls}`,
              `Model: ${entry.result.model ?? "unknown"}`,
              `Context tokens: ${entry.result.usage.contextTokens}`,
              "",
              entry.result.output,
              "",
            ],
          ),
        ];

        if (result.error) {
          lines.push(
            `Execution error: ${result.error}`,
          );
        }

        ctx.ui.setWidget(
          "agent-foundation-sequence-result",
          lines,
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
