# Architecture

## Purpose

This document describes the evolving architecture of `pi-erp-agent`.

`ROADMAP.md` defines what is built in each phase. This document describes the architectural boundaries that should remain coherent as the repository evolves.

## Long-Term Architecture

The intended evolution is:

```text
Pi Coding Agent
       |
       v
Agent Foundation
       |
       +--> Agent Definitions / Registry
       |
       +--> Individual Agent Execution
       |        |
       |        v
       |    AgentExecutor
       |        |
       |        v
       |    SubagentRunner
       |
       +--> Orchestration
       |        |
       |        +--> SequentialExecutor
       |        |
       |        +--> ParallelExecutor
       |        |
       |        +--> Future execution coordinators
       |
       +--> Workflow / DAG Coordination
       |
       +--> Verification / Recovery
       |
       +--> MCP / External Capabilities
       |
       +--> ERP Specialized Agents
       |
       +--> ERP Process Pipelines
       |
       +--> Governance / Security
       |
       +--> Observability / Metrics
       |
       +--> ERP Agent Benchmark
       |
       +--> Public Packaging
       |
       v
Autonomous ERP Engineering Platform
```

The architecture evolves incrementally. Later phases must build on stable earlier boundaries unless an explicit architectural decision changes them.

## Current Core Boundaries

### Agent Definition and Registry

Agent definitions describe available agents and their capabilities/permissions.

The registry provides controlled lookup and registration.

The registry should not become the orchestration engine.

### AgentExecutor

`AgentExecutor` represents the execution boundary for an individual registered agent.

Its responsibility is individual agent execution.

It should not contain workflow dependency management or multi-agent scheduling.

### SubagentRunner

`SubagentRunner` is the lower-level execution mechanism that interacts with the Pi/runtime execution environment.

Higher-level coordinators should depend on the agent execution abstraction rather than embedding subprocess or runtime details.

### Orchestrator

`Orchestrator` is the common contract for higher-level execution coordinators.

The contract allows different execution strategies to share a stable boundary.

Current implementations include:

- `SequentialExecutor`
- `ParallelExecutor`

Future coordinators may implement the same contract when appropriate.

### SequentialExecutor

Executes an explicitly ordered sequence of agent tasks.

Its primary concern is sequential execution semantics.

It should not become the general workflow/DAG state manager.

### ParallelExecutor

Executes independent tasks concurrently subject to concurrency and failure policy.

Its primary concern is execution concurrency and aggregation.

It should not own general dependency-graph semantics.

### ExecutionRecord

`ExecutionRecord` is the coordinator-independent normalized representation of an execution.

It provides a common evidence model for:

- UI;
- reporting;
- telemetry;
- future persistence;
- future benchmarking.

Future phases should extend this representation carefully rather than replacing it with coordinator-specific result models.

## Phase 3: Workflow / DAG

Phase 3 introduces workflow/DAG coordination.

The key architectural separation is:

```text
Workflow / DAG Coordinator
        |
        | determines which tasks are eligible
        v
Orchestrator
        |
        | determines how eligible tasks execute
        v
AgentExecutor
        |
        v
SubagentRunner
```

The DAG layer is responsible for:

- workflow representation;
- task dependencies;
- dependency validation;
- cycle detection;
- readiness;
- blocked work;
- workflow-level state.

The orchestration layer remains responsible for executing eligible work.

Do not collapse these responsibilities into one component without an approved architectural decision.

## Phase 4: Verification + Recovery

Verification and recovery build on execution evidence produced by earlier phases.

Conceptually:

```text
Workflow / DAG
      |
      v
Execution
      |
      v
ExecutionRecord
      |
      +--> Verification
      |
      +--> Failure diagnosis
      |
      +--> Recovery / retry
      |
      v
Verified execution state
```

Verification should distinguish between:

- task execution completed;
- task result is valid;
- workflow objective is satisfied.

Recovery should preserve successful work wherever practical rather than blindly restarting the complete workflow.

The detailed behavior remains governed by `ROADMAP.md` and the relevant Phase 4 ADRs.

## Phase 5: MCP / External Capabilities

External capabilities should be integrated behind explicit capability boundaries.

Conceptually:

```text
Agent
  |
  v
Capability Boundary
  |
  +--> MCP capability
  +--> External service
  +--> Tool
  |
  v
Result / Evidence
```

