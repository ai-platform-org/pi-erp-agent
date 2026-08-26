# ADR-002: Ecosystem Reuse and Licensing Strategy

- Status: Accepted
- Date: 2026-08-26
- Phase: 2.4
- Decision: Independently implement the Agent Foundation while using existing Pi ecosystem implementations as architectural references.

## 1. Context

The Agent Foundation currently provides:

- `SubagentRunner`
- `AgentExecutor`
- `SequentialExecutor`
- `ParallelExecutor`
- `Orchestrator`
- `ExecutionRecord`

Phase 2 established sequential and parallel agent execution and introduced a common orchestration contract.

Before implementing persistent DAG orchestration and workflow state in Phase 3, the project must determine whether an existing Pi ecosystem implementation should be reused, adapted, or introduced as a runtime dependency.

The project may be published publicly in the future. Therefore, source-code provenance, licensing, dependency boundaries, and independent implementation are important architectural concerns.

## 2. Alternatives Considered

### A. Directly adopt an existing orchestration implementation

Use an existing Pi ecosystem implementation as the primary orchestration engine.

### B. Wrap an existing implementation with an adapter

Keep the Agent Foundation API but delegate execution to an external orchestration implementation.

### C. Independently implement the Agent Foundation

Continue developing the orchestration layer in this repository while using existing Pi implementations and documentation as architectural references.

## 3. Evaluation Criteria

The alternatives are evaluated against:

- Fit with the Agent Foundation architecture
- Control over execution semantics
- Compatibility with `ExecutionRecord`
- Future DAG and workflow requirements
- Persistence and recovery requirements
- Observability and benchmarking requirements
- Ability to evolve the architecture independently
- Dependency complexity
- Licensing and redistribution considerations
- Public-project maintainability

## 4. Decision

Choose **Option C: independently implement the Agent Foundation**.

Existing Pi ecosystem implementations will be treated as architectural references and sources of implementation ideas.

The project will not introduce an existing orchestration implementation as a runtime dependency at this stage.

Where an existing implementation demonstrates useful patterns, those patterns may influence the design of this project, but implementation code will be authored independently.

## 5. Rationale

The primary purpose of this project is to establish an explicit execution and orchestration foundation that can support future ERP-agent experimentation and benchmarking.

The project therefore needs direct control over:

- Agent execution boundaries
- Orchestration semantics
- Execution identity
- Execution records
- Dependency representation
- Failure handling
- Cancellation
- Future DAG scheduling
- Future workflow state
- Evidence and telemetry

An external orchestration engine could reduce short-term implementation effort but would introduce an additional abstraction and dependency boundary before the project's execution model is fully established.

The current `Orchestrator` interface provides a sufficiently small abstraction for sequential and parallel execution while allowing a future DAG coordinator to implement the same contract.

## 6. Reuse Strategy

The project may reuse the following categories of ecosystem knowledge:

- Public architectural concepts
- Public API patterns
- Pi extension mechanisms
- General orchestration patterns
- Public documentation
- Publicly documented behavior

The project should avoid copying implementation code unless its license explicitly permits the intended use and the required attribution and license obligations are satisfied.

When external source code materially influences an implementation, its provenance and applicable license should be reviewed before incorporating code into the project.

## 7. Licensing and Public Distribution

The project should maintain clear separation between:

1. Independently authored Agent Foundation code.
2. Pi APIs and documented extension mechanisms.
3. Third-party source code or libraries introduced as dependencies.

Before adding a third-party runtime dependency, review:

- SPDX license identifier
- Copyright requirements
- Attribution requirements
- Notice requirements
- Redistribution requirements
- Copyleft or source-disclosure obligations
- Compatibility with this project's intended license

No third-party implementation will be copied into the Agent Foundation solely because it is publicly available.

## 8. Consequences

### Positive

- Full control over orchestration semantics.
- Clear execution model for benchmarking.
- Ability to evolve toward persistent DAG execution.
- Reduced dependency coupling.
- Easier reasoning about execution records and telemetry.
- Clearer provenance for publicly distributed source code.

### Negative

- More implementation effort.
- Responsibility for testing and maintaining orchestration behavior.
- Some ecosystem functionality may need to be implemented independently.
- Future integration with an external orchestration implementation may require an adapter.

## 9. Future Reassessment

This decision should be revisited if an external implementation provides functionality that would otherwise require substantial duplication and can be integrated without compromising the Agent Foundation's execution model.

Reconsideration criteria include:

- Mature DAG scheduling
- Durable workflow state
- Recovery and retry semantics
- Strong observability
- Stable APIs
- Compatible licensing
- Low integration complexity
- Ability to preserve `ExecutionRecord`
- Ability to preserve the `Orchestrator` abstraction

Until those conditions justify a change, the Agent Foundation remains independently implemented.

## 10. Architectural Boundary

The resulting architecture is:

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
            +--> Future DAG Executor

All coordinators produce:

ExecutionRecord
    |
    +--> execution identity
    +--> coordinator
    +--> execution status
    +--> timing
    +--> execution nodes
    +--> dependencies
    +--> telemetry
    +--> output/error

Phase 3 will extend this model with persistent DAG and workflow state rather than replacing the Phase 2 orchestration contract.