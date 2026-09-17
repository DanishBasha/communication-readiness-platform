# Architecture Documentation
### AI-Powered Communication Readiness Platform

This folder contains the complete **formal architecture specification** of the platform, consisting of five complementary views — from high-level actors and interactions down to detailed data structures and runtime flows.

---

## Documents

| Document | Diagram Type | Purpose |
|----------|-------------|---------|
| [USE_CASE_DIAGRAM.md](./USE_CASE_DIAGRAM.md) | UML Use Case | Actors, use cases, system boundary, `<<include>>` / `<<extend>>` relationships, external system dependencies |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | System Architecture (Layered Flowchart) | Five-layer runtime architecture: Presentation → Core App → AI Intelligence → Data → External Providers; 15 architectural principles |
| [CLASS_DIAGRAM.md](./CLASS_DIAGRAM.md) | UML Class Diagram | All domain entities, service classes, provider interfaces, enumerations, attributes, methods, and relationships |
| [SEQUENCE_DIAGRAM.md](./SEQUENCE_DIAGRAM.md) | UML Sequence Diagram | End-to-end student assessment lifecycle — from login through voice evaluation, AI scoring, report generation, and credit management |
| [DATA_MODEL.md](./DATA_MODEL.md) | Entity Relationship (ER) Diagram | Full PostgreSQL schema design — all tables, columns, types, and relationships across 8 logical schema partitions |

---

## Quick Architecture Summary

```
Browser (React SPA)
    │  HTTPS / REST / WebSocket
    ▼
Node.js + Express  (Modular Monolith — 15 Domain Modules)
    │  Internal HTTP / gRPC
    ▼
FastAPI  (Python — AI, Speech, Embeddings, RAG)
    │  SQL / pgvector
    ▼
PostgreSQL  (System of Record — 8 Logical Schemas + pgvector)
    │  Provider Abstraction Interfaces
    ▼
External:  LLM Provider │ Speech-to-Text │ Web Search
```

### Core Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Runtime | Node.js + Express | Performant async I/O for REST APIs, broad ecosystem |
| Architecture Pattern | Modular Monolith | Bounded domain modules without distributed transaction overhead |
| AI / ML Runtime | Python + FastAPI | Rich ML/audio ecosystem (transformers, librosa), async-capable |
| Database | PostgreSQL + pgvector | Single system of record; native semantic search via pgvector extension |
| Frontend | React SPA | Role-scoped views from a single application bundle |
| Evaluation Strategy | Single-Pass LLM | Comprehensive structured JSON evaluation in one call |
| Authorization | RBAC + AccessScope | Fine-grained resource-level scoping beyond flat role checks |
| Audio Privacy | In-memory / Transient | Raw microphone audio never persisted; only derived transcript and metrics stored |

---

## Actor → Capability Matrix

| Actor | Auth & Profile | Assessment | Reports | Credits | Admin |
|-------|:-:|:-:|:-:|:-:|:-:|
| **Student** | ✅ | ✅ | Own only | ✅ view | — |
| **Communication Trainer** | ✅ | — | Authorized students | — | — |
| **Faculty Mentor** | ✅ | — | Assigned students | — | — |
| **Program Administrator** | ✅ | — | All in program | ✅ configure | ✅ full |
| **Placement Coordinator** | ✅ | — | Institution-wide | ✅ configure | Partial |

---

## Miro Design Board

The original design artefacts are available at:  
**[Copy of AI Interview & Communication — Miro Board](https://miro.com/app/board/uXjVHnCy97Q=/)** *(view-only)*

Diagrams present on the board:
- UML Use Case Diagram
- System Architecture (5-Layer)
- UML Class Diagram (45 classes, 34 interfaces, 67 relationships)
- Sequence Diagrams (Interview Flow, Listening Flow, Authentication Flow)
- ER / Data Model
- Data Flow & Architecture Principles
