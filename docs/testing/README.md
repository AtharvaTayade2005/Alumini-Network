# Testing Strategy

No test runner is configured yet. This document records the intended approach so
tests can be added consistently as modules are implemented.

## Planned Layers

| Layer | Scope | Tooling |
| --- | --- | --- |
| Unit | Service and utility functions in isolation | `node:test` (built in) |
| Integration | Express routes against a real or containerised PostgreSQL | `node:test` + `supertest` |
| End to end | Critical user journeys in a browser | Playwright |

## Conventions

- One test file per module, mirroring the `server/src` tree.
- Tests must not depend on execution order or shared mutable state.
- Each test sets up and tears down its own database fixtures.
- No test reads a real external service; integrations are stubbed.
- Fixture data is clearly synthetic and never resembles production records.

## Current Status

`server/tests/` exists as a placeholder. The first test suite will be added
alongside the first feature, not before.
