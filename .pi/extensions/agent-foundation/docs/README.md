# Pi ERP Agent — Future Extension Publishing & Packaging Goal

> **Tagline:** Policy-controlled, recoverable, verifiable autonomous ERP engineering workflows for Pi.

## Vision

Build a public Pi extension ecosystem that evolves from the current controlled multi-agent execution foundation into an **ERP Engineering Agent Orchestrator**.

The long-term goal is not simply to make Pi run multiple agents. Generic multi-agent orchestration already exists in the Pi ecosystem. The differentiating goal is to make autonomous software-engineering workflows **stateful, dependency-aware, verifiable, recoverable, measurable, and ERP-aware**.

The intended experience is:

```text
User provides a complete implementation backlog once
                         |
                         v
              ERP Engineering Orchestrator
                         |
          +--------------+--------------+
          |                             |
     Task/DAG State                Policy Engine
          |                             |
          +--------------+--------------+
                         |
                  Agent Dispatcher
                         |
          +--------------+--------------+
          |              |              |
       Analyst       Implementer     Reviewer
          |              |              |
          +--------------+--------------+
                         |
                  Verification
                         |
                 Recovery / Retry
                         |
                 Next READY task
                         |
                         v
                  Final report
```

The user should not have to manually feed the next task after each successful task.

## Future public packaging goal

The preferred public architecture is a two-layer ecosystem.

### Layer 1 — Generic orchestration engine

Potential package direction:

```text
pi-agent-orchestrator
```

Purpose: provide reusable orchestration primitives for Pi users outside the ERP domain.

Core capabilities:

- Task DAGs
- Dependency management
- Sequential execution
- Parallel execution
- Agent roles/profiles
- Retry policies
- Failure recovery
- Verification gates
- Persistent workflow state
- Resume-after-interruption
- Cancellation propagation
- Execution telemetry
- Human approval gates
- Workflow reports

Layer 1 should remain domain-neutral.

### Layer 2 — ERP specialization

Potential package direction:

```text
pi-erp-agents
```

Purpose: provide ERP-specific agents, policies, validators, workflows, and process knowledge on top of the generic orchestration engine.

Candidate agent profiles:

- PL/SQL Analyst
- PL/SQL Implementer
- PL/SQL Reviewer
- Oracle EBS Analyst
- Oracle EBS Integration Agent
- Concurrent Program Agent
- ERP Test Agent
- ERP Security Reviewer
- ERP Deployment Reviewer
- ERP Root-Cause Analysis Agent

This separation allows the generic orchestration engine to become broadly reusable while the ERP layer becomes the specialized niche.

## Niche

**Autonomous ERP software engineering and controlled ERP development workflows.**

The system should understand that ERP engineering is more than editing source files. It must account for:

- PL/SQL dependencies
- Oracle E-Business Suite objects
- APIs
- concurrent programs
- workflows
- interfaces
- database dependencies
- deployment dependencies
- regression testing
- security/risk classification
- business-process validation

The niche is therefore:

> **Agentic software engineering for enterprise ERP systems, with explicit governance, verification, recovery, and measurable autonomy.**

## Differentiator

The extension should not compete primarily on:

> "It can run multiple coding agents."

Instead:

> **It can execute long-running ERP engineering workflows autonomously while preserving task state, enforcing policies, verifying outcomes, recovering from failures, and measuring the resulting agent behavior.**

Generic coding-agent orchestration:

```text
Task
  |
  v
Agent
  |
  v
Result
```

Target ERP engineering platform:

```text
Business/engineering task
        |
        v
Dependency analysis
        |
        v
Task DAG + policy evaluation
        |
        v
Specialized agent dispatch
        |
        v
Implementation
        |
        v
Compilation / testing / review
        |
        v
Verification gate
        |
   +----+----+
   |         |
 PASS       FAIL
   |         |
   |      Recovery
   |         |
   +----<----+
        |
        v
Next READY task
```

## Potential moat

### 1. ERP domain specialization

Agent profiles, prompts, validators, workflows, and policies tuned for ERP engineering.

### 2. Persistent workflow state

The orchestrator should know exactly:

- what tasks exist
- which are READY
- which are BLOCKED
- which are RUNNING
- which SUCCEEDED
- which FAILED
- which require HUMAN_APPROVAL
- what evidence was produced

This enables unattended execution and resume-after-interruption.

### 3. Verification-first execution

A task should not become complete merely because an LLM says it is complete.

Completion should be based on evidence such as:

- tests
- compilation
- static analysis
- reviewer approval
- dependency checks
- expected artifacts
- business-rule validation

### 4. Recovery

Failures become workflow events rather than terminal conversation failures.

```text
Failure
  |
  v
Classify
  |
  +--> transient -> retry
  |
  +--> implementation defect -> repair
  |
  +--> verification failure -> investigate
  |
  +--> dependency problem -> re-plan
  |
  +--> high-risk operation -> human approval
```

### 5. Measurable agent execution

The current execution foundation captures structured subagent telemetry. The future platform should extend this into workflow-level metrics such as:

- autonomy
- tool usage
- recovery
- verification
- security
- human intervention
- latency
- token efficiency
- context utilization

### 6. Benchmark corpus and evidence

Controlled ERP task suites and repeatable workflow executions can become a durable evaluation asset.

## Current architectural foundation

The current Phase 1 foundation establishes:

```text
SubagentRunner
     |
     v
isolated Pi process
     |
     v
JSON event stream
     |
     v
SubagentResult
     |
     v
persistent execution telemetry
```

The runner separates child-process execution from higher-level orchestration and records lifecycle/tool/usage information. This is the intended foundation for the future orchestration layers. fileciteturn2file5

## Publishing strategy

When mature enough for public release:

1. Keep the generic orchestration engine domain-neutral.
2. Keep ERP-specific functionality in a separate package/layer.
3. Document installation and configuration clearly.
4. Provide examples that work without an Oracle EBS environment.
5. Publish architecture and design rationale.
6. Publish reproducible benchmarks.
7. Include security and human-approval guidance.
8. Clearly identify dependencies and licenses.
9. Avoid copying implementation from other extensions without verifying license compatibility.
10. Prefer Pi's public extension APIs and independently designed abstractions.

Potential public structure:

```text
pi-agent-orchestrator/
pi-erp-agents/
pi-erp-benchmarks/
```

The benchmark package could eventually provide reusable task definitions and evaluation tooling without requiring users to install the ERP specialization.

## Long-term positioning

The strongest positioning is not:

> "A better Pi subagent extension."

It is:

> **A policy-controlled autonomous ERP engineering platform built on Pi.**

The generic orchestration layer makes it technically reusable.

The ERP layer makes it differentiated.

The benchmark layer makes it measurable and publishable.

The combination is the intended long-term moat.
