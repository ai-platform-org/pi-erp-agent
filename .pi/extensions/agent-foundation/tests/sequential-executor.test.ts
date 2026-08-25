import assert from "node:assert/strict";
import test from "node:test";

import type {
  AgentDefinition,
  SubagentResult,
} from "../types.js";

import { AgentRegistry } from "../registry.js";

import type {
  AgentExecutor,
} from "../agent-executor.js";

import {
  SequentialExecutor,
  type SequentialTask,
} from "../sequential-executor.js";

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

  constructor(
    private readonly responses:
      Record<string, SubagentResult>,
  ) {}

  async run(
    agent: AgentDefinition,
    task: string,
  ): Promise<SubagentResult> {
    this.calls.push({
      agentId: agent.id,
      task,
    });

    const response =
      this.responses[agent.id];

    if (!response) {
      throw new Error(
        `No fake response configured for ${agent.id}`,
      );
    }

    return response;
  }
}

function createExecutor(
  agents: AgentDefinition[],
  runner: FakeRunner,
): SequentialExecutor {
  const registry = new AgentRegistry();

  for (const agent of agents) {
    registry.register(agent);
  }

  /*
   * The production executor expects SubagentRunner.
   *
   * The test intentionally uses a structural fake because the
   * executor depends only on runner.run().
   */
  return new SequentialExecutor(
    registry,
    runner,
  );
}

test(
  "executes tasks sequentially in declared order",
  async () => {
    const explorer = createAgent(
      "explorer",
    );
    const architect = createAgent(
      "architect",
    );

    const runner = new FakeRunner({
      explorer: createResult(
        "explorer",
        "Explorer findings",
      ),
      architect: createResult(
        "architect",
        "Architecture recommendation",
      ),
    });

    const executor =
      createExecutor(
        [explorer, architect],
        runner,
      );

    const tasks: SequentialTask[] = [
      {
        agentId: "explorer",
        task: "Inspect the repository.",
      },
      {
        agentId: "architect",
        task: "Design the solution.",
      },
    ];

    const result =
      await executor.execute(tasks);

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      result.results.length,
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
  },
);

test(
  "passes successful previous output to the next agent",
  async () => {
    const explorer = createAgent(
      "explorer",
    );
    const architect = createAgent(
      "architect",
    );

    const runner = new FakeRunner({
      explorer: createResult(
        "explorer",
        "Found dependency X.",
      ),
      architect: createResult(
        "architect",
        "Use dependency X.",
      ),
    });

    const executor =
      createExecutor(
        [explorer, architect],
        runner,
      );

    await executor.execute([
      {
        agentId: "explorer",
        task: "Explore.",
      },
      {
        agentId: "architect",
        task: "Design.",
      },
    ]);

    assert.equal(
      runner.calls[1]?.task,
      [
        "Design.",
        "",
        "Previous agent output:",
        "Found dependency X.",
      ].join("\n"),
    );
  },
);

test(
  "stops after the first failure by default",
  async () => {
    const explorer = createAgent(
      "explorer",
    );
    const architect = createAgent(
      "architect",
    );
    const tester = createAgent(
      "tester",
    );

    const runner = new FakeRunner({
      explorer: createResult(
        "explorer",
        "Findings",
      ),
      architect: createResult(
        "architect",
        "",
        "failed",
      ),
      tester: createResult(
        "tester",
        "Should not run",
      ),
    });

    const executor =
      createExecutor(
        [
          explorer,
          architect,
          tester,
        ],
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "explorer",
          task: "Explore.",
        },
        {
          agentId: "architect",
          task: "Design.",
        },
        {
          agentId: "tester",
          task: "Test.",
        },
      ]);

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.results.length,
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
  },
);

test(
  "continues after failure when policy is continue",
  async () => {
    const explorer = createAgent(
      "explorer",
    );
    const architect = createAgent(
      "architect",
    );
    const tester = createAgent(
      "tester",
    );

    const runner = new FakeRunner({
      explorer: createResult(
        "explorer",
        "Findings",
      ),
      architect: createResult(
        "architect",
        "",
        "failed",
      ),
      tester: createResult(
        "tester",
        "Validation completed",
      ),
    });

    const executor =
      createExecutor(
        [
          explorer,
          architect,
          tester,
        ],
        runner,
      );

    const result =
      await executor.execute(
        [
          {
            agentId: "explorer",
            task: "Explore.",
          },
          {
            agentId: "architect",
            task: "Design.",
          },
          {
            agentId: "tester",
            task: "Test.",
          },
        ],
        {
          failurePolicy: "continue",
        },
      );

    assert.equal(
      result.status,
      "failed",
    );

    assert.equal(
      result.results.length,
      3,
    );

    assert.deepEqual(
      runner.calls.map(
        (call) => call.agentId,
      ),
      [
        "explorer",
        "architect",
        "tester",
      ],
    );

    assert.equal(
      runner.calls[2]?.task,
      "Test.",
    );
  },
);

test(
  "fails cleanly when an agent is not registered",
  async () => {
    const explorer = createAgent(
      "explorer",
    );

    const runner = new FakeRunner({
      explorer: createResult(
        "explorer",
        "Findings",
      ),
    });

    const executor =
      createExecutor(
        [explorer],
        runner,
      );

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

    assert.match(
      result.error ?? "",
      /Unknown agent: missing-agent/,
    );

    assert.equal(
      result.results.length,
      0,
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
  },
);

test(
  "accepts an AgentExecutor implementation",
  async () => {
    const agent = createAgent("test-agent");

    const runner: AgentExecutor = {
      async run(
        executedAgent,
        task,
      ) {
        assert.equal(
          executedAgent.id,
          "test-agent",
        );

        assert.equal(
          task,
          "Run test.",
        );

        return createResult(
          executedAgent.id,
          "Test completed.",
        );
      },
    };

    const executor =
      createExecutor(
        [agent],
        runner,
      );

    const result =
      await executor.execute([
        {
          agentId: "test-agent",
          task: "Run test.",
        },
      ]);

    assert.equal(
      result.status,
      "succeeded",
    );

    assert.equal(
      result.results[0]?.result.output,
      "Test completed.",
    );
  },
);