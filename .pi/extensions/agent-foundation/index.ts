import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";


import { AGENTS } from "./agents.js";
import { AgentRegistry } from "./registry.js";
import { SubagentRunner } from "./runner.js";


export default function (pi: ExtensionAPI) {
  const registry = new AgentRegistry();
  const runner = new SubagentRunner();

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






}
