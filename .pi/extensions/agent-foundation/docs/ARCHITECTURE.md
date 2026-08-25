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

       ```