```
.pi/extensions/agent-foundation/


                  Pi Coding Agent
                         │
                         ▼
              Agent Foundation
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
    AgentExecutor                 Orchestrator
          │                             │
          ▼                    ┌────────┴────────┐
   SubagentRunner              ▼                 ▼
          │               Sequential         Parallel
          ▼
    Pi subprocess                └────────┬────────┘
                                          ▼
                                  ExecutionRecord
                                          │
                         ┌────────────────┴──────────────┐
                         │                               │
                    UI / telemetry                Phase 3
                                                   DAG + state
 


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