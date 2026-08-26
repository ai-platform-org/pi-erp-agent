import assert from "node:assert/strict";
import test from "node:test";

import type {
  AgentExecutor,
} from "../agent-executor.js";

import {
  AgentRegistry,
} from "../registry.js";

import {
  ParallelExecutor,
  type ParallelTask,
} from "../parallel-executor.js";

import type {
  AgentDefinition,
  SubagentResult,
} from "../types.js";

function createAgent(
  id: string,
): AgentDefinition {
  return {
    id,
    name: id,
    description: `Test agent ${id}`,
    systemPrompt: "Test system prompt.",
    permissions: {
      read: true,
      write: false,
      execute: false,
    },
  };
}

function createResult(
  agentId: string,
  output: string,
  status:
    | "succeeded"
    | "failed"
    | "cancelled" = "succeeded",
): SubagentResult {
  return {
    runId: `${agentId}-run`,
    agentId,
    status,
    output,
    durationMs: 10,
    toolCalls: 0,
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      contextTokens: 15,
      reasoningTokens: 0,
      turns: 1,
    },
    model: "test-model",
  };
}

class FakeRunner implements AgentExecutor {
  readonly calls: Array<{
    agentId: string;
    task: string;
  }> = [];

  private active = 0;

  maxObservedConcurrency = 0;

  constructor(
    private readonly responses:
      Record<string, SubagentResult>,
    private readonly delays:
      Record<string, number> = {},
  ) {}

  async run(
    agent: AgentDefinition,
    task: string,
  ): Promise<SubagentResult> {
    this.calls.push({
      agentId: agent.id,
      task,
    });

    this.active += 1;

    this.maxObservedConcurrency =
      Math.max(
        this.maxObservedConcurrency,
        this.active,
      );

    try {
      const delay =
        this.delays[agent.id] ?? 0;

      if (delay > 0) {
        await new Promise<void>(
          (resolve) =>
            setTimeout(
              resolve,
              delay,
            ),
        );
      }

      const response =
        this.responses[agent.id];

      if (!response) {
        throw new Error(
          `No fake response configured for ${agent.id}`,
        );
      }

      return response;
    } finally {
      this.active -= 1;
    }
  }
}

function createExecutor(
  agents: AgentDefinition[],
  runner: AgentExecutor,
): ParallelExecutor {
  const registry = new AgentRegistry();

  for (const agent of agents) {
    registry.register(agent);
  }

  return new ParallelExecutor(
    registry,
    runner,
  );
}

test(
  "executes independent tasks concurrently",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
      createAgent("c"),
    ];

    const runner = new FakeRunner(
      {
        a: createResult("a", "A"),
        b: createResult("b", "B"),
        c: createResult("c", "C"),
      },
      {
        a: 30,
        b: 30,
        c: 30,
      },
    );

    const executor =
      createExecutor(
        agents,
        runner,
      );

    const tasks: ParallelTask[] = [
      {
        agentId: "a",
        task: "Task A",
      },
      {
        agentId: "b",
        task: "Task B",
      },
      {
        agentId: "c",
        task: "Task C",
      },
    ];

    const result =
      await executor.execute(
        tasks,
        {
          maxConcurrency: 2,
        },
      );

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      runner.maxObservedConcurrency,
      2,
    );

    assert.equal(
      result.results.length,
      3,
    );

    assert.equal(
      result.executionRecord.coordinator,
      "parallel",
    );

    assert.equal(
      result.executionRecord.status,
      "succeeded",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      3,
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.agentId,
      ),
      [
        "a",
        "b",
        "c",
      ],
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.dependsOn,
      ),
      [
        [],
        [],
        [],
      ],
    );
  },
);

test(
  "never exceeds maxConcurrency",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
      createAgent("c"),
      createAgent("d"),
    ];

    const responses =
      Object.fromEntries(
        agents.map((agent) => [
          agent.id,
          createResult(
            agent.id,
            agent.id.toUpperCase(),
          ),
        ]),
      );

    const runner = new FakeRunner(
      responses,
      {
        a: 20,
        b: 20,
        c: 20,
        d: 20,
      },
    );

    const executor =
      createExecutor(
        agents,
        runner,
      );

    await executor.execute(
      agents.map((agent) => ({
        agentId: agent.id,
        task: `Task ${agent.id}`,
      })),
      {
        maxConcurrency: 2,
      },
    );

    assert.equal(
      runner.maxObservedConcurrency,
      2,
    );
  },
);

test(
  "returns results in plan order rather than completion order",
  async () => {
    const agents = [
      createAgent("slow"),
      createAgent("fast"),
    ];

    const runner = new FakeRunner(
      {
        slow: createResult(
          "slow",
          "Slow result",
        ),
        fast: createResult(
          "fast",
          "Fast result",
        ),
      },
      {
        slow: 50,
        fast: 5,
      },
    );

    const executor =
      createExecutor(
        agents,
        runner,
      );

    const result =
      await executor.execute(
        [
          {
            agentId: "slow",
            task: "Slow task",
          },
          {
            agentId: "fast",
            task: "Fast task",
          },
        ],
        {
          maxConcurrency: 2,
        },
      );

    assert.deepEqual(
      result.results.map(
        (entry) => entry.agentId,
      ),
      [
        "slow",
        "fast",
      ],
    );
  },
);

