import type {
  ExecutionRecord,
} from "./types.js";

export function renderExecutionSummary(
  execution: ExecutionRecord,
): string[] {
  const succeeded = execution.nodes.filter(
    (node) => node.status === "succeeded",
  ).length;

  const failed = execution.nodes.filter(
    (node) => node.status === "failed",
  ).length;

  const cancelled = execution.nodes.filter(
    (node) => node.status === "cancelled",
  ).length;

  const total = execution.nodes.length;

  const statusIcon =
    execution.status === "succeeded"
      ? "✓"
      : execution.status === "failed"
        ? "✗"
        : execution.status === "cancelled"
          ? "⊘"
          : "•";

  const lines = [
    `${statusIcon} Agent Execution · ${execution.coordinator}`,
    `${execution.status} · ${succeeded}/${total} succeeded · ${execution.durationMs ?? 0} ms`,
  ];

  if (failed > 0) {
    lines.push(`✗ ${failed} failed`);
  }

  if (cancelled > 0) {
    lines.push(`⊘ ${cancelled} cancelled`);
  }

  for (const node of execution.nodes) {
    const icon =
      node.status === "succeeded"
        ? "✓"
        : node.status === "failed"
          ? "✗"
          : node.status === "cancelled"
            ? "⊘"
            : "•";

    lines.push(
      `${icon} ${node.agentId} · ${node.status}${
        node.durationMs !== undefined
          ? ` · ${node.durationMs} ms`
          : ""
      }`,
    );
  }

  lines.push(
    "Details: /execution-details",
  );

  return lines;
}
