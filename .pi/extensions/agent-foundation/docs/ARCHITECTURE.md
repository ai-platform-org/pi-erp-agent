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
    ```

    ```
                     ┌─────────────────────┐
                 │   AgentExecutor     │
                 │      interface      │
                 └──────────┬──────────┘
                            ▲
             ┌──────────────┴──────────────┐
             │                             │
      SubagentRunner                Future executors
             ▲
             │
     ┌───────┴────────┐
     │                │
SequentialExecutor  ParallelExecutor
     │                │
     └───────┬────────┘
             ▼
       AgentRegistry




SubagentRunner
      │
      ▼
AgentExecutor             ← single-agent execution
      │
      ▼
┌─────────────────────────────────┐
│      Orchestration Contract     │
└─────────────────────────────────┘
        │                 │
        ▼                 ▼
 Sequential           Parallel
 Executor             Executor


 AgentExecutor
    = HOW do I execute one agent?

Orchestration
    = WHICH tasks execute, in what relationship,
      with what concurrency/failure/cancellation policy?

       ```