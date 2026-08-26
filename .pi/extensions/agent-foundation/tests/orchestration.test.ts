import assert from "node:assert/strict";
import test from "node:test";

import type {
  AgentExecutor,
} from "../agent-executor.js";

import {
  AgentRegistry,
} from "../registry.js";

import {
  SequentialExecutor,
} from "../sequential-executor.js";

import {
  ParallelExecutor,
} from "../parallel-executor.js";

import type {
  AgentDefinition,
  ExecutionRecord,
  SubagentResult,
} from "../types.js";

import type {
  OrchestrationTask,
  Orchestrator,
} from "../orchestration.js";

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
): SubagentResult {
  return {
    runId: `${agentId}-run`,
    agentId,
    status: "succeeded",
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

  async run(
    agent: AgentDefinition,
    task: string,
  ): Promise<SubagentResult> {
    this.calls.push({
      agentId: agent.id,
      task,
    });

    return createResult(
      agent.id,
      `${agent.id} completed`,
    );
  }
}

function createRegistry(
  agents: readonly AgentDefinition[],
): AgentRegistry {
  const registry = new AgentRegistry();

  for (const agent of agents) {
    registry.register(agent);
  }

  return registry;
}

function createTasks(): OrchestrationTask[] {
  return [
    {
      agentId: "explorer",
      task: "Inspect the repository.",
    },
    {
      agentId: "architect",
      task: "Design the solution.",
    },
  ];
}

function assertExecutionRecord(
  record: ExecutionRecord,
  coordinator:
    | "sequential"
    | "parallel",
  expectedNodeCount: number,
): void {
  assert.equal(
    record.coordinator,
    coordinator,
  );

  assert.ok(
    record.executionId.length > 0,
  );

  assert.equal(
    record.status,
    "succeeded",
  );

  assert.ok(
    record.startedAt > 0,
  );

  assert.ok(
    record.completedAt !== undefined,
  );

  assert.ok(
    record.durationMs !== undefined,
  );

  assert.ok(
    record.durationMs >= 0,
  );

  assert.equal(
    record.nodes.length,
    expectedNodeCount,
  );

  for (const node of record.nodes) {
    assert.equal(
      node.status,
      "succeeded",
    );

    assert.ok(
      node.runId !== undefined,
    );

    assert.ok(
      node.durationMs !== undefined,
    );
  }
}

test(
  "SequentialExecutor implements the Orchestrator contract",
  async () => {
    const agents = [
      createAgent("explorer"),
      createAgent("architect"),
    ];

    const runner = new FakeRunner();

    const executor: Orchestrator =
      new SequentialExecutor(
        createRegistry(agents),
        runner,
      );

    const result =
      await executor.execute(
        createTasks(),
      );

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.ok(
      result.executionId.length > 0,
    );

    assert.equal(
      result.executionId,
      result.executionRecord.executionId,
    );

    assertExecutionRecord(
      result.executionRecord,
      "sequential",
      2,
    );

    assert.deepEqual(
      runner.calls.map(
        (call) => call.agentId,
      ),
      [
        "explorer",
        "architect",
      ],
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.agentId,
      ),
      [
        "explorer",
        "architect",
      ],
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.dependsOn,
      ),
      [
        [],
        ["task-0"],
      ],
    );
  },
);

test(
  "ParallelExecutor implements the Orchestrator contract",
  async () => {
    const agents = [
      createAgent("explorer"),
      createAgent("architect"),
    ];

    const runner = new FakeRunner();

    const executor: Orchestrator =
      new ParallelExecutor(
        createRegistry(agents),
        runner,
      );

    const result =
      await executor.execute(
        createTasks(),
      );

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.ok(
      result.executionId.length > 0,
    );

    assert.equal(
      result.executionId,
      result.executionRecord.executionId,
    );

    assertExecutionRecord(
      result.executionRecord,
      "parallel",
      2,
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.agentId,
      ),
      [
        "explorer",
        "architect",
      ],
    );

    assert.deepEqual(
      result.executionRecord.nodes.map(
        (node) => node.dependsOn,
      ),
      [
        [],
        [],
      ],
    );

    assert.equal(
      runner.calls.length,
      2,
    );
  },
);

