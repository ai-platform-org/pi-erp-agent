# Agent Development Instructions

## Purpose

This repository develops an Agent Foundation for Pi-based ERP agent experimentation, orchestration, observability, and future benchmarking.

The implementation is intentionally developed in phases.

## Long-Horizon Development Context

This repository is a long-horizon software-engineering target.

An external benchmark harness may launch a standard Pi coding agent
against this repository to implement the roadmap incrementally.

The benchmark harness is external to this repository.

Do not add benchmark-specific logic, scoring, scenario definitions,
or benchmark instrumentation solely for the external harness unless
the current roadmap phase explicitly requires it.

Treat the repository as a genuine software project.

Each phase must preserve:

- existing functionality;
- previous architectural decisions;
- backward compatibility where practical;
- automated tests;
- documentation;
- repository buildability;
- reproducibility.

The current task is one step in a potentially long sequence of
future development tasks. Do not optimize the implementation only
for the current task or assume the repository will be reset after
completion.

Before changing existing architecture, inspect the implementation,
tests, ROADMAP.md, and relevant ADRs.

Do not implement future roadmap phases early.

## Mandatory Development Workflow

Before modifying code:

1. Read `ROADMAP.md`.
2. Identify the current phase and task.
3. Read all relevant ADRs under `docs/adr/`.
4. Inspect the existing implementation and tests.
5. Describe the intended implementation approach before making architectural changes.

Implement only the requested phase/task.

Do not proactively implement future phases.

After implementation:

1. Run the relevant unit tests.
2. Run the complete test suite.
3. Run TypeScript type checking.
4. Review the complete diff.
5. Update documentation when behavior or architecture changes.
6. Report:
   - files changed;
   - tests executed;
   - typecheck result;
   - architectural decisions;
   - known limitations;
   - follow-up work.

Stop when the requested phase/task is complete.

Do not automatically continue into the next phase.

## Architecture Boundaries

The current architecture is:

```text
Pi Coding Agent
      |
      v
Agent Foundation
      |
      +--> AgentExecutor
      |       |
      |       v
      |   SubagentRunner
      |
      +--> Orchestrator
              |
              +--> SequentialExecutor
              |
              +--> ParallelExecutor
              |
              +--> Future coordinators
```

### AgentExecutor

`AgentExecutor` represents the execution boundary for an individual agent.

Do not introduce orchestration logic into `AgentExecutor`.

### SubagentRunner

`SubagentRunner` is responsible for the lower-level Pi/subprocess execution mechanism.

Higher-level orchestration code must not depend directly on Pi child-process implementation details.

### Orchestrator

`Orchestrator` is the common contract for higher-level execution coordinators.

Preserve the abstraction unless an ADR explicitly authorizes a change.

### ExecutionRecord

`ExecutionRecord` is the normalized representation of an execution.

It is used by:

- UI;
- telemetry;
- reporting;
- future persistence;
- future benchmarking.

Do not replace or substantially redesign `ExecutionRecord` without an explicit architectural decision.

## Phase Discipline

The roadmap is authoritative for implementation order.

Do not:

- implement future phases early;
- introduce speculative abstractions;
- redesign stable Phase 2 APIs without justification;
- combine multiple roadmap phases into one implementation;
- silently change execution semantics.

If the current phase requires an architectural decision not already covered by an ADR:

**stop and request human architectural review.**

## Testing Requirements

Every behavioral change must include or update tests.

Tests must cover the appropriate levels:

### Unit

Test individual functions, state transitions, validation rules, and data structures.

### Component

Test interaction between major Agent Foundation components.

### Integration

Test execution across the relevant orchestration and agent-execution boundaries.

### Regression

Existing Phase 1 and Phase 2 tests must continue to pass unless a deliberate breaking change has been approved.

Do not delete or weaken an existing test merely to make a new implementation pass.

## Failure and Cancellation Semantics

Do not silently change the meaning of:

- `succeeded`;
- `failed`;
- `cancelled`;
- failure policies;
- cancellation;
- execution IDs;
- task ordering;
- concurrency limits.

Changes to these semantics require tests and architectural justification.

## Public Distribution and Copyright

This project may be publicly distributed.

Do not copy source code from external repositories into this project.

External projects may be studied for:

- architecture;
- API design;
- documented behavior;
- general algorithms;
- extension patterns.

Prefer independently authored implementations.

Before adding a third-party dependency:

1. Identify the package and version.
2. Identify its SPDX license.
3. Review redistribution requirements.
4. Review attribution/notice requirements.
5. Determine compatibility with the project's intended distribution.
6. Document material licensing decisions.

Do not introduce a dependency solely because it provides functionality that can reasonably be implemented within the existing architecture.

Refer to `ADR-002` for the ecosystem reuse strategy.

## Dependency Discipline

Avoid unnecessary dependencies.

Before adding a dependency, determine whether the functionality can be implemented using:

- existing project code;
- Node.js standard library;
- existing Pi APIs;
- existing project dependencies.

Any new architectural dependency should be explicitly justified.

## Source Compatibility

Preserve existing public interfaces whenever practical.

Before changing:

- `AgentExecutor`;
- `Orchestrator`;
- `ExecutionRecord`;
- executor result types;
- agent definitions;

inspect all existing consumers and tests.

Do not perform broad refactoring merely to implement a localized feature.

## Documentation

When architecture changes:

- update the relevant ADR;
- update `ROADMAP.md` if phase scope changes;
- update relevant implementation documentation.

Documentation must describe the actual implemented behavior.

Do not document planned behavior as implemented behavior.

## Security

Treat agent execution as a security boundary.

Do not broaden:

- filesystem access;
- command execution;
- subprocess permissions;
- network access;
- agent permissions;

without explicit authorization in the roadmap or an ADR.

Never weaken security controls merely to simplify tests.

## Completion Criteria

A phase/task is complete only when:

- implementation is complete;
- relevant tests pass;
- regression tests pass;
- type checking passes;
- documentation is updated where required;
- no unintended files are modified;
- the implementation remains consistent with the current ADRs.

The agent must provide a concise completion report and stop.
