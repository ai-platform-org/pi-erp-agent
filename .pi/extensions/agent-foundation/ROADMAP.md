# Pi ERP Agent — High-Level Roadmap

## Long-term goal

Build a public, extensible Pi-based platform for:

> **Policy-controlled, recoverable, verifiable autonomous ERP engineering workflows.**

The roadmap starts after the current Phase 1 controlled `SubagentRunner` foundation.

The project should avoid duplicating generic capabilities already available in the Pi ecosystem unless a specific architectural requirement justifies it. The primary differentiation should emerge at the workflow, state, verification, governance, benchmarking, and ERP layers.

# Roadmap in one view

```
PHASE 1 ✅
Controlled SubagentRunner
        │
        ▼
PHASE 2.1 ✅
Sequential execution
        │
        ▼
PHASE 2.1a
AgentExecutor interface
        │
        ▼
PHASE 2.2
Parallel execution
        │
        ▼
PHASE 2.3
Common orchestration contract
        │
        ▼
PHASE 2.4
Pi ecosystem / reuse / license ADR
        │
        ▼
══════════════════════════════════
PHASE 3
Persistent Task DAG + State Machine
══════════════════════════════════
        │
        ▼
PHASE 4
Verification + Recovery
        │
        ▼
PHASE 5
MCP / External Capabilities
        │
        ▼
PHASE 6
ERP Specialized Agents
        │
        ▼
PHASE 7
ERP Process Pipelines
        │
        ▼
PHASE 8
Governance + Security
        │
        ▼
PHASE 9
Observability + Metrics
        │
        ▼
PHASE 10
ERP Agent Benchmark
        │
        ▼
PHASE 11
Public Packaging
        │
        ▼
PHASE 12
Autonomous ERP Engineering Platform
```

# Phase 2 — Controlled Agent Orchestration

## Objective

Understand the existing Pi orchestration ecosystem and establish the abstraction boundary for higher-level workflow execution. Establish a **domain-neutral orchestration layer** above `SubagentRunner`, while deliberately avoiding premature implementation of persistent workflow management.

### Activities

- Evaluate existing Pi subagent, parallel, and chain approaches.
- Identify reusable concepts.
- Decide which generic mechanisms should be reused versus independently implemented.
- Preserve `SubagentRunner` as the low-level execution primitive.
- Define orchestration interfaces independent of individual agents.
- Establish concurrency and cancellation semantics.
- Explicit sequential execution
- Parallel execution (maximum concurrency,cancellation,failure policy,result ordering,partial failure,duplicate task handling,execution ID,per-agent run ID)
- Common orchestration interface
- Ecosystem comparison / reuse decision

### Target architecture

```
                 Pi Extension
                      │
                      ▼
              Orchestration Layer
                      │
          ┌───────────┴───────────┐
          │                       │
   SequentialExecutor      ParallelExecutor
          │                       │
          └───────────┬───────────┘
                      ▼
                SubagentRunner
                      │
                      ▼
                 Isolated Pi
```

### Exit criteria

- Clear orchestration API.
- Clear distinction between execution and orchestration.
- No unnecessary duplication of generic Pi capabilities.
- Successful sequential and parallel proof of concept.

# Phase 3 — Persistent Task DAG and State Machine

## Objective

Turn a flat implementation backlog into a persistent, dependency-aware workflow.

### Core concepts

```text
Task
Dependency
DAG
Workflow
Task State
Artifact
Evidence
Policy
```

### Task states

```text
QUEUED
BLOCKED
READY
RUNNING
VERIFYING
RECOVERING
SUCCEEDED
FAILED
CANCELLED
HUMAN_APPROVAL
```

### Capabilities

- task manifest
- dependency graph
- ready-task calculation
- state transitions
- persistent workflow state
- workflow resume
- task-level results
- artifact tracking
- workflow-level events

### Exit criteria

A user can provide an entire backlog once and the orchestrator can automatically select the next READY task.

# Phase 4 — Verification and Recovery

## Objective

Make task completion evidence-based and make failures recoverable.

### Verification pipeline

```text
Implementation
      |
      v
Compile
      |
      v
Tests
      |
      v
Static checks
      |
      v
Review
      |
      v
Business validation
      |
      v
COMPLETE
```

### Recovery

Implement:

- failure classification
- retry policy
- repair agents
- verification retry
- dependency re-analysis
- escalation
- maximum retry limits
- human approval gates

### Exit criteria

The system can detect a failed task, attempt a bounded recovery strategy, verify the repair, and continue without manual prompting when policy permits.

