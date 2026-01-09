# Technical Steering & Coding Standards

## 1. Project Context
- **Language:** TypeScript (Node.js/Frontend).
- **Enforcement:** Strict typing (`noImplicitAny`), no `ts-ignore` unless absolutely necessary.
- **Style:** Functional preference where possible, but Class-based where SOLID dictates.

## 2. Core Principles (Simplicity First)
- **KISS (Keep It Simple, Stupid):** Prefer readable, explicit code over "clever" one-liners.
- **YAGNI (You Aren't Gonna Need It):** Do not over-engineer interfaces for hypothetical future use cases. Implement only what the spec requires.
- **Minimal Dependencies:** Use standard library features over adding new npm packages for trivial tasks.

## 3. Architecture & SOLID
Follow SOLID principles strictly:
- **(S)ingle Responsibility:** Each function/class should do one thing. If a file grows beyond 200 lines, propose a split.
- **(O)pen/Closed:** Entities should be open for extension but closed for modification. Use interfaces to define contracts.
- **(L)iskov Substitution:** Subtypes must be substitutable for their base types.
- **(I)nterface Segregation:** Client-specific interfaces are better than one general-purpose interface.
- **(D)ependency Inversion:** Depend upon abstractions (interfaces), not concretions.

## 4. Agent Behavior: Self-Review & Refinement
Before generating or finalizing code, you (the Agent) must perform a **Self-Correction Loop**:
1.  **Draft:** Generate the solution in memory.
2.  **Critique:** strict-check the draft against the SOLID principles above.
    - *Ask yourself:* "Is this function too complex?", "Did I handle the error case?", "Are the types strict?"
3.  **Refine:** Rewrite the code to address the critique.
4.  **Final Output:** Present the refined solution.

## 5. Definition of Done: Documentation
- **Review Docs:** Upon completing any code change, you must explicitly review `README.md` and other relevant documentation files.
- **Update Requirement:** If the code change affects setup steps, environment variables, or public APIs, you **must** generate the corresponding updates to the documentation in the same pull request/output.

## 6. Testing & Quality
- All new features must include a corresponding test file (e.g., `*.test.ts`).
- Write the test *before* or *alongside* the implementation (TDD mindset).