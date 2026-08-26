# Long-Horizon Development

## Purpose

`pi-erp-agent` is a long-horizon software-engineering target repository.

The repository is developed incrementally across the phases defined in `ROADMAP.md`. Each phase builds on the repository state produced by previous phases.

An external LCAB benchmark harness may launch a normal Pi coding agent against this repository. LCAB is external to the repository and evaluates the agent's software-engineering performance; it is not part of the Agent Foundation implementation unless explicitly required by the roadmap.

## Repository Role

This repository is the product being developed.

The objective is to evolve the Agent Foundation through:

1. Phase 3 — Workflow / DAG execution
2. Phase 4 — Verification + Recovery
3. Phase 5 — MCP / External Capabilities
4. Phase 6 — ERP Specialized Agents
5. Phase 7 — ERP Process Pipelines
6. Phase 8 — Governance + Security
7. Phase 9 — Observability + Metrics
8. Phase 10 — ERP Agent Benchmark
9. Phase 11 — Public Packaging
10. Phase 12 — Autonomous ERP Engineering Platform

The phase names and detailed scope in `ROADMAP.md` remain authoritative.

## External LCAB Relationship

The intended relationship is:

```text
                 LCAB
          Benchmark Harness
                  |
                  | launches
                  v
           Normal Pi Agent
                  |
                  | develops
                  v
          pi-erp-agent repository
                  |
                  | commits / tests /
                  | documentation / artifacts
                  v
                 LCAB
               evaluates
```

LCAB should remain outside this repository.

Do not add LCAB-specific APIs, benchmark scoring, benchmark scenarios, or harness-specific control logic to `pi-erp-agent` unless the current roadmap phase explicitly requires such functionality.

## Persistent Repository State

The current repository state is part of the long-horizon task.

An agent must assume that:

- previous phases were intentionally implemented;
- existing code may be relied upon by future phases;
- existing tests represent previously established behavior;
- ADRs represent deliberate architectural decisions;
- documentation represents constraints and intended direction.

Do not treat previous implementation as disposable scaffolding.

Do not reset or replace earlier work merely to simplify the current task.

## Incremental Development

Each task must be implemented against the current repository state.

Before changing code:

1. Read `ROADMAP.md`.
2. Identify the requested phase and task.
3. Read relevant ADRs.
4. Inspect existing implementation and tests.
5. Identify affected public interfaces.
6. Determine whether the requested change can be implemented without altering stable boundaries.

Implement the smallest complete change that satisfies the requested task.

Do not implement future phases early.

## Architecture Preservation

Preserve the established separation between:

- individual agent execution;
- orchestration;
- workflow/DAG coordination;
- execution records;
- UI;
- future persistence;
- governance/security;
- observability.

Changes to `AgentExecutor`, `Orchestrator`, `ExecutionRecord`, execution semantics, security boundaries, or major dependency strategy require architectural justification and appropriate documentation.

## Backward Compatibility

Prefer additive changes where practical.

Before changing an existing interface:

1. Search all consumers.
2. Search all tests.
3. Determine whether the interface is part of the established architecture.
4. Assess impact on previous phases.
5. Update tests and documentation if a change is necessary.

Do not silently introduce breaking changes.

## Test Preservation

Existing tests are part of the long-horizon contract.

A new implementation must not weaken coverage by:

- deleting tests;
- reducing assertions;
- bypassing existing test paths;
- replacing meaningful tests with trivial tests.

When behavior changes intentionally, update tests to describe the new approved behavior.

At phase completion, run:

- relevant tests;
- complete regression tests;
- TypeScript type checking;
- repository validation/build commands applicable to the project.

## Documentation Preservation

When behavior or architecture changes:

- update the relevant documentation;
- update the relevant ADR when an architectural decision changes;
- update `ROADMAP.md` only when phase scope or roadmap requirements actually change.

Do not document future behavior as already implemented.

## Failure Recovery

A long-horizon development run may encounter implementation failures, failed tests, incorrect assumptions, or partial changes.

The agent should:

1. inspect the failure;
2. identify the root cause;
3. preserve working changes;
4. make the smallest corrective change;
5. rerun the relevant tests;
6. rerun regression tests when appropriate.

Do not respond to a failed test by broadly rewriting unrelated components.

## Commits and Checkpoints

A completed phase should leave the repository in a coherent checkpoint:

- source code builds;
- tests pass;
- documentation reflects actual behavior;
- no accidental files are present;
- architectural boundaries remain understandable.

If the surrounding workflow uses Git commits as checkpoints, commits should represent coherent completed changes rather than speculative intermediate rewrites.

## Security and Public Distribution

The repository may be publicly distributed.

Do not introduce:

- secrets;
- credentials;
- private user data;
- unnecessary network access;
- unnecessary filesystem access;
- unsafe command execution;
- copied third-party source code.

Review third-party dependencies and licensing before introducing them.

See the relevant ADRs for the project's ecosystem reuse and licensing strategy.

## What the Agent Must Not Do

Unless explicitly required by the current task, do not:

- implement future roadmap phases;
- replace the established architecture;
- introduce benchmark-specific infrastructure for LCAB;
- copy source code from external projects;
- add unnecessary dependencies;
- remove existing tests;
- weaken security controls;
- rewrite unrelated modules;
- convert temporary assumptions into undocumented permanent APIs.

## Phase Completion

A phase is complete only when the implementation, tests, documentation, and architectural state satisfy the phase's completion criteria in `ROADMAP.md`.

After completing the requested phase/task, provide a concise completion report containing:

- files changed;
- tests executed;
- typecheck/build result;
- architectural changes;
- known limitations;
- follow-up work.

Then stop.

Do not automatically begin the next phase.