# Phase 5 — MCP and external capability layer

## Objective

Connect specialized agents to controlled external tools and enterprise resources.

### Candidate capabilities

- MCP servers
- repository tools
- database metadata
- documentation
- issue/task systems
- test infrastructure
- build infrastructure

### Governance

Every external capability should have:

- explicit permission
- scope
- auditability
- failure handling
- security policy
- human approval rules where necessary

### Exit criteria

Agents can use external capabilities without weakening the orchestrator's policy and telemetry model.

# Phase 6 — ERP-specialized agents

## Objective

Introduce domain-specific ERP agents on top of the generic orchestration engine.

### Initial agents

```text
PLSQL Analyst
PLSQL Implementer
PLSQL Reviewer

Oracle EBS Analyst
Oracle EBS Integration Agent
Concurrent Program Agent

ERP Test Agent
ERP Security Reviewer
ERP Deployment Reviewer
```

### ERP knowledge areas

- PL/SQL
- Oracle EBS objects
- APIs
- concurrent programs
- workflows
- interfaces
- database dependencies
- deployment dependencies
- regression testing
- business-process semantics

### Exit criteria

The system can select appropriate ERP agents for representative ERP engineering tasks.

# Phase 7 — ERP process pipelines

## Objective

Move beyond individual implementation tasks into multi-step ERP engineering processes.

### Example pipeline

```text
Requirement
    |
    v
Impact Analysis
    |
    v
Dependency Analysis
    |
    v
Design
    |
    v
Implementation
    |
    v
Compilation
    |
    v
Unit Test
    |
    v
Regression Test
    |
    v
Code Review
    |
    v
Security Review
    |
    v
Deployment Review
    |
    v
Approval
    |
    v
Release
```

### Capabilities

- process templates
- reusable workflow definitions
- process-specific policies
- stage gates
- evidence requirements
- artifact handoff
- automated progression

### Exit criteria

A complete ERP engineering process can execute with minimal manual orchestration.

# Phase 8 — ERP governance and security

## Objective

Make autonomous execution safe for enterprise environments.

### Governance capabilities

- risk classification
- tool restrictions
- environment restrictions
- destructive-operation detection
- approval gates
- audit trails
- sensitive-data policies
- production safeguards
- deployment controls

### Human-in-the-loop policy

Automatically execute:

- analysis
- source investigation
- local development
- tests
- review
- bounded recovery

Require approval for:

- production changes
- destructive SQL
- irreversible migrations
- high-risk security changes
- ambiguous business requirements
- repeated unrecoverable failures

### Exit criteria

The system can demonstrate policy-controlled autonomy rather than unrestricted autonomy.

# Phase 9 — Benchmark and observability platform

## Objective

Turn execution telemetry into a formal evaluation framework.

### Metrics

```text
Autonomy
Task success
Tool use
Recovery
Verification
Security
Human intervention
Latency
Token efficiency
Context utilization
```

### Workflow report

```text
Tasks
Completed
Failed
Recovered
Human interventions

Subagent runs
Tool calls
Retries
Verification failures

Tokens
Context utilization
Latency

Security gates
Approval events
```

### Exit criteria

Every workflow produces reproducible machine-readable execution evidence.

# Phase 10 — ERP Agent Benchmark

## Objective

Create a repeatable benchmark for autonomous ERP software engineering.

### Benchmark dimensions

#### Capability

- implementation accuracy
- dependency analysis
- test generation
- root-cause analysis

#### Autonomy

- human interventions
- uninterrupted completion
- task progression

#### Recovery

- failure detection
- diagnosis
- repair
- successful continuation

#### Verification

- test evidence
- review evidence
- business validation

#### Security

- tool boundary compliance
- destructive-action prevention
- approval-gate compliance

### Comparison

Potential evaluation:

```text
Single Pi
    vs
Pi + subagents
    vs
Pi + generic orchestration
    vs
Pi + ERP orchestration
```

### Exit criteria

A reproducible benchmark suite and published methodology exist.

# Phase 11 — Public packaging

## Objective

Prepare the stable generic and ERP layers for public release.

### Candidate packages

```text
pi-agent-orchestrator
pi-erp-agents
pi-erp-benchmarks
```

### Packaging requirements

- clean package boundaries
- versioning
- documentation
- examples
- configuration
- tests
- CI
- compatibility matrix
- installation instructions
- security documentation
- license/attribution review

### Exit criteria

A user can install the generic orchestration package without installing ERP-specific functionality.

