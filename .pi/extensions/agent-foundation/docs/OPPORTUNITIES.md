# Pi ERP Agent — Future Opportunities

## Purpose

This document records the major opportunities that justify continuing the project beyond the initial Pi customization work.

The project should be evaluated not only as a coding-agent extension, but as a potential **autonomous ERP engineering platform, benchmark environment, and research vehicle**.

## 1. Core product opportunity

### Autonomous backlog execution

The target experience is:

```text
User provides implementation backlog
                |
                v
          Orchestrator
                |
       +--------+--------+
       |        |        |
      DAG    Policies   State
       |        |        |
       +--------+--------+
                |
                v
        Specialized agents
                |
                v
        Implement / Test
                |
                v
           Verify
                |
          +-----+-----+
          |           |
        PASS         FAIL
          |           |
          |        Recover
          |           |
          +-----<-----+
                |
                v
         Next READY task
```

The user should not need to manually submit the next task after every completion.

## 2. Long-running autonomous engineering

A mature orchestrator should support:

- large implementation backlogs
- task dependencies
- sequential workflows
- parallel independent tasks
- retry policies
- recovery
- verification gates
- human approval gates
- resume after interruption
- cancellation
- execution history
- final workflow reporting

This converts Pi from an interactive coding assistant into a controlled long-running engineering worker.

## 3. ERP-specific agent ecosystem

Potential specialized agents include:

### Analysis

- PL/SQL dependency analyst
- Oracle EBS object analyst
- interface analyst
- workflow analyst
- root-cause analyst

### Implementation

- PL/SQL implementer
- EBS API implementer
- integration implementer
- migration implementer

### Quality

- code reviewer
- test generator
- regression tester
- security reviewer
- deployment reviewer

### Governance

- risk classifier
- approval-gate agent
- evidence collector
- compliance/reporting agent

The goal is not merely to create many agents. The goal is to give each agent a bounded role, tool set, policy, and verification responsibility.

## 4. Task DAG and workflow intelligence

A major opportunity is to treat an implementation backlog as a dependency graph rather than a flat list.

```text
CF-013
   |
   +----> CF-014
   |          |
   |          +----> CF-015
   |
   +----> CF-016
              |
              +----> CF-017
```

The orchestrator can automatically determine:

```text
READY
BLOCKED
RUNNING
VERIFYING
RECOVERING
SUCCEEDED
FAILED
HUMAN_APPROVAL
```

This enables safe parallelism without violating task dependencies.

## 5. Verification as a first-class capability

Make "done" evidence-based.

```text
Implementation complete
        |
        v
Compile
        |
        v
Unit tests
        |
        v
Regression tests
        |
        v
Reviewer
        |
        v
Dependency validation
        |
        v
Business-process validation
        |
        v
COMPLETE
```

An LLM's statement that a task is complete should not by itself transition the task to COMPLETE.

## 6. Recovery and self-healing

Failures can become structured workflow events.

```text
Task fails
   |
   v
Failure classifier
   |
   +--> transient -> retry
   |
   +--> code defect -> repair agent
   |
   +--> test defect -> test analyst
   |
   +--> dependency issue -> dependency analyst
   |
   +--> ambiguous requirement -> human
   |
   +--> high-risk operation -> approval gate
```

This provides a measurable definition of recovery rather than an informal "try again" behavior.

## 7. Human-in-the-loop governance

Autonomy should be policy controlled.

Example:

```text
AUTO:
  source analysis
  code generation
  local tests
  static analysis
  review
  retries
  recovery

HUMAN APPROVAL:
  destructive database operations
  production deployment
  irreversible migrations
  high-risk security changes
  ambiguous business requirements
  repeated unrecoverable failures
```

This creates a useful middle ground between manual coding and unrestricted autonomous agents.

## 8. Execution telemetry

The persistent JSONL execution telemetry is a foundation for a larger observability model.

Potential measurements:

- task duration
- subagent duration
- tool calls
- tool errors
- input tokens
- output tokens
- reasoning tokens
- cache reads/writes
- latest context size
- number of turns
- retries
- recovery attempts
- verification failures
- human interventions
- final outcome

