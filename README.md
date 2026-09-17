# AI-Powered Communication Readiness Platform

An intelligent, voice-first mock interview and placement readiness platform tailored for academic institutions and technical training programs.

---

## 📖 Key Documentation

- 🚀 **[PROJECT_BLUEPRINT.md](./PROJECT_BLUEPRINT.md)**: **The Master Build Guide** — Comprehensive implementation manual containing the monorepo directory layout, SQL schema DDL, REST API endpoints, adaptive difficulty algorithms, scoring formulas, and 5-phase roadmap.
- 📐 **[Architecture Suite](./docs/architecture/)**:
  - **[Visual Diagram Gallery](./docs/architecture/GALLERY.md)**
  - **[UML Class Diagram](./docs/architecture/CLASS_DIAGRAM.md)**
  - **[System Architecture (5-Layer)](./docs/architecture/SYSTEM_ARCHITECTURE.md)**
  - **[UML Use Case Diagram](./docs/architecture/USE_CASE_DIAGRAM.md)**
  - **[Sequence Diagram](./docs/architecture/SEQUENCE_DIAGRAM.md)**
  - **[Data Model (ER Diagram)](./docs/architecture/DATA_MODEL.md)**

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React SPA (Vite + TS + Tailwind) | Role-based portals (Student, Trainer, Mentor, Admin, Placement) |
| **Backend Monolith** | Node.js + Express | 15 domain modules, business rules, credits, scoring engine |
| **AI Intelligence** | Python + FastAPI | Speech-to-Text, audio metrics (Librosa), LLM prompt chaining |
| **Database** | PostgreSQL + pgvector | 8 logical schemas + native vector semantic search |
| **LLM Provider** | Cloud API (MVP) → Self-Hosted (Prod) | Abstracted interface (LLMProvider) for instant swap |