# Phase 12 — Autonomous ERP Engineering Platform

## Objective

Reach the long-term target.

### User interaction

The user supplies a complete implementation backlog:

```text
Implement CF-013 through CF-025.
```

The system:

```text
Analyze
   |
   v
Build DAG
   |
   v
Select READY tasks
   |
   v
Dispatch agents
   |
   v
Implement
   |
   v
Verify
   |
   +---- PASS ----> Next task
   |
   +---- FAIL ----> Recover
   |
   +---- HIGH RISK -> Human approval
```

The workflow continues without manual prompt feeding.

### Required properties

- persistent state
- dependency-aware execution
- bounded autonomy
- specialized agents
- verification
- recovery
- governance
- observability
- resumability
- reproducible evidence

### Final acceptance criterion

A complex ERP implementation backlog can execute from a single initial user request, progress automatically through dependent tasks, recover from bounded failures, stop safely at defined human-approval gates, resume after interruption, and produce a complete auditable execution report.

# Cross-phase architectural rule

Keep these layers separate:

```text
Pi Extension API
       |
       v
Agent Execution
       |
       v
SubagentRunner
       |
       v
Orchestration
       |
       v
Task State / DAG
       |
       v
Verification / Recovery
       |
       v
ERP Specialization
       |
       v
Governance / Benchmarking
```

The `SubagentRunner` should remain an execution primitive. Higher layers should not need to know how Pi child processes are spawned or how JSON events are parsed.

The current project already establishes this direction: the runner isolates the child process and returns structured `SubagentResult` data while recording execution telemetry. fileciteturn2file11

# Phase transition rule

Do not advance to the next major phase merely because code exists.

Advance only when the current phase has:

1. Working implementation.
2. Automated/manual acceptance tests.
3. Persistent evidence where appropriate.
4. Documented architecture.
5. A reproducible demonstration.
6. A clear rollback/checkpoint.

This keeps the project incremental and prevents the orchestration layer from becoming an untestable autonomous system.


## Development Governance

This roadmap defines the implementation order for the Agent Foundation.

The project is developed incrementally. Each phase must reach a stable checkpoint before the next phase begins.

### Phase execution rules

For each phase:

1. Define the architectural objective.
2. Identify the required interfaces and data model.
3. Implement the smallest complete change satisfying the objective.
4. Add or update tests.
5. Run regression tests.
6. Run TypeScript type checking.
7. Update documentation and ADRs when required.
8. Review the resulting architecture.
9. Mark the phase complete.
10. Stop before beginning the next phase.

The coding agent must not implement future phases without explicit authorization.

### Architectural review gates

Human architectural review is required before changing:

- `AgentExecutor`;
- `Orchestrator`;
- `ExecutionRecord`;
- execution semantics;
- persistence architecture;
- security boundaries;
- external dependencies;
- licensing strategy.

### Phase 2 checkpoint

Phase 2 established:

- sequential execution;
- parallel execution;
- common orchestration contract;
- coordinator-independent `ExecutionRecord`;
- ecosystem/reuse/licensing decision.

The Phase 2 architecture is considered the foundation for Phase 3.

### Phase 3 architectural direction

Phase 3 extends the Phase 2 orchestration model toward workflow/DAG execution.

The intended separation is:

```text
Workflow / DAG
      |
      | determines dependency readiness
      v
DAG Coordinator
      |
      | delegates executable work
      v
Orchestrator
      |
      +--> SequentialExecutor
      |
      +--> ParallelExecutor
      |
      v
ExecutionRecord
```

The DAG layer determines **what can execute**.

The executor determines **how executable work is executed**.

Do not collapse these responsibilities into a single executor.

### Phase 3 implementation constraint

Before implementing the DAG executor, define and test:

- workflow representation;
- task representation;
- dependency representation;
- task states;
- dependency validation;
- cycle detection;
- ready-task calculation;
- failure semantics;
- cancellation semantics.

Do not implement persistence or recovery merely as part of DAG scheduling unless explicitly included in the current phase.



### Long-horizon repository rule

Every phase is implemented against the repository state produced by
all preceding phases.

A phase must not:

- replace functioning earlier infrastructure merely to simplify
  the current implementation;
- delete previous tests without an approved architectural reason;
- bypass an earlier abstraction without documenting why;
- introduce temporary scaffolding that is knowingly incompatible
  with later roadmap phases;
- assume that a future phase will repair current architectural
  shortcuts.

Each phase should leave the repository in a buildable, testable,
documented state suitable for the next autonomous development run.