# AI-Powered Communication Readiness Platform (College Edition)

An institutional, voice-first placement readiness and technical communication platform tailored for colleges and universities with **2,000 – 3,000 engineering candidates**.

The platform prepares students for high-stakes technical campus interviews through **resume-grounded AI mock interviews**, **auditory listening comprehension tests**, **strict browser proctoring**, and **mentor-verified readiness checklists**, wrapped in an ultra-crisp **[Mobbin-inspired](https://mobbin.com/)** design system.

---

## 🌟 Core Highlights

* 🎙️ **Voice AI Mock Interview Room:** Verbal question-and-answer technical interview grounded directly in the student's verified resume, GitHub repositories, and LeetCode profile. Features an animated audio visualizer orb, live speech recognition, and adaptive difficulty progression (`EASY` $\rightarrow$ `MEDIUM` $\rightarrow$ `ADVANCED`).
* 🎧 **Listening Comprehension Room:** Auditory scenario briefing (e.g. *Client Real-Time Payment Gateway requirements*) played without written text cues, followed by targeted verbal recall questions with a strict 2-replay limiter.
* 🛡️ **Anti-Cheating & Browser Proctoring:** Active tab-switch detection and focus monitoring. If a candidate leaves or switches tabs, immediate deterrent alerts trigger and occurrences are flagged in the institutional audit log (`Tab Switches: X / 4 allowed`).
* 📊 **Speech Analytics & Diagnostic Scorecard:** Turn-by-turn analysis providing an overall readiness score (/100), technical depth, communication clarity, Words-Per-Minute (WPM) speaking pace meter against an optimal 120–150 WPM benchmark, and filler word density counters (`"um"`, `"like"`, `"basically"`).
* 📋 **College Placement Syllabus Checklist:** Granular track criteria imported from college placement syllabi (e.g., *Solve 50 LeetCode Mediums*, *Complete AWS Cloud Certification*). Students mark tasks complete, but items strictly require faculty mentor verification before unlocking placement eligibility.
* 🏛️ **College Cohort Architecture:**
  * **★ HOPE Elite Track:** High-caliber pool (52–60 candidates) undergoing rigorous low-level design & concurrency drills.
  * **HOPE General Track:** Accelerated core problem-solving stream.
  * **PEP (Professional Enhancement Program):** 21 specialized domain tracks (Full Stack, Cloud & DevOps, AI/ML, Cybersecurity, Embedded IoT, Data Engineering, etc.).
  * **Department Core Stream:** Departmental academic cohort.
* 🎨 **Mobbin-Inspired UI Design System:** Pure white/neutral canvas (`#FAFAFA` / `#FFFFFF`), slate text (`#09090B`), hairline micro-borders (`border-neutral-200`), solid jet-black CTA buttons, `⌘K` global search trigger, and high-density bento cards.

---

## 👥 5 Stakeholder Portals

| Role | Target Persona | Core Capabilities & Workflow |
|---|---|---|
| 🎓 **Student** | 2,000–3,000 Campus Candidates | Uploads resume (mandatory), views cohort track, attends AI Mock Interviews, takes Listening Comprehension tests, and tracks LeetCode/mentor checklist items. |
| 🧑‍🏫 **Faculty Mentor** | Faculty members (~25 mentees each) | Mentee roster table, monitors LeetCode problem solving & mock interview scores, and verifies/signs off on student checklist tasks. |
| 🏢 **Program Domain Admin** | HOPE Track & PEP Coordinators | Curates domain question banks, manages criteria thresholds, and assigns cohort-wide practice interview rounds across the 21 PEP domains. |
| 🗣️ **Visiting Domain Trainer** | Industry Experts (10–15 day tenure) | Active contract tenure workspace, reviews batch evaluations, schedules specialized microservice/cloud architecture drills, and submits domain rubrics. |
| 💼 **Placement Coordinator** | Super Admin (Dean / Placement Officer) | University-wide placement readiness intelligence, HOPE Elite tracking, department eligibility breakdown, and Senate report generation. |

---

## 🛠️ Technology Stack (Frontend Architecture)

* **Framework:** React 19 + Vite 8
* **Language:** TypeScript (Strict mode)
* **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
* **Typography:** `Inter` (sans UI) + `JetBrains Mono` (metrics & code)
* **Icons:** `lucide-react`
* **Audio & Speech Engine:**
  * **Web Audio API (`AudioContext` & `AnalyserNode`):** Real-time frequency analyzer driving the responsive 3D **Voice Orb** pulse.
  * **Web Speech API (`SpeechSynthesis`):** Interviewer natural text-to-speech engine.
  * **Web Speech Recognition (`webkitSpeechRecognition`):** Candidate continuous speech-to-text with autonomous **Voice Activity Detection (VAD)** and silence turn-completion.
* **Client-Side AI & Groq Integration:**
  * Direct browser-to-API inference using Groq (`llama-3.3-70b-versatile`) when an API key is entered.
  * Deterministic offline intelligent diagnostic evaluator (WPM calculation, filler word density, technical scoring).
* **Storage & Persistence:** LocalStorage state management across all 5 stakeholder portals.

---

## 📂 Project Structure

```text
communication-readiness-platform/
├── README.md                      # Primary project overview and guide
├── PROJECT_BLUEPRINT.md           # Master engineering manual & UML specifications
├── package.json                   # Root package script runner
├── start-all.ps1 / start-all.bat  # One-click startup scripts
├── docs/
│   ├── architecture/              # Complete UML architecture specification
│   └── ui/                        # UI/UX design architecture & specifications
└── frontend/                      # Pure React 19 + TypeScript application
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── App.tsx                # Main view router
        ├── index.css              # Mobbin typography & Tailwind CSS v4
        ├── types/                 # TypeScript interfaces (roles, sessions, reports)
        ├── context/               # Global state (AppContext & role switching)
        ├── services/              # Client-side API layer & direct Groq client
        ├── data/                  # Mock data (21 PEP tracks, mentees, questions)
        └── components/
            ├── auth/              # Sign-in & registration modals
            ├── common/            # Navbar, search, modals & header
            ├── landing/           # Landing page with hero & features
            ├── student/           # Dashboard, Voice Room, Listening Room, Reports
            └── portals/           # Super Admin, Program Admin, Mentor, Trainer
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0 or higher
* **npm**: v9.0 or higher

### Launch the Application

1. **Install dependencies:**
   ```bash
   npm install
   npm --prefix frontend install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   *Or double-click `start-all.bat` / run `./start-all.ps1`.*

3. **Open in your browser:**
   ```
   http://localhost:5173/
   ```

4. **Test Role Switching:**
   Click the **Role Selector dropdown** at the top right of the navigation bar to switch between all 5 user roles:
   * `Student Portal` $\rightarrow$ Run a mock interview, test tab switching, view scorecard.
   * `Faculty Mentor` $\rightarrow$ Inspect the 25-mentee roster and sign off checklist items.
   * `Program Admin` $\rightarrow$ Manage HOPE Elite and the 21 PEP technical domain tracks.
   * `Domain Trainer` $\rightarrow$ Review specialized mock rounds during active tenure.
   * `Placement Coordinator` $\rightarrow$ View college-wide KPIs and filter candidate pools.

### Production Build & Type Checking

To verify clean TypeScript compilation and produce an optimized production bundle:
```bash
npm run build
```

---

## 📖 Deep-Dive Documentation Links

* 📐 **[Visual Architecture Gallery](./docs/architecture/GALLERY.md)**: Visual tour of Class, Use Case, Sequence, Architecture, and Data Model diagrams.
* 🛠️ **[System Architecture Guide](./docs/architecture/SYSTEM_ARCHITECTURE.md)**: 5-layer platform design breakdown.
* 💾 **[Data Model & Relational Schema](./docs/architecture/DATA_MODEL.md)**: Entity-relationship design.
* 🚀 **[Project Blueprint Build Manual](./PROJECT_BLUEPRINT.md)**: Complete implementation blueprint, database schemas, and API design.

---

## 📄 License

Internal Institutional Project — Proprietary academic platform designed specifically for college campus placement and training readiness.
