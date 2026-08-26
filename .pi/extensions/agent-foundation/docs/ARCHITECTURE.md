```
.pi/extensions/agent-foundation/
├── agent-executor.ts              ← NEW
├── agents.ts
├── event-log.ts
├── index.ts                       ← unchanged
├── registry.ts
├── runner.ts                      ← implements AgentExecutor
├── sequential-executor.ts         ← depends on interface
├── types.ts
└── tests/
    └── sequential-executor.test.ts
 


                    Orchestrator
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
     SequentialExecutor      ParallelExecutor
              │                     │
              │                     │
              └──────────┬──────────┘
                         ▼
                  AgentExecutor
                         │
                         ▼
                  SubagentRunner
                         │
                         ▼
                    child Pi


Both produce
      │
      ▼
ExecutionRecord
      │
      ├── executionId
      ├── coordinator
      ├── status
      ├── timing
      └── nodes[]
             │
             ├── agentId
             ├── runId
             ├── status
             ├── dependsOn
             ├── usage
             └── output

 AgentExecutor
    = HOW do I execute one agent?

Orchestration
    = WHICH tasks execute, in what relationship,
      with what concurrency/failure/cancellation policy?

```




### 4. Best single test prompt

If you want to test the feature with a realistic task, use:

```
/run-sequence [{"agentId":"explorer","task":"Inspect the repository architecture and identify the major components."},{"agentId":"architect","task":"Based on the previous agent's findings, propose an architecture improvement."}]
```

Then compare with:

```
/run-parallel {"tasks":[{"agentId":"explorer","task":"Inspect the repository architecture and identify the major components."},{"agentId":"architect","task":"Independently analyze the repository architecture and propose an improvement."}],"maxConcurrency":2}
```

The **sequence should propagate the explorer's output into the architect task**; the parallel execution should not.


### 3. What you should observe

For `/run-sequence`:

```
Execution
  coordinator: sequential

task-0
  explorer
  dependsOn: []

task-1
  architect
  dependsOn: ["task-0"]
```

For `/run-parallel`:

```
Execution
  coordinator: parallel

task-0
  explorer
  dependsOn: []

task-1
  architect
  dependsOn: []
```