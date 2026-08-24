import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Persistent event written for every important subagent lifecycle event.
 *
 * JSONL is intentionally used here:
 * - one event per line
 * - easy to append
 * - easy to stream/process later
 * - resilient to individual event parsing
 * - convenient for benchmark ingestion
 */
export type SubagentEvent = {
  timestamp: string;
  type:
    | "subagent_start"
    | "message_end"
    | "tool_result_end"
    | "subagent_complete"
    | "subagent_failed"
    | "subagent_cancelled";

  runId: string;
  agentId: string;

  // Optional parent session identifier. This will become useful
  // once we introduce nested agents and orchestration.
  parentSessionId?: string;

  // Event-specific data.
  data?: Record<string, unknown>;
};

/**
 * Writes one JSONL event per subagent execution.
 *
 * Logs are stored below the operating system's temporary directory,
 * not inside the Pi repository.
 */
export class SubagentEventLogger {
  private readonly rootDirectory: string;

  constructor() {
    this.rootDirectory = path.join(
      os.tmpdir(),
      "pi-erp-agent",
      "agent-runs",
    );
  }

  /**
   * Return the directory used for a particular execution date.
   *
   * Example on Linux/macOS:
   *   /tmp/pi-erp-agent/agent-runs/2026-08-24/
   */
  private getDateDirectory(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return path.join(
      this.rootDirectory,
      `${year}-${month}-${day}`,
    );
  }

  /**
   * Return the JSONL file associated with one subagent run.
   */
  private getRunFile(
    runId: string,
    date: Date,
  ): string {
    return path.join(
      this.getDateDirectory(date),
      `${runId}.jsonl`,
    );
  }

  /**
   * Append one event to the run's JSONL file.
   */
  async append(event: SubagentEvent): Promise<void> {
    const date = new Date(event.timestamp);
    const directory = this.getDateDirectory(date);
    const filePath = this.getRunFile(event.runId, date);

    // mkdir({ recursive: true }) makes the logger safe on the
    // first execution after the temporary directory is cleaned.
    await fs.mkdir(directory, {
      recursive: true,
      mode: 0o700,
    });

    const line =
      JSON.stringify(event) + "\n";

    // Append-only JSONL makes the execution history easy to
    // stream and process without loading the entire file.
    await fs.appendFile(
      filePath,
      line,
      {
        encoding: "utf-8",
        mode: 0o600,
      },
    );
  }

  /**
   * Convenience method for writing an event without requiring
   * callers to construct the timestamp.
   */
  async record(
    type: SubagentEvent["type"],
    runId: string,
    agentId: string,
    data?: Record<string, unknown>,
    parentSessionId?: string,
  ): Promise<void> {
    await this.append({
      timestamp: new Date().toISOString(),
      type,
      runId,
      agentId,
      parentSessionId,
      data,
    });
  }

  /**
   * Expose the root directory for diagnostics and tests.
   */
  getRootDirectory(): string {
    return this.rootDirectory;
  }
}
