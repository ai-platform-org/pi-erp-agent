import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  AgentDefinition,
  SubagentResult,
} from "./types.js";

type PiInvocation = {
  command: string;
  args: string[];
};

function getPiInvocation(args: string[]): PiInvocation {
  const currentScript = process.argv[1];

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

  if (executable !== "node" && executable !== "bun") {
    return {
      command: process.execPath,
      args,
    };
  }

  return {
    command: "pi",
    args,
  };
}

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

function extractAssistantText(message: any): string {
  if (!message || message.role !== "assistant") {
    return "";
  }

  if (!Array.isArray(message.content)) {
    return "";
  }

  for (const part of message.content) {
    if (part?.type === "text" && typeof part.text === "string") {
      return part.text;
    }
  }

  return "";
}

export class SubagentRunner {
  async run(
    agent: AgentDefinition,
    task: string,
    options?: {
               model?: string;
               thinkingLevel?: string;
              },
    signal,
  ): Promise<SubagentResult> {
    const runId = randomUUID();
    const startTime = Date.now();
    const usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  totalTokens: 0,
  turns: 0,
};

let model: string | undefined;
let stopReason: string | undefined;

    let promptDirectory: string | undefined;
    let promptPath: string | undefined;

    try {

	if (signal) {
	  const terminate = () => {
	    processHandle.kill("SIGTERM");

	    setTimeout(() => {
	      if (!processHandle.killed) {
	        processHandle.kill("SIGKILL");
	      }
	    }, 5000);
	  };

	  if (signal.aborted) {
	    terminate();
	  } else {
	    signal.addEventListener(
	      "abort",
	      terminate,
	      { once: true },
	    );
	  }
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

      if (options?.model) {
        args.push("--model", options.model);
       }

     if (options?.thinkingLevel) {
        args.push("--thinking", options.thinkingLevel);
     }
     if (agent.tools && agent.tools.length > 0) {
 	 args.push(
        	"--tools",
        	agent.tools.join(","),
        	);
     }

      const invocation = getPiInvocation(args);

      const result = await new Promise<{
        output: string;
        error?: string;
        toolCalls: number;
	  usage: SubagentUsage;
          model?: string;
          stopReason?: string;
        exitCode: number;
      }>((resolve) => {
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

        const processLine = (line: string) => {
          if (!line.trim()) {
            return;
          }

          let event: any;

          try {
            event = JSON.parse(line);
          } catch {
            return;
          }

          if (
            event.type === "message_end" &&
            event.message
          ) {
            const message = event.message;

            const text = extractAssistantText(message);

            if (text) {
              finalOutput = text;
            }


    /*
     * Capture usage for this assistant turn.
     */

    /*  console.log(
   	 JSON.stringify(
     		 event.message?.usage,
      		null,
      		2,
    		),
  		);
    */
    const messageUsage = message.usage;

    if (messageUsage) {
      usage.inputTokens +=
        Number(messageUsage.input ?? 0);

      usage.outputTokens +=
        Number(messageUsage.output ?? 0);

      usage.cacheReadTokens +=
        Number(messageUsage.cacheRead ?? 0);

      usage.cacheWriteTokens +=
        Number(messageUsage.cacheWrite ?? 0);

      usage.totalTokens +=
        Number(
          messageUsage.totalTokens ??
          (
            Number(messageUsage.input ?? 0) +
            Number(messageUsage.output ?? 0)
          ),
        );

      usage.turns += 1;
    }

    /*
     * Capture model and stop reason when provided.
     */
    if (typeof message.model === "string") {
      model = message.model;
    }

    if (typeof message.stopReason === "string") {
      stopReason = message.stopReason;
    }


          }

          if (
            event.type === "tool_result_end" &&
            event.message
          ) {
            toolCalls++;
          }
        };

        processHandle.stdout.on(
          "data",
          (data: Buffer) => {
            stdoutBuffer += data.toString();

            const lines = stdoutBuffer.split("\n");

            stdoutBuffer = lines.pop() ?? "";

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
            resolve({
              output: finalOutput,
              error: error.message,
              toolCalls,
              exitCode: 1,
	        usage,
                model,
                stopReason,
            });
          },
        );

        processHandle.on(
          "close",
          (code) => {
            if (stdoutBuffer.trim()) {
              processLine(stdoutBuffer);
            }

            resolve({
              output: finalOutput,
              error:
                code === 0
                  ? undefined
                  : stderr || `Pi exited with code ${code}`,
              toolCalls,
              exitCode: code ?? 1,
                usage,
                model,
                stopReason,	      
            });
          },
        );
      });

      return {
        runId,
        agentId: agent.id,
        status:
          result.exitCode === 0
            ? "succeeded"
            : "failed",
        output: result.output,
        durationMs: Date.now() - startTime,
        toolCalls: result.toolCalls,
	  usage: result.usage,
          model: result.model,
          stopReason: result.stopReason,
        error: result.error,
      };
    } catch (error) {
      return {
        runId,
        agentId: agent.id,
        status: "failed",
        output: "",
        durationMs: Date.now() - startTime,
        toolCalls: 0,
	  usage: result.usage,
          model: result.model,
          stopReason: result.stopReason,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      };
    } finally {
      if (promptPath) {
        try {
          await fs.unlink(promptPath);
        } catch {
          // Ignore cleanup failure.
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
