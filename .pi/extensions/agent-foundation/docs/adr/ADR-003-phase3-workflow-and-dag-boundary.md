# ADR-003: Phase 3 Workflow and DAG Boundary

- Status: Accepted
- Phase: 3
- Decision: Separate workflow/DAG planning and dependency management from agent execution.

## Context

Phase 2 established sequential and parallel execution coordinators behind the common `Orchestrator` contract.

Phase 3 introduces workflow and DAG execution.

A workflow introduces concerns that are different from execution:

- task dependencies;
- dependency validation;
- cycle detection;
- readiness;
- blocked work;
- task state;
- workflow state.

These concerns should not be embedded directly into `SequentialExecutor` or `ParallelExecutor`.

## Decision

Introduce a workflow/DAG coordination layer above the existing orchestration layer.

The conceptual architecture is:

```text
Workflow
   |
   v
DAG Coordinator
   |
   +--> determines ready tasks
   |
   +--> tracks dependency state
   |
   +--> applies workflow state transitions
   |
   v
Orchestrator
   |
   +--> SequentialExecutor
   |
   +--> ParallelExecutor
   |
   v
AgentExecutor
   |
   v
SubagentRunner
```

The DAG coordinator determines:

> Which tasks are eligible to execute?

The orchestration layer determines:

> How should eligible tasks execute?

## Responsibilities

### Workflow/DAG layer

Responsible for:

- workflow definition;
- task definitions;
- dependencies;
- dependency validation;
- cycle detection;
- readiness;
- blocked tasks;
- workflow-level state.

### Orchestration layer

Responsible for:

- executing eligible tasks;
- sequential execution;
- parallel execution;
- concurrency;
- failure policy;
- cancellation;
- result aggregation.

### Agent execution layer

Responsible for:

- executing an individual agent;
- invoking Pi runtime facilities;
- collecting execution telemetry.

## ExecutionRecord

`ExecutionRecord` remains the normalized execution representation.

Future DAG execution should extend the execution record model only when necessary and without unnecessarily breaking existing Phase 2 consumers.

## Non-goals

This ADR does not authorize implementation of:

- durable persistence;
- distributed scheduling;
- automatic retries;
- recovery workflows;
- human approval workflows;
- external workflow engines.

Those require separate design decisions unless explicitly included in the current roadmap phase.

## Consequences

### Positive

- Clear separation of dependency management and execution.
- Existing sequential and parallel executors remain reusable.
- DAG behavior can be tested independently.
- Future persistence and recovery can be added without coupling them to agent execution.

### Negative

- Additional abstraction layer.
- More state modeling.
- Some coordination logic will be duplicated conceptually between workflow and execution layers.

## Future Reassessment

Revisit this decision if Phase 3 implementation demonstrates that the separation creates unnecessary complexity or prevents required execution semantics.

Any such change requires an updated ADR.
