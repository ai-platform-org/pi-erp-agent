import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  AgentDefinition,
  SubagentResult,
  SubagentUsage,
} from "./types.js";

import type {
  AgentExecutor,
  AgentRunOptions,
} from "./agent-executor.js";

import { SubagentEventLogger } from "./event-log.js";

type PiInvocation = {
  command: string;
  args: string[];
};


type ChildResult = {
  output: string;
  error?: string;
  toolCalls: number;
  usage: SubagentUsage;
  model?: string;
  stopReason?: string;
  exitCode: number;
  cancelled: boolean;
};

/**
 * Resolve the Pi executable in a way that works both when running Pi
 * directly from source and when the installed `pi` executable is used.
 */
function getPiInvocation(args: string[]): PiInvocation {
  const currentScript = process.argv[1];

  // When Pi is launched from a normal Node/Bun script, execute that
  // script directly so the child uses the same source checkout.
  if (
    currentScript &&
    !currentScript.startsWith("/$bunfs/root/") &&
    existsSync(currentScript)
  ) {
    return {
      command: process.execPath,
      args: [currentScript, ...args],
    };
  }

  const executable = path.basename(process.execPath).toLowerCase();

  // When running under a non-Node/Bun runtime, preserve the existing
  // executable behavior used by the source-based Pi launcher.
  if (executable !== "node" && executable !== "bun") {
    return {
      command: process.execPath,
      args,
    };
  }

  // Fall back to the installed Pi command.
  return {
    command: "pi",
    args,
  };
}

/**
 * Write the agent's system prompt to a private temporary file.
 *
 * The child Pi process consumes this file through --append-system-prompt.
 */
async function writeSystemPrompt(
  agent: AgentDefinition,
): Promise<{
  directory: string;
  filePath: string;
}> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "pi-erp-subagent-"),
  );

  const safeName = agent.id.replace(/[^\w.-]+/g, "_");

  const filePath = path.join(
    directory,
    `system-prompt-${safeName}.md`,
  );

  await fs.writeFile(
    filePath,
    agent.systemPrompt,
    {
      encoding: "utf-8",
      mode: 0o600,
    },
  );

  return {
    directory,
    filePath,
  };
}

/**
 * Extract assistant text from a Pi JSON-mode message.
 *
 * Pi messages may contain multiple content parts. We concatenate all
 * text parts so the parent receives the complete textual response.
 */
function extractAssistantText(message: any): string {
  if (!message || message.role !== "assistant") {
    return "";
  }

  if (!Array.isArray(message.content)) {
    return "";
  }

  return message.content
    .filter(
      (part: any) =>
        part?.type === "text" &&
        typeof part.text === "string",
    )
    .map((part: any) => part.text)
    .join("");
}

/**
 * Return a fresh usage accumulator for each subagent run.
 */
function createEmptyUsage(): SubagentUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
     // Updated on every assistant message_end event.
    // Unlike the other counters, this represents the latest
    // reported context size rather than a cumulative value.
    contextTokens: 0,
    reasoningTokens: 0,
    turns: 0,
  };
}

/**
 * Execute one isolated Pi subagent process.
 *
 * Phase 1 intentionally keeps process/session management inside this
 * runner. Higher-level orchestration should interact only through
 * SubagentResult.
 */
export class SubagentRunner implements AgentExecutor {
  private readonly eventLogger: SubagentEventLogger;

  constructor(
    eventLogger = new SubagentEventLogger(),
  ) {
    this.eventLogger = eventLogger;
  }