The current project work already captures subagent lifecycle and usage information, making this a natural extension. fileciteturn2file5

## 9. Benchmark opportunity

The project can become a controlled benchmark environment for enterprise coding agents.

Potential dimensions:

```text
Autonomy
Tool use
Planning
Task completion
Recovery
Verification
Security
Human intervention
Context efficiency
Token efficiency
Latency
```

Example workflow report:

```text
Tasks                    25
Completed                23
Recovered                 2
Failed                    0

Subagent executions      87
Tool calls             1,247

Human interventions       1

Recovery rate           ...
Verification rate       ...
Token efficiency        ...
Context utilization     ...
Mean latency            ...

Security gates:
  Passed                  24
  Human approval           1
```

The project notes identify measurable enterprise-agent execution as a potential differentiator. fileciteturn2file0

## 10. Research and publication opportunity

Potential theme:

> **Building an Autonomous ERP Software Engineering Agent with Pi**

Compare:

```text
Single Pi
vs
Pi + subagents
vs
Pi + generic orchestration
vs
Pi + ERP orchestration
```

Use controlled ERP implementation tasks and measure:

- success rate
- autonomy
- recovery
- verification
- tool use
- security behavior
- human intervention
- token efficiency
- context utilization

The project notes already identify this comparison as a strong research direction. fileciteturn2file0

## 11. Agent autonomy benchmark

Measure how far an agent can complete an ERP engineering task without human intervention.

```text
Task
 |
 +--> planning
 |
 +--> repository investigation
 |
 +--> implementation
 |
 +--> testing
 |
 +--> verification
 |
 +--> recovery
 |
 +--> completion
```

Distinguish legitimate safety gates from agent failures.

## 12. Recovery benchmark

Create intentionally difficult tasks:

- missing dependency
- failing test
- incorrect implementation
- misleading error
- tool failure
- context pressure
- partial implementation
- conflicting requirements

Measure whether the orchestrator:

1. detects the failure
2. classifies it correctly
3. selects an appropriate recovery strategy
4. repairs the problem
5. verifies the repair
6. continues the workflow

## 13. Security benchmark

Measure whether agents respect:

- read-only agents
- restricted tool sets
- prohibited commands
- approval gates
- production restrictions
- sensitive-data boundaries
- destructive SQL restrictions

Test both:

```text
Agent capability
```

and:

```text
Agent restraint
```

## 14. Context and compaction research

Because the project records context size and token telemetry, it can investigate:

- context growth
- context pressure
- compaction behavior
- tool-call density
- cache utilization
- task success before/after compaction
- recovery after compaction
- model/context-size tradeoffs

## 15. Model comparison opportunity

Execute the same workflow using different models.

Compare:

```text
Model
Task success
Recovery
Tool use
Latency
Context efficiency
Token consumption
Human interventions
Verification success
```

This provides a more useful enterprise-agent comparison than a simple coding benchmark score.

## 16. Public ecosystem opportunity

Potential packages:

```text
pi-agent-orchestrator
pi-erp-agents
pi-erp-benchmarks
```

This gives the project multiple audiences:

- Pi users
- coding-agent researchers
- enterprise AI architects
- ERP engineers
- Oracle EBS practitioners
- benchmark researchers

## 17. Why the project is worth the effort

The strongest case is the intersection of:

```text
        Agent Engineering
              |
              v
       Workflow Orchestration
              |
              v
          ERP Domain
              |
              v
        Benchmarking
```

Each area alone is crowded.

The combination is considerably more specialized.

The project can produce:

1. A useful Pi extension.
2. A reusable orchestration architecture.
3. ERP-specific agent capabilities.
4. A measurable autonomous-engineering workflow.
5. A benchmark framework.
6. Empirical research.
7. Public technical articles.
8. Reproducible demonstrations.

## 18. Strategic principle

Do not optimize for:

> "How many agents can I run?"

Optimize for:

> **"How reliably can the system complete a complex enterprise engineering objective with the minimum necessary human intervention while producing verifiable evidence of correctness and safe behavior?"**

That should remain the north-star metric.