test(
  "collects independent failures by default",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
      createAgent("c"),
    ];

    const runner = new FakeRunner({
      a: createResult(
        "a",
        "Success A",
      ),
      b: createResult(
        "b",
        "",
        "failed",
      ),
      c: createResult(
        "c",
        "Success C",
      ),
    });

    const executor =
      createExecutor(
        agents,
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "a",
          task: "A",
        },
        {
          agentId: "b",
          task: "B",
        },
        {
          agentId: "c",
          task: "C",
        },
      ]);

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.results.length,
      3,
    );

    assert.deepEqual(
      result.results.map(
        (entry) =>
          entry.result.status,
      ),
      [
        "succeeded",
        "failed",
        "succeeded",
      ],
    );

    assert.equal(
      result.executionRecord.coordinator,
      "parallel",
    );

    assert.equal(
      result.executionRecord.status,
      "failed",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      3,
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.status,
      ),
      [
        "succeeded",
        "failed",
        "succeeded",
      ],
    );

    assert.equal(
      result.executionRecord.error,
      "One or more parallel tasks failed.",
    );
  },
);

test(
  "stop policy prevents new tasks after failure",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
      createAgent("c"),
      createAgent("d"),
    ];

    const runner = new FakeRunner({
      a: createResult(
        "a",
        "",
        "failed",
      ),
      b: createResult(
        "b",
        "B",
      ),
      c: createResult(
        "c",
        "C",
      ),
      d: createResult(
        "d",
        "D",
      ),
    });

    const executor =
      createExecutor(
        agents,
        runner,
      );

    const result =
      await executor.execute(
        agents.map((agent) => ({
          agentId: agent.id,
          task: agent.id,
        })),
        {
          maxConcurrency: 1,
          failurePolicy: "stop",
        },
      );

    assert.equal(
      result.status,
      "failed",
    );

    assert.deepEqual(
      runner.calls.map(
        (call) => call.agentId,
      ),
      ["a"],
    );
  },
);

test(
  "fails cleanly for an unknown agent",
  async () => {
    const runner = new FakeRunner({});

    const executor =
      createExecutor([], runner);

    const result =
      await executor.execute([
        {
          agentId: "missing-agent",
          task: "Run this.",
        },
      ]);

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.results.length,
      1,
    );

    assert.match(
      result.results[0]?.result.error ??
        "",
      /Unknown agent: missing-agent/,
    );

    assert.equal(
      result.executionRecord.coordinator,
      "parallel",
    );

    assert.equal(
      result.executionRecord.status,
      "failed",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      1,
    );

    assert.equal(
      result.executionRecord.nodes[0]?.agentId,
      "missing-agent",
    );

    assert.equal(
      result.executionRecord.nodes[0]?.status,
      "failed",
    );

    assert.match(
      result.executionRecord.nodes[0]?.error ??
        "",
      /Unknown agent: missing-agent/,
    );
  },
);

test(
  "returns successful result for an empty plan",
  async () => {
    const runner = new FakeRunner({});

    const executor =
      createExecutor([], runner);

    const result =
      await executor.execute([]);

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      result.results.length,
      0,
    );

    assert.equal(
      runner.calls.length,
      0,
    );

    assert.equal(
      result.executionRecord.coordinator,
      "parallel",
    );

    assert.equal(
      result.executionRecord.status,
      "succeeded",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      0,
    );
  },
);

test(
  "builds execution record nodes from task results",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
    ];

    const runner = new FakeRunner({
      a: createResult(
        "a",
        "Result A",
      ),
      b: createResult(
        "b",
        "Result B",
      ),
    });

    const executor =
      createExecutor(
        agents,
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "a",
          task: "Task A",
        },
        {
          agentId: "b",
          task: "Task B",
        },
      ]);

    const [
      firstNode,
      secondNode,
    ] = result.executionRecord.nodes;

    assert.equal(
      firstNode?.id,
      "task-0",
    );

    assert.equal(
      firstNode?.agentId,
      "a",
    );

    assert.equal(
      firstNode?.runId,
      "a-run",
    );

    assert.equal(
      firstNode?.status,
      "succeeded",
    );

    assert.equal(
      firstNode?.durationMs,
      10,
    );

    assert.equal(
      firstNode?.toolCalls,
      0,
    );

    assert.equal(
      firstNode?.model,
      "test-model",
    );

    assert.equal(
      firstNode?.output,
      "Result A",
    );

    assert.deepEqual(
      firstNode?.dependsOn,
      [],
    );

    assert.equal(
      secondNode?.id,
      "task-1",
    );

    assert.equal(
      secondNode?.agentId,
      "b",
    );

    assert.deepEqual(
      secondNode?.dependsOn,
      [],
    );
  },
);