External capabilities must not silently bypass governance, permission, or observability boundaries.

## Phase 6: ERP Specialized Agents

Specialized ERP agents build on the existing execution and orchestration foundation.

Conceptually:

```text
ERP Domain
   |
   +--> Functional analysis
   +--> PL/SQL
   +--> Data / SQL
   +--> Integration
   +--> Testing / validation
   |
   v
Agent Foundation
```

Specialized agents should remain compatible with the common agent execution and orchestration abstractions.

## Phase 7: ERP Process Pipelines

ERP process pipelines compose specialized agents into business-process workflows.

Conceptually:

```text
ERP Business Process
        |
        v
Workflow / DAG
        |
        +--> ERP Agent A
        |
        +--> ERP Agent B
        |
        +--> ERP Agent C
        |
        v
Verification
        |
        v
Business-process result
```

The pipeline layer should express business-process coordination without duplicating the lower-level agent execution mechanism.

## Phase 8: Governance + Security

Governance and security apply across the execution stack.

```text
Governance / Security
        |
        +-----------------------------+
        |                             |
        v                             v
Agent permissions              External capabilities
        |                             |
        +-------------+---------------+
                      |
                      v
                 Execution
```

Security controls should constrain capabilities rather than being bypassed by specialized agents or workflow components.

Do not broaden permissions merely to simplify development.

## Phase 9: Observability + Metrics

Observability should consume normalized execution evidence.

```text
Execution
    |
    v
ExecutionRecord
    |
    +--> Metrics
    +--> Timing
    +--> Tool usage
    +--> Token usage
    +--> Failure data
    +--> Recovery data
    +--> Verification data
    |
    v
Observability
```

The observability layer should avoid coupling metrics collection directly to a single coordinator.

## Phase 10: ERP Agent Benchmark

The ERP benchmark is a product capability of the repository, but the external LCAB harness remains separate.

The intended relationship is:

```text
                  LCAB
           External Harness
                  |
                  | launches normal Pi agent
                  v
             pi-erp-agent
                  |
                  | provides
                  v
       ERP Agent Benchmark
                  |
                  | evidence/results
                  v
                 LCAB
               evaluates
```

Do not add LCAB-specific benchmark control logic to the target repository unless explicitly required by the roadmap.

## Phase 11: Public Packaging

Public packaging should preserve:

- documented architecture;
- reproducible installation;
- dependency/license information;
- stable interfaces;
- security boundaries;
- testability.

The packaging phase should not require replacing the core architecture established in earlier phases.

## Phase 12: Autonomous ERP Engineering Platform

The final architecture combines the previous layers:

```text
                 Pi Coding Agent
                       |
                       v
          Autonomous ERP Engineering
                   Platform
                       |
      +----------------+----------------+
      |                |                |
      v                v                v
   Planning        Execution        Governance
      |                |                |
      v                v                v
 Workflow/DAG    AgentExecutor     Security
      |                |                |
      v                v                v
 Verification    Orchestrators     Capabilities
 Recovery             |                |
      |               v                |
      +---------> ERP Agents <---------+
                       |
                       v
                ERP Pipelines
                       |
                       v
                Observability
                       |
                       v
                   Benchmark
```

## Cross-Phase Architectural Rules

1. Prefer stable abstractions over phase-specific coupling.
2. Preserve `AgentExecutor`, `Orchestrator`, and `ExecutionRecord` boundaries unless an ADR explicitly changes them.
3. Keep workflow dependency management separate from execution strategy.
4. Keep LCAB external to the target repository.
5. Avoid benchmark-specific implementation in the target repository unless the roadmap explicitly requires it.
6. Preserve previous-phase behavior and tests.
7. Add new capabilities incrementally rather than rewriting the foundation.
8. Keep external dependencies behind explicit boundaries.
9. Treat security and permissions as cross-cutting concerns.
10. Use `ExecutionRecord` as the common evidence model whenever possible.

## Architecture Change Rule

A change to a core architectural boundary should be accompanied by:

- an explicit rationale;
- impact analysis;
- updated tests;
- updated documentation;
- an ADR when the decision changes an established architectural commitment.

The roadmap determines phase scope. ADRs determine protected architectural decisions. This document describes the resulting architectural structure.
