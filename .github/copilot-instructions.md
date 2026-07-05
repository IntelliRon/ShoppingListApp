# Shopping List App - Copilot Development Guidelines

This document outlines development standards and workflows for the Shopping List App monorepo. All contributors should follow these guidelines when writing code and submitting pull requests.

## Project Overview

**Monorepo Structure:** Backend (Node.js/Express) + Frontend (Android/Kotlin)  
**Current Focus:** Phase 1 - Backend Core with authentication, JWT, and file locking  
**Test Framework:** Jest (backend)  
**Linter:** ESLint (backend)

See [PLAN.md](/PLAN.md) for the comprehensive project specification.

---

## Code Review & Self-Review Process

### Self-Review Before Pushing

Before pushing code to GitHub:

1. **Review for Correctness**
    - Verify business logic matches requirements
    - Check for off-by-one errors and boundary conditions
    - Test with edge cases (empty inputs, null values, missing data)
    - Validate error handling for all failure scenarios

2. **Verify Alignment with PLAN**
    - Confirm implementation matches the API specification in [PLAN.md](/PLAN.md)
    - Check that database schema changes align with the Database Design section
    - Verify endpoint paths and response formats match the API Specification

3. **Check for PR Comment Overrides**
    - If any PR review comments contradict sections of the PLAN, **halt and ask**:
        - Should the PLAN be updated to reflect the new guidance?
        - Is there a rationale that should be documented?
        - This prevents silent inconsistencies between code and documentation

---

## PLAN.md Maintenance

The [PLAN.md](/PLAN.md) file is a living document and must be kept current.

### Update on PLAN Changes Only

The Document History tracks **changes to the PLAN itself**, not general code work:

- **Last Modified Date:** Update the date in "Project Date" field at the top when the PLAN changes
- **Implementation Status:** If completing a phase or feature, update the "Status" field
- **Key Decisions:** Record architectural/design decisions that impact the specification
- **Document History:** Add an entry **only when the PLAN content meaningfully changes** (specs, requirements, status updates, architectural decisions), not for routine code implementations
    - Date (YYYY-MM-DD)
    - Your GitHub username
    - Summary of changes to the PLAN itself

### Example History Entry

```
| 2026-07-05 | IntelliRon   | Updated Phase 1 status and added authentication architecture decisions |
```

**Note:** General code work (bug fixes, feature implementations, PR comment resolutions) should NOT be added to the Document History. Only log changes that affect the PLAN specification or requirements.

---

## Code Quality Standards

### Linting

All code must pass ESLint checks before pushing.

**Run linter:**

```bash
cd Web/server
npm run lint          # Check for style violations
npm run lint:fix      # Auto-fix fixable issues
```

**Workflow:**

1. Write your code
2. Run `npm run lint:fix` to automatically correct formatting issues
3. Review any remaining errors and fix manually
4. Ensure no errors remain before committing

---

## Testing Requirements

### Test Execution

All tests must pass before pushing code to GitHub.

**Run tests:**

```bash
cd Web/server
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration   # Integration tests only
npm run test:coverage # Generate coverage report
```

**Target Coverage:** ≥80% for new code

### Test-Driven Development for New Functions

When adding or modifying a function, follow this strict workflow:

1. **Ensure Existing Tests Pass**

    ```bash
    npm test  # Green baseline
    ```

2. **Write Tests for Expected Functionality**
    - Define the expected behavior in test cases
    - Cover both happy path and error cases
    - Include edge cases (empty inputs, boundary values, invalid data)
    - Place test file in appropriate folder:
        - Unit tests: `Web/server/tests/unit/`
        - Integration tests: `Web/server/tests/integration/`

3. **Verify New Tests Fail**
    - Run the new tests
    - They should fail (red state)
    - This confirms they actually test the missing functionality

4. **Implement the Function**
    - Write the minimal code to make tests pass
    - Do not over-engineer
    - Keep code focused and readable

5. **Verify New Tests Pass**
    - Run full test suite
    - All new and existing tests must pass (green state)
    - Check coverage hasn't decreased

### Test File Locations

- **Unit Tests:** `Web/server/tests/unit/`
- **Integration Tests:** `Web/server/tests/integration/`
- **Test Fixtures/Data:** `Web/server/tests/fixtures/`

---

## Pre-Push Checklist

Before pushing to GitHub, verify:

- [ ] Code passes ESLint: `npm run lint` (no errors)
- [ ] All tests pass: `npm test` (green)
- [ ] New tests follow TDD workflow (written first, fail, then pass)
- [ ] Code is self-reviewed for correctness and edge cases
- [ ] Implementation aligns with PLAN.md requirements
- [ ] If PR comments override PLAN, clarification was sought
- [ ] PLAN.md updated with:
    - [ ] Date updated to today
    - [ ] Implementation status progressed if applicable
    - [ ] Key decisions recorded (if applicable)
    - [ ] Document History entry added
- [ ] No console.log or debug code remains (except intended logging)

---

## Key Files & Documentation

- **Project Plan:** [PLAN.md](/PLAN.md) - Master specification
- **Backend Setup:** [Web/README-WEB.md](/Web/README-WEB.md) - Backend installation and local dev
- **Android Setup:** [App/README-APP.md](/App/README-APP.md) - Android app development
- **API Documentation:** [docs/API.md](/docs/API.md) - Endpoint specifications
- **Database Design:** [docs/DATABASE.md](/docs/DATABASE.md) - Schema and CSV format

---

## Architecture Principles

- **CSV-Based Storage:** All data persisted in CSV files under `Web/server/db/`
- **Stateless API:** JWT tokens for authentication, no server-side sessions
- **Per-User Data Isolation:** Each user has their own CSV file for shopping lists
- **Error Consistency:** All errors follow the error response format defined in API.md
- **Modular Design:** Services handle business logic, controllers handle routing, middleware handles cross-cutting concerns

---

## Workflow Context

This is a monorepo with two major components:

- **Backend Server** (`Web/server/`): Node.js/Express API - primary focus for Phase 1
- **Android App** (`App/`): Kotlin/Android Studio - Phase 1 consumer
- **Developer UI** (`Web/developer-ui/`): Admin dashboard - Phase 2

Most Copilot work focuses on backend development. When working on Android features, ensure API contracts are met.

---

## Questions?

Refer to the comprehensive [PLAN.md](/PLAN.md) for detailed specifications, architecture decisions, and development phases.
