# Frontend UI Blueprint & Design Specification
# AI-Powered Communication Readiness Platform (College Edition)

This document is the canonical design blueprint for the user interface of the platform.

---

## 1. Overview & UI Strategy
The platform frontend is a **single React Single Page Application (SPA)** with role-scoped portals.
It is built with **UI-First fidelity**, allowing students, mentors, trainers, and administrators to interact with simulated flows (resume parsing, proctored mock interviews, ChatGPT-style voice interactions, and diagnostic scorecards) before backend services are connected.

---

## 2. Core User Flow Architecture

### 2.1 The 5 Portals
1. **Student Portal:**
   - Registration & Mandatory Resume Dropzone.
   - Student Dashboard (Profile, Domain badge: HOPE Elite / Non-Elite / PEP 1-21 / Dept, Mentor Card, Coding Handles, Criteria Checklist).
   - 🎙️ **Start AI Mock Interview** (Proctored fullscreen, Tab-switch detection, ChatGPT voice orb, speech metrics).
   - 🎧 **Start Listening Comprehension** (Passage narration, oral Q&A).
   - Diagnostic Scorecard (Technical skill percentages e.g. Java 85%, Communication fillers, WPM, action plan).
2. **Faculty Mentor Portal:**
   - ~25 Mentees roster.
   - Mentee progress metrics & Criteria Checklist verification toggle.
3. **Program Admin Portal:**
   - Track-specific roster (HOPE Elite / Non-Elite / 21 PEP Domains).
   - Visiting Trainer Onboarding tool (10-15 day active tenure, revocation control).
   - Domain interview assignment tool.
4. **Visiting Trainer Portal:**
   - Domain communication scorecard (WPM, filler word patterns).
   - Practice session assignment tool.
5. **Placement Coordinator Portal:**
   - University-wide readiness gauge and cohort distribution.
   - College-wide mock interview assignment modal.
   - Criteria CSV manager & mentor allocation.

---

## 3. Screen Specifications

### Screen 1: Registration & Mandatory Resume Upload
- **Mandatory PDF/DOCX Upload:** Parses resume content client-side into structured JSON tags (Languages, Frameworks, Tools, Projects).
- **Coding Handles Bar:** Connects GitHub, LeetCode, Codeforces, HackerRank, CodeChef.

### Screen 2: Student Dashboard
- **Top Summary:** Student name, Roll Number, Track Badge (e.g. HOPE Elite), Mentor Details card.
- **Placement Criteria Checklist:** Checklist imported from college criteria CSV. Displays status (*Pending* or *Verified by Mentor*).
- **The Two Primary Action Cards:**
  - Card A: **Attend AI Mock Interview** (Resume-grounded questions, Proctored mode).
  - Card B: **Attend Listening Comprehension** (Spoken narrative scenario, comprehension Q&A).

### Screen 3: ChatGPT-Style Voice Mock Interview Room
- **Proctoring Enforcement:**
  - Fullscreen lock with escape warning.
  - Live tab-switch counter (Tab switches: 0 / 4 allowed).
- **Interactive Voice Orb:**
  - Pulsing glowing canvas sphere that expands and responds to audio levels.
  - State indicators: Listening to you..., AI is thinking..., AI is speaking....
- **Adaptive Difficulty:** Displays current level (EASY -> MEDIUM -> ADVANCED).
- **Live Transcript Drawer:** Collapsible panel showing transcribed conversation history.

### Screen 4: Listening Comprehension Room
- **Hidden Text Audio Player:** Narrates passage once or twice.
- **Audio Wave Visualizer:** Shows playback progression.
- **Spoken Q&A Sequence:** Audio questions asked by AI; candidate answers verbally.

### Screen 5: Comprehensive Diagnostic Scorecard
- **Overall Score (0-100):** Weighted merge (e.g., 70% Technical, 30% Communication).
- **Skill Proficiency Matrix:** Shows granular strengths (e.g. *Java: 88% Strong*, *SQL: 74% Moderate*, *System Design: 45% Needs Work*).
- **Speech & Communication Diagnostic Center:**
  - Filler words counter (*'uh', 'um', 'like'*).
  - Pacing meter (Words Per Minute with target zone 120-150 WPM).
  - Sentence breaks and hesitations counter.
- **Self-Improvement Action Plan:** Structured bullet points on what to study and practice next.

---

## 4. Design System & Theme
- **Color Palette:**
  - Primary: Deep Indigo (#4F46E5) & Electric Blue (#3B82F6)
  - Accent / AI: Emerald Green (#10B981) & Amber (#F59E0B)
  - Proctoring / Alert: Crimson Red (#EF4444)
  - Backgrounds: Clean Slate / Zinc modern layered card UI
