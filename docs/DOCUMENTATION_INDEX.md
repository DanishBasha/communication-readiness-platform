# Documentation Index — Communication Readiness Platform

> **Last updated:** 2026-09-28  
> **Branch:** `feature/new-ui-backend-integration`  
> **Source of truth rule:** Source code > Migrations > Test reports > Old documentation  

---

## Formal Documentation (Authoritative)

These are the maintained, canonical sources for each topic area.

| Document | Purpose | Source of truth for | Audience | Status |
|----------|---------|---------------------|----------|--------|
| [API_SPECIFICATION.md](API_SPECIFICATION.md) | All backend API contracts | Endpoint paths, request/response shapes, auth roles, API status | Backend devs, frontend devs, integration testing | ✅ Current |
| [DATABASE_SCHEMA_DESIGN.md](DATABASE_SCHEMA_DESIGN.md) | Complete database design | Tables, columns, constraints, FK relationships, indexes, ownership | Backend devs, DBA | ✅ Current |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Overall platform architecture | Service topology, module boundaries, request lifecycle, cross-module flows | All devs, architects | ✅ Current |
| [AUTHENTICATION_AUTHORIZATION_SPEC.md](AUTHENTICATION_AUTHORIZATION_SPEC.md) | Auth & RBAC | JWT, password handling, role guards, token revocation, middleware | Backend devs, security reviewers | ✅ Current |
| [ENVIRONMENT_CONFIGURATION_GUIDE.md](ENVIRONMENT_CONFIGURATION_GUIDE.md) | All env vars & config | Backend, frontend, AI service configuration | Devs, DevOps | ✅ Current |
| [DATA_MIGRATION_SEEDING_PLAN.md](DATA_MIGRATION_SEEDING_PLAN.md) | Database migration strategy | Migration runner, ordering, seeds, production procedure | Backend devs, DevOps | ✅ Current |
| [LOGGING_MONITORING_ERROR_HANDLING.md](LOGGING_MONITORING_ERROR_HANDLING.md) | Observability & errors | AppError, audit logs, HTTP errors, monitoring gaps | Backend devs, ops | ✅ Current |
| [DATA_PRIVACY_COMPLIANCE_SPEC.md](DATA_PRIVACY_COMPLIANCE_SPEC.md) | Privacy & data handling | PII, credential handling, AI data, retention, compliance gaps | All devs, reviewers | ✅ Current |

---

## Supporting Documents (Accurate, Specialized)

| Document | Purpose | Status |
|----------|---------|--------|
| [API_FUNCTION_CATALOG.md](API_FUNCTION_CATALOG.md) | Deep per-endpoint code audit with file/line references | Supporting — use API_SPECIFICATION.md for contracts; use this for implementation detail |
| [API_TEST_REPORT.md](API_TEST_REPORT.md) | Live HTTP test run results (2026-09-28, 50/55 pass) | Historical — test evidence; not a spec |
| [STUDENT_IMPORT_FORMAT.md](STUDENT_IMPORT_FORMAT.md) | CSV import format for bulk student creation | Current — operational reference for coordinators |
| [EDGE_CASES.md](EDGE_CASES.md) | Known edge cases and design decisions | Supporting — consult when implementing boundary logic |

---

## Module Development Logs (Historical, Keep Intact)

| Document | Contents | Status |
|----------|---------|--------|
| [MODULE_2_DEVELOPMENT_LOG.md](MODULE_2_DEVELOPMENT_LOG.md) | Session-by-session M2 implementation record | Historical — do not edit; append only |
| [MODULE_1_IMPLEMENTATION_CHECKLIST.md](MODULE_1_IMPLEMENTATION_CHECKLIST.md) | M1 implementation tasks and status | Historical reference |
| [MODULE_2_IMPLEMENTATION_CHECKLIST.md](MODULE_2_IMPLEMENTATION_CHECKLIST.md) | M2 implementation tasks and status | Historical reference |
| [MODULE_3_IMPLEMENTATION_CHECKLIST.md](MODULE_3_IMPLEMENTATION_CHECKLIST.md) | M3 planned tasks (NOT YET IMPLEMENTED) | Planning reference |
| [MODULE_4_IMPLEMENTATION_CHECKLIST.md](MODULE_4_IMPLEMENTATION_CHECKLIST.md) | M4 implementation tasks | Historical reference |
| [CROSS_MODULE_INTEGRATION_LOG.md](CROSS_MODULE_INTEGRATION_LOG.md) | Integration event log between modules | Historical reference |

---

## Planning Documents (Superseded — Keep for Context)

| Document | Superseded By | Notes |
|----------|--------------|-------|
| [API_REFERENCE.md](API_REFERENCE.md) | API_SPECIFICATION.md | **PLANNING DOCUMENT** — described intended APIs; many paths/field names differ from actual implementation. Do not treat as ground truth. |
| [API_DATA_FLOW_ARCHITECTURE.md](API_DATA_FLOW_ARCHITECTURE.md) | SYSTEM_ARCHITECTURE.md + API_SPECIFICATION.md | Architecture sections accurate (event bus, module boundaries); endpoint list superseded. Some corrections applied in new docs. |
| [BACKEND_BLUEPRINT.md](BACKEND_BLUEPRINT.md) | SYSTEM_ARCHITECTURE.md | Original project specification document; superseded for architecture |
| [BACKEND_IMPLEMENTATION_PLAN.md](BACKEND_IMPLEMENTATION_PLAN.md) | Module checklists | Per-module implementation plans; superseded for current state |
| [BACKEND_TEAM_MODULE_ALLOCATION.md](BACKEND_TEAM_MODULE_ALLOCATION.md) | PROJECT_CONTEXT.md | Team allocation; kept as reference |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | SYSTEM_ARCHITECTURE.md | Project overview; partially superseded |
| [WORKFLOW.md](WORKFLOW.md) | — | Development workflow guide; remains useful |

---

## Source-of-Truth Decisions

| Topic | Authoritative Document | Reasoning |
|-------|----------------------|-----------|
| API endpoint contracts | API_SPECIFICATION.md | Code-audited, includes frontend-usage mapping, bug tracking |
| Database schema | DATABASE_SCHEMA_DESIGN.md | Derived from migrations (source of truth) |
| Architecture & service topology | SYSTEM_ARCHITECTURE.md | Synthesized from source + 4-agent audit |
| Auth flow | AUTHENTICATION_AUTHORIZATION_SPEC.md | Code-traced, includes token revocation details |
| Env configuration | ENVIRONMENT_CONFIGURATION_GUIDE.md | Derived from `backend/src/config/env.ts` |
| Migration details | DATA_MIGRATION_SEEDING_PLAN.md | Derived from migration files |
| Error handling | LOGGING_MONITORING_ERROR_HANDLING.md | Code-traced |
| Privacy / data handling | DATA_PRIVACY_COMPLIANCE_SPEC.md | Code-traced |

---

## Known Gaps (As of 2026-09-28)

- **M3 (Performance, Skills, Listening)** — tables exist but NO routes or service code implemented
- **Portal routes** — all 6 `/api/portals/*` endpoints are stubs with no handlers
- **`placement.checklist_items` seeding** — migration 106 is a placeholder; no checklist items seeded
- **`agent` schema** — created in migration 002 but no tables defined
- **`trainerTenure` middleware** — implemented but not applied to any route
- **Frontend → Backend integration** — frontend now calls real backend on `feature/new-ui-backend-integration`; previous docs described 100% mock frontend