  async run(
    agent: AgentDefinition,
    task: string,
    options: AgentRunOptions = {},
    signal?: AbortSignal,
  ): Promise<SubagentResult> {
    const runId = randomUUID();
    const startTime = Date.now();

    let promptDirectory: string | undefined;
    let promptPath: string | undefined;

    // Record the run before creating the child process so even a
    // process-start failure leaves a persistent execution record.
    await this.eventLogger.record(
      "subagent_start",
      runId,
      agent.id,
      {
        task,
        model: options.model,
        thinkingLevel: options.thinkingLevel,
        tools: agent.tools ?? [],
      },
    );

    try {
      if (signal?.aborted) {
        await this.eventLogger.record(
          "subagent_cancelled",
          runId,
          agent.id,
          {
            reason: "abort_signal_before_start",
          },
        );

        return {
          runId,
          agentId: agent.id,
          status: "cancelled",
          output: "",
          durationMs: Date.now() - startTime,
          toolCalls: 0,
          usage: createEmptyUsage(),
          model: options.model,
          error: "Subagent execution was cancelled before start.",
        };
      }

      const prompt = await writeSystemPrompt(agent);

      promptDirectory = prompt.directory;
      promptPath = prompt.filePath;

      const args = [
        "--mode",
        "json",
        "-p",
        "--no-session",
        "--append-system-prompt",
        promptPath,
        `Task: ${task}`,
      ];

      if (options.model) {
        args.push("--model", options.model);
      }

      if (options.thinkingLevel) {
        args.push("--thinking", options.thinkingLevel);
      }

      if (agent.tools && agent.tools.length > 0) {
        args.push(
          "--tools",
          agent.tools.join(","),
        );
      }

      const invocation = getPiInvocation(args);

      const result = await new Promise<ChildResult>(
        (resolve) => {
          const processHandle = spawn(
            invocation.command,
            invocation.args,
            {
              cwd: process.cwd(),
              shell: false,
              stdio: [
                "ignore",
                "pipe",
                "pipe",
              ],
            },
          );

          let stdoutBuffer = "";
          let stderr = "";
          let finalOutput = "";
          let toolCalls = 0;
          let cancelled = false;

          const usage = createEmptyUsage();
          let model: string | undefined;
          let stopReason: string | undefined;

          let settled = false;
          let forceKillTimer:
            ReturnType<typeof setTimeout> | undefined;

          const cleanupAbortHandler = () => {
            if (signal) {
              signal.removeEventListener(
                "abort",
                handleAbort,
              );
            }

            if (forceKillTimer) {
              clearTimeout(forceKillTimer);
              forceKillTimer = undefined;
            }
          };

          const finish = (
            result: ChildResult,
          ) => {
            if (settled) {
              return;
            }

            settled = true;
            cleanupAbortHandler();
            resolve(result);
          };

          const handleAbort = () => {
            if (settled) {
              return;
            }

            cancelled = true;

            // Give the child process a chance to clean up first.
            processHandle.kill("SIGTERM");

            // Prevent an orphaned subagent if SIGTERM is ignored.
            forceKillTimer = setTimeout(() => {
              if (!processHandle.killed) {
                processHandle.kill("SIGKILL");
              }
            }, 5000);

            void this.eventLogger.record(
              "subagent_cancelled",
              runId,
              agent.id,
              {
                reason: "abort_signal",
              },
            );
          };

          if (signal) {
            signal.addEventListener(
              "abort",
              handleAbort,
              { once: true },
            );
          }

          /**
           * Process one JSONL event emitted by the child Pi process.
           */
          const processLine = (line: string) => {
            if (!line.trim()) {
              return;
            }

            let event: any;

            try {
              event = JSON.parse(line);
            } catch {
              // Ignore non-JSON diagnostic output. Pi JSON mode should
              // normally emit JSONL on stdout, while stderr is captured
              // separately for process-level errors.
              return;
            }

            if (
              event.type === "message_end" &&
              event.message?.role === "assistant"
            ) {
              const message = event.message;

              const text =
                extractAssistantText(message);

              if (text) {
                finalOutput = text;
              }

              // Usage is accumulated across all assistant turns.
              const messageUsage =         message.usage;

              if (messageUsage) {
                usage.inputTokens += Number(
                  messageUsage.input ?? 0,
                );

                usage.outputTokens += Number(
                  messageUsage.output ?? 0,
                );

                usage.cacheReadTokens += Number(
                  messageUsage.cacheRead ?? 0,
                );

                usage.cacheWriteTokens += Number(
                  messageUsage.cacheWrite ?? 0,
                );
                
                usage.reasoningTokens += Number(
                  messageUsage.reasoning ?? 0,
                );
                // totalTokens represents the context/token count for this
                // particular assistant turn. It must NOT be accumulated.
                // Keep the latest value as the current subagent context size.
                if (
                  typeof messageUsage.totalTokens === "number"
                ) {
                  usage.contextTokens =
                    messageUsage.totalTokens;
                }

                usage.turns += 1;
              }

              if (
                typeof message.model === "string"
              ) {
                model = message.model;
              }

              if (
                typeof message.stopReason === "string"
              ) {
                stopReason =
                  message.stopReason;
              }

              // Persist lightweight turn telemetry. We intentionally
              // do not store the complete model response here because
              // it can become very large and may contain sensitive data.
              void this.eventLogger.record(
                "message_end",
                runId,
                agent.id,
                {
                  usage:
                    message.usage ?? null,
                  model:
                    message.model ?? null,
                  stopReason:
                    message.stopReason ?? null,
                },
              );
            }

            if (
              event.type === "tool_result_end" ||
              event.type === "tool_execution_end"
            ) {
              toolCalls++;

              // Persist tool metadata rather than the complete tool
              // payload to keep the Phase 1 log compact.
              void this.eventLogger.record(
                "tool_result_end",
                runId,
                agent.id,
                {
                  toolName:
                    event.message?.toolName ??
                    event.toolName ??
                    null,
                  toolCallId:
                    event.message?.toolCallId ??
                    event.toolCallId ??
                    null,
                  isError:
                    event.message?.isError ??
                    event.isError ??
                    false,
                },
              );
            }
          };

          processHandle.stdout.on(
            "data",
            (data: Buffer) => {
              stdoutBuffer +=
                data.toString();

              const lines =
                stdoutBuffer.split("\n");

              stdoutBuffer =
                lines.pop() ?? "";

              for (const line of lines) {
                processLine(line);
              }
            },
          );

          processHandle.stderr.on(
            "data",
            (data: Buffer) => {
              stderr += data.toString();
            },
          );

          processHandle.on(
            "error",
            (error) => {
              finish({
                output: finalOutput,
                error: error.message,
                toolCalls,
                usage,
                model,
                stopReason,
                exitCode: 1,
                cancelled,
              });
            },
          );

          processHandle.on(
            "close",
            (code) => {
              // Process the final unterminated JSONL line, if present.
              if (stdoutBuffer.trim()) {
                processLine(stdoutBuffer);
              }

              finish({
                output: finalOutput,
                error:
                  cancelled
                    ? "Subagent execution was cancelled."
                    : code === 0
                      ? undefined
                      : stderr ||
                        `Pi exited with code ${code}`,
                toolCalls,
                usage,
                model,
                stopReason,
                exitCode:
                  code ?? (cancelled ? 143 : 1),
                cancelled,
              });
            },
          );
        },
      );

      const status =
        result.cancelled
          ? "cancelled"
          : result.exitCode === 0
            ? "succeeded"
            : "failed";

      const subagentResult: SubagentResult = {
        runId,
        agentId: agent.id,
        status,
        output: result.output,
        durationMs: Date.now() - startTime,
        toolCalls: result.toolCalls,
        usage: result.usage,
        model: result.model,
        stopReason: result.stopReason,
        error: result.error,
      };

      // Persist the final lifecycle event only after all child-process
      // events have been consumed and the result is known.
      await this.eventLogger.record(
        status === "succeeded"
          ? "subagent_complete"
          : status === "cancelled"
            ? "subagent_cancelled"
            : "subagent_failed",
        runId,
        agent.id,
        {
          durationMs:
            subagentResult.durationMs,
          toolCalls:
            subagentResult.toolCalls,
          usage:
            subagentResult.usage,
          model:
            subagentResult.model ?? null,
          stopReason:
            subagentResult.stopReason ?? null,
          error:
            subagentResult.error ?? null,
        },
      );

      return subagentResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      const subagentResult: SubagentResult = {
        runId,
        agentId: agent.id,
        status: "failed",
        output: "",
        durationMs: Date.now() - startTime,
        toolCalls: 0,
        usage: createEmptyUsage(),
        model: options.model,
        error: errorMessage,
      };

      // Persist failures that happen outside the child-process
      // Promise, such as prompt creation or spawn setup failures.
      await this.eventLogger.record(
        "subagent_failed",
        runId,
        agent.id,
        {
          durationMs:
            subagentResult.durationMs,
          toolCalls: 0,
          usage:
            subagentResult.usage,
          model:
            subagentResult.model ?? null,
          error: errorMessage,
        },
      );

      return subagentResult;
    } finally {
      // Always remove the temporary system-prompt file and directory.
      if (promptPath) {
        try {
          await fs.unlink(promptPath);
        } catch {
          // Ignore cleanup failure. The OS temp directory can clean
          // up abandoned files independently.
        }
      }

      if (promptDirectory) {
        try {
          await fs.rmdir(promptDirectory);
        } catch {
          // Ignore cleanup failure.
        }
      }
    }
  }
}