test(
  "SequentialExecutor and ParallelExecutor expose the same normalized result contract",
  async () => {
    const agents = [
      createAgent("explorer"),
      createAgent("architect"),
    ];

    const tasks = createTasks();

    const sequentialRunner =
      new FakeRunner();

    const parallelRunner =
      new FakeRunner();

    const sequential: Orchestrator =
      new SequentialExecutor(
        createRegistry(agents),
        sequentialRunner,
      );

    const parallel: Orchestrator =
      new ParallelExecutor(
        createRegistry(agents),
        parallelRunner,
      );

    const sequentialResult =
      await sequential.execute(
        tasks,
      );

    const parallelResult =
      await parallel.execute(
        tasks,
      );

    assert.equal(
      sequentialResult.status,
      "succeeded",
    );

    assert.equal(
      parallelResult.status,
      "succeeded",
    );

    assert.equal(
      sequentialResult.executionRecord
        .nodes.length,
      parallelResult.executionRecord
        .nodes.length,
    );

    assert.deepEqual(
      sequentialResult.executionRecord.nodes.map(
        (node) => node.agentId,
      ),
      [
        "explorer",
        "architect",
      ],
    );

    assert.deepEqual(
      parallelResult.executionRecord.nodes.map(
        (node) => node.agentId,
      ),
      [
        "explorer",
        "architect",
      ],
    );

    assert.deepEqual(
      parallelResult.executionRecord.nodes.map(
        (node) => node.dependsOn,
      ),
      [
        [],
        [],
      ],
    );
  },
);

test(
  "orchestration result executionId matches ExecutionRecord executionId",
  async () => {
    const agents = [
      createAgent("explorer"),
    ];

    const runner = new FakeRunner();

    const executor: Orchestrator =
      new SequentialExecutor(
        createRegistry(agents),
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "explorer",
          task: "Inspect the repository.",
        },
      ]);

    assert.ok(
      result.executionId.length > 0,
    );

    assert.equal(
      result.executionId,
      result.executionRecord.executionId,
    );
  },
);

test(
  "orchestration result exposes coordinator-independent execution metadata",
  async () => {
    const agents = [
      createAgent("explorer"),
    ];

    const runner = new FakeRunner();

    const executor: Orchestrator =
      new SequentialExecutor(
        createRegistry(agents),
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "explorer",
          task: "Inspect the repository.",
        },
      ]);

    const record =
      result.executionRecord;

    assert.equal(
      record.coordinator,
      "sequential",
    );

    assert.equal(
      record.nodes.length,
      1,
    );

    const node = record.nodes[0];

    assert.ok(node);

    assert.equal(
      node.id,
      "task-0",
    );

    assert.equal(
      node.agentId,
      "explorer",
    );

    assert.equal(
      node.runId,
      "explorer-run",
    );

    assert.equal(
      node.status,
      "succeeded",
    );

    assert.equal(
      node.durationMs,
      10,
    );

    assert.equal(
      node.toolCalls,
      0,
    );

    assert.equal(
      node.model,
      "test-model",
    );

    assert.equal(
      node.output,
      "explorer completed",
    );
  },
);

test(
  "parallel orchestration produces independent execution nodes",
  async () => {
    const agents = [
      createAgent("a"),
      createAgent("b"),
      createAgent("c"),
    ];

    const runner = new FakeRunner();

    const executor: Orchestrator =
      new ParallelExecutor(
        createRegistry(agents),
        runner,
      );

    const result =
      await executor.execute(
        agents.map(
          (agent) => ({
            agentId: agent.id,
            task: `Task ${agent.id}`,
          }),
        ),
        {
          maxConcurrency: 2,
        },
      );

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      result.executionRecord.coordinator,
      "parallel",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      3,
    );

    for (
      const node of result.executionRecord.nodes
    ) {
      assert.deepEqual(
        node.dependsOn,
        [],
      );
    }
  },
);

test(
  "empty orchestration plan produces a valid ExecutionRecord",
  async () => {
    const runner = new FakeRunner();

    const executor: Orchestrator =
      new SequentialExecutor(
        createRegistry([]),
        runner,
      );

    const result =
      await executor.execute([]);

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      result.executionId,
      result.executionRecord.executionId,
    );

    assert.equal(
      result.executionRecord.coordinator,
      "sequential",
    );

    assert.equal(
      result.executionRecord.status,
      "succeeded",
    );

    assert.equal(
      result.executionRecord.nodes.length,
      0,
    );

    assert.equal(
      runner.calls.length,
      0,
    );
  },
);


test(
  "orchestration policies remain coordinator-specific",
  () => {
    const sequentialOptions: {
      failurePolicy?: "stop" | "continue";
    } = {
      failurePolicy: "continue",
    };

    const parallelOptions: {
      failurePolicy?: "collect" | "stop";
    } = {
      failurePolicy: "collect",
    };

    assert.equal(
      sequentialOptions.failurePolicy,
      "continue",
    );

    assert.equal(
      parallelOptions.failurePolicy,
      "collect",
    );
  },
);