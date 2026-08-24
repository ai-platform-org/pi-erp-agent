import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { AGENTS } from "./agents.js";
import { AgentRegistry } from "./registry.js";

export default function (pi: ExtensionAPI) {
  const registry = new AgentRegistry();

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
}
