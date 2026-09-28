# CAMPUS PLACEMENT & COMMUNICATION READINESS PLATFORM
## Master Frontend Specification & Step-by-Step User Journey Guide
*(Single Unified Reference Document)*

---

### Table of Contents
1. [Platform Overview & Core Architecture](#1-platform-overview--core-architecture)
2. [Role-Based Access Hierarchy (The 5 Portals)](#2-role-based-access-hierarchy-the-5-portals)
3. [The Complete Step-by-Step User Journeys (`-->` Flow)](#3-the-complete-step-by-step-user-journeys---flow)
   - [Journey 1: Landing Page & Guest Exploration](#journey-1-landing-page--guest-exploration)
   - [Journey 2: Universal Login & Candidate Self-Registration](#journey-2-universal-login--candidate-self-registration)
   - [Journey 3: Student Dashboard, Coding Profiles & Criteria Checklist](#journey-3-student-dashboard-coding-profiles--criteria-checklist)
   - [Journey 4: Resume Intake & Grounding Engine](#journey-4-resume-intake--grounding-engine)
   - [Journey 5: Proctored Technical Mock Interview Room (Hands-Free Voice Flow)](#journey-5-proctored-technical-mock-interview-room-hands-free-voice-flow)
   - [Journey 6: Anti-Cheat Tab-Switch Detection & Proctoring System](#journey-6-anti-cheat-tab-switch-detection--proctoring-system)
   - [Journey 7: Turn-by-Turn Dynamic Speech & Content Evaluation](#journey-7-turn-by-turn-dynamic-speech--content-evaluation)
   - [Journey 8: Comprehensive Diagnostic Scorecard & Report View](#journey-8-comprehensive-diagnostic-scorecard--report-view)
   - [Journey 9: Dynamic Listening Comprehension Lab](#journey-9-dynamic-listening-comprehension-lab)
   - [Journey 10: Placement Coordinator (Super Admin) Portal](#journey-10-placement-coordinator-super-admin-portal)
   - [Journey 11: Faculty Mentor Portal & Criteria Verification](#journey-11-faculty-mentor-portal--criteria-verification)
   - [Journey 12: Program Admin (Domain Lead) & Trainer Onboarding](#journey-12-program-admin-domain-lead--trainer-onboarding)
   - [Journey 13: Visiting Industry Trainer Portal](#journey-13-visiting-industry-trainer-portal)
4. [Frontend Component Directory & File Inventory](#4-frontend-component-directory--file-inventory)
5. [Client-Side State & Storage Persistence](#5-client-side-state--storage-persistence)

---

# 1. Platform Overview & Core Architecture

The frontend is an institutional, single-page application (SPA) built using **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**. It is designed for campus placement training ecosystems handling 2,000–3,000 engineering students.

### Key Capabilities Built-in:
* **Proctored Fullscreen Voice Interview Room:** Integrates browser SpeechRecognition (STT) and SpeechSynthesis (TTS) with a 3D pulsing Voice Orb for hands-free audio conversation.
* **Dynamic Speech Telemetry:** Calculates real Words-Per-Minute (WPM), detects verbal fillers (`uh`, `um`, `like`, `actually`, `basically`), and scores technical depth live.
* **Resume-Grounded Question Generation:** Parses student PDF/DOCX resumes and generates adaptive questions based on their real projects and programming languages.
* **Listening Comprehension Lab:** Multi-scenario audio briefings without subtitles that test verbal retention.
* **Placement Checklist Verification:** Connects students and assigned faculty mentors to sign off on mandatory graduation criteria (LeetCode milestones, hackathons, certifications).

---

# 2. Role-Based Access Hierarchy (The 5 Portals)

The application implements single-entry authentication where the system automatically verifies credentials and routes the user into their respective portal:

```text
                                 [ Placement Coordinator ]
                                 (Super Admin / Macro View)
                                             |
                     +-----------------------+-----------------------+
                     |                                               |
             [ Faculty Mentors ]                             [ Program Admins ]
             (Assigned ~25 Mentees)                          (Dynamic Institutional Tracks)
                     |                                               |
            [ Student Candidates ]                          [ Visiting Trainers ]
            (Mock Rooms & Reports)                          (10-15 Day Tenure Drills)
```

1. **Student Candidate:** Attends mock interviews, practices listening comprehension, connects LeetCode/GitHub handles, and uploads resumes.
2. **Placement Coordinator (Super Admin):** Views university-wide readiness distributions, filters top performers by score/LeetCode, assigns college-wide drills, and exports Senate CSV reports.
3. **Faculty Mentor:** Directly manages ~25 assigned students across any branch; view-only access to mentee transcripts and 1-click verification of college criteria tasks.
4. **Program Admin (Track Lead):** Manages specific tracks assigned dynamically by the Super Admin; onboards external visiting trainers for 10–15 day tenures and revokes access upon completion.
5. **Visiting Trainer:** Industry instructors with temporary active tenure; views domain communication scorecards and assigns practice mock drills.

---

# 3. The Complete Step-by-Step User Journeys (`-->` Flow)

---

### Journey 1: Landing Page & Guest Exploration

```text
Visitor opens web browser and enters http://localhost:5173
  --> System checks browser localStorage for an active session token
  --> No token found (Visitor is unauthenticated)
  --> Landing Page loads smoothly onto the screen
  --> Top notification bulletin displays: "CAMPUS HIRING 2026 | Placement Season Active"
  --> Visitor views social media and college links in the bulletin bar
  --> Landing Header displays: "READINESS COLLEGE | Placement & Communication Suite"
  --> Visitor views the Hero Section:
        - Title: "Placement Readiness & Communication Platform"
        - Subtitle: "Single-College Institutional Edition (2,000–3,000 Students)"
        - Feature tags: Adaptive Speech Telemetry, Web Speech Recognition, 5-Tier Governance
  --> Visitor scrolls to inspect the 3 Student Cohorts:
        - Dynamic Institutional Programs (Configured by Super Admin)
        - Specialized Sub-Program Tracks & Domains
        - Department Stream (Core engineering departments)
  --> Visitor scrolls to read the "Engineered for Campus Technical Hiring" feature grid:
        - Live Voice Telemetry (WPM & Filler word tracking)
        - Automated Resume Grounding & Skill Extraction
        - Listening Comprehension Lab
        - Interactive Communication Coach
        - Proctoring & Tab-Switch Anti-Tampering
  --> Visitor decides to sign in and clicks the black "Sign In" button in the header
```

---

### Journey 2: Universal Login & Candidate Self-Registration

```text
Visitor clicks "Sign In"
  --> Auth Modal slides in over a dark blurred backdrop
  --> User sees two top tabs: [Sign In] and [Candidate Self-Registration]

[OPTION A: Institutional Sign In]
  --> User enters institutional email (e.g., student@college.edu or admin@college.edu)
  --> User enters password
  --> User clicks the black button: "Sign In"
  --> System verifies credentials against the stored user directory:
        - If email matches Super Admin --> Role = SUPER_ADMIN --> Mounts SuperAdminPortal
        - If email matches Coordinator --> Role = PLACEMENT_COORDINATOR --> Mounts PlacementCoordinatorPortal
        - If email matches Program Lead --> Role = PROGRAM_ADMIN --> Mounts ProgramAdminPortal
        - If email matches Faculty Mentor --> Role = FACULTY_MENTOR --> Mounts FacultyMentorPortal
        - If email matches Visiting Trainer --> Role = TRAINER --> Mounts TrainerPortal
        - If student credentials --> Role = STUDENT --> Mounts StudentDashboard
  --> System stores auth token and active user profile in localStorage
  --> Modal closes automatically
  --> Top Navigation Bar mounts showing: College Logo, Active Role Badge, Avatar, and Logout button

[OPTION B: Candidate Self-Registration (External Track)]
  --> User clicks the tab: [Candidate Self-Registration]
  --> Registration form appears
  --> Candidate fills in:
        - Full Name: "Rahul Sharma"
        - Email Address: "rahul.s@college.edu"
        - Password: (at least 6 characters)
        - Department dropdown: "Computer Science & Engineering"
        - Batch Year: "2026"
  --> Candidate clicks: "Continue to Email Verification"
  --> System generates a simulated 6-digit confirmation code (e.g., "582914")
  --> Screen flips to the code verification card displaying: "Code sent to rahul.s@college.edu"
  --> Candidate enters "582914" into the input box
  --> Candidate clicks: "Verify Email & Access Dashboard"
  --> System creates a dedicated clean student profile (saved to localStorage)
  --> User is automatically logged in and routed into their personal Student Dashboard
```

---

### Journey 3: Student Dashboard, Coding Profiles & Criteria Checklist

```text
Student logs in and arrives on the Student Dashboard
  --> Top Profile Header displays:
        - Student Name: "Aravind Kumar"
        - Track Badge: "★ HOPE_ELITE"
        - Roll Number: "21CS1084"
        - Department: "Computer Science & Engineering · Batch of 2026"
        - Assigned Mentor Card: "Dr. S. Ranganathan (ranganathan.s@college.edu)"
  --> Stat Strip below loads four live metrics:
        1. LeetCode Solved Count: 184 / 300 Target
        2. GitHub Repositories: 12 Repos
        3. Mentor Verified Tasks: 4 / 5 Verified
        4. Overall Readiness Progress: 80% Complete

[SUB-FLOW: Editing Coding Handles]
  --> Student clicks the pencil icon on the LeetCode or GitHub card
  --> "Update Coding Profiles" modal opens
  --> Student updates their LeetCode username and solved count: 184 --> 195
  --> Student updates their GitHub username and repository count: 12 --> 14
  --> Student clicks "Save Coding Profiles"
  --> Dashboard stats update immediately on screen
  --> Values persist in localStorage and sync with the Placement Coordinator's view
  --> Modal closes

[SUB-FLOW: Toggling Placement Criteria Checklist Tasks]
  --> Student views the "Placement Criteria Checklist" section:
        [x] Solve 50 LeetCode Medium Questions (Verified by Mentor ✓)
        [x] Resume Review & Verification (Verified by Mentor ✓)
        [ ] Attend 3 Full Proctored Mock Interviews (Unfinished)
        [ ] Complete AWS Cloud Practitioner Certification (Unfinished)
        [x] Deploy Internal Project with Live URL (Pending Mentor Verification)
  --> Student clicks an unfinished checklist item
  --> Checkbox turns into a green checkmark
  --> Progress bar increments from 60% --> 80%
  --> Status badge updates to: "Awaiting Mentor Verification"
  --> Task state is recorded so the Faculty Mentor can inspect and verify it
```

---

### Journey 4: Resume Intake & Grounding Engine

```text
Student clicks the "Upload Resume" button on the dashboard
  --> "Upload Resume & Grounding" modal opens
  --> Student can either drag & drop a PDF resume or paste raw resume text:
        "Full Stack Developer specializing in Java, Spring Boot, React, Kafka, and PostgreSQL. 
         Engineered a distributed high-throughput payment settlement engine handling 10k transactions/sec."
  --> Student clicks "Extract & Ground Profile"
  --> Client-side parser analyzes the text:
        - Extracts Programming Languages: [Java, SQL, TypeScript]
        - Extracts Frameworks: [Spring Boot, React, Kafka, Docker]
        - Extracts Project: "Distributed Payment Settlement Engine"
  --> Parsed data is saved into the student's profile in localStorage
  --> Dashboard updates to show: "Active Resume Grounding: Verified & Active ✓"
  --> The interview engine is now dynamically primed to ground questions in this resume!
```

---

### Journey 5: Proctored Technical Mock Interview Room (Hands-Free Voice Flow)

```text
Student clicks the black button on Dashboard: "Take 1st Mock Interview"
  --> System switches active view to 'INTERVIEW_ROOM'
  --> Browser enters Fullscreen Proctored Mode
  --> Browser prompts: "Allow application to use your microphone?"
  --> Student clicks "Allow"
  --> Proctoring system initializes:
        - Fullscreen lock activated
        - Tab switch and window blur listener attached
        - Proctor status pill shows: "Proctor Active · Tab Switches: 0 / 4"
  --> Center of the screen renders the 3D animated "Voice Orb"
  --> System reads the student's grounded resume
  --> System generates Question 1 (EASY difficulty):
        "Walk me through the architecture of your project 'Payment Settlement Engine'. 
         How did you structure the components using Java and Spring Boot, and what was your primary design challenge?"
  --> Voice Orb pulses in blue 'SPEAKING' mode
  --> Browser Speech Synthesis speaks Question 1 aloud in a clear, natural English voice
  --> Live transcript box displays the question text
  --> Question audio finishes speaking
  --> System pauses 300ms, then AUTOMATICALLY opens the student's microphone!
  --> Voice Orb transitions into glowing green 'LISTENING TO YOU...' mode
  --> Real-time audio waveform visualizer pulses with the volume of the student's voice
  --> Student speaks their answer aloud:
        "In our payment architecture, we structured the services into an order ingestion layer, 
         using Kafka topic partitions to ensure strict ordering per merchant account..."
  --> Web Speech Recognition transcribes the spoken words onto the screen in real-time
  --> If the student stops speaking for 3 seconds:
        - Countdown pill appears: "Auto-submitting in 3... 2... 1..."
  --> Student can also click "Done Speaking / Submit Answer" manually
```

---

### Journey 6: Anti-Cheat Tab-Switch Detection & Proctoring System

```text
During the interview, the student attempts to switch browser tabs or minimize the window
  --> Document 'visibilitychange' event fires instantly
  --> Proctoring counter increments: tabSwitches = 1
  --> A high-visibility Warning Banner appears on screen:
        "⚠️ PROCTORING VIOLATION: Tab switch detected (1 / 4). 
         Please remain on this screen. All violations are logged."
  --> Violation event is logged to the active session data
  --> If student switches tabs a 2nd or 3rd time:
        - Warning banner turns orange: "Level 2 Violation: Multiple Tab Switches Logged"
  --> If student switches tabs 4 times:
        - Session is flagged: isFlagged = TRUE
        - Banner turns Crimson Red: "SESSION FLAGGED FOR RECRUITER AUDIT"
        - Flag is permanently recorded on the student's scorecard for the Placement Coordinator and Mentor
```

---

### Journey 7: Turn-by-Turn Dynamic Speech & Content Evaluation

```text
Student submits answer for Turn 1
  --> Microphone mutes immediately to eliminate acoustic echo
  --> Voice Orb glows in amber 'THINKING & EVALUATING...' mode
  --> Speech Analysis Engine executes in the background:
        1. Counts exact words spoken (e.g., 68 words in 30 seconds)
        2. Calculates Words Per Minute (WPM = 136 WPM --> Optimal recruiter hiring zone!)
        3. Scans for filler words:
           - Found 1 'uh', 1 'basically' --> Total: 2 filler words
        4. Detects technical keywords:
           - Found: ['kafka', 'partitions', 'ingestion', 'ordering', 'architecture']
        5. Computes dynamic scores:
           - Technical Score: 88%
           - Communication Score: 84%
  --> Collapsible Drawer shows instant turn feedback:
        - "Articulated at 136 WPM (Optimal). Detected 2 fillers. Strong technical terminology."
  --> System dynamically prepares Question 2 (MEDIUM difficulty):
        - Evaluator inspects what the student just articulated in Turn 1
        - Dynamically formulates follow-up:
          "You mentioned using Kafka topic partitions for order ingestion. 
           Suppose transaction volume surges 10x during a flash sale. 
           How would you prevent consumer lag and optimize database connection pooling?"
  --> Voice Orb speaks Question 2 aloud
  --> Student speaks their answer --> Evaluation engine analyzes Turn 2
  --> System prepares Question 3 (ADVANCED difficulty):
        - "What happens if a network partition occurs between your microservices? 
           How do you maintain data consistency without sacrificing latency?"
  --> Student speaks their answer --> Evaluation engine analyzes Turn 3
  --> Turn 3 completes --> Interview session ends automatically!
  --> Screen transitions smoothly to the Diagnostic Scorecard view
```

---

### Journey 8: Comprehensive Diagnostic Scorecard & Report View

```text
Interview finishes
  --> System calculates the final weighted score:
        Final Score = (TechnicalAverage * 0.70) + (CommunicationAverage * 0.30)
  --> Diagnostic Scorecard screen loads:
        - Overall Score: 86 / 100 [Placement Ready ✓]
        - Technical Depth: 88%
        - Clarity & Delivery: 83%
        - Proctoring Status: 0 Violations (Clean Audit)
  --> Speaking Pace Meter highlights:
        - Recorded Rate: 134 Words Per Minute
        - Indicator bar sits squarely inside the optimal 120–150 WPM target zone
        - Verbal verdict: "Cadence is within optimal conversational range."
  --> Filler Word Density card displays:
        - "uh" x1
        - "basically" x1
        - Total: 2 detected (Low Density)
        - Advice: "Replace transitional filler 'basically' with intentional 1-second silence."
  --> Technical Skill Matrix displays 4 dynamic competencies mapped to student's resume:
        1. Java & Architecture Mastery: 88% [STRONG]
        2. Scalability & Partitioning: 85% [STRONG]
        3. Verbal Delivery & Pacing Cadence: 83% [STRONG]
        4. Distributed Resiliency & Fallback: 76% [MODERATE]
  --> Actionable Next Steps lists personalized improvements:
        - "Maintain current cadence! Your speaking rate of 134 WPM is in the recruiter hiring sweet spot."
        - "Practice replacing habitual filler words with quiet breath pauses."
        - "Deepen answers for Distributed Resiliency by referencing CAP theorem tradeoffs."
  --> Student clicks: "Back to Student Dashboard"
  --> Dashboard reloads: Scorecard (86/100) is now displayed in the recent reports strip!
```

---

### Journey 9: Dynamic Listening Comprehension Lab

```text
Student clicks "Enter Listening Comprehension Room" on Dashboard
  --> Active view switches to 'LISTENING_ROOM'
  --> Top bar shows dynamic scenario selector with 4 real-world technical passages:
        1. FinPay Systems: Real-Time Payment Settlement Gateway (FinTech)
        2. CloudScale: Kubernetes Microservices & API Gateway (Cloud/DevOps)
        3. NeuroData AI: Feature Store & Model Inference (AI/ML)
        4. CyberShield: Zero-Trust Identity Federation (Cybersecurity)
  --> Student selects a scenario from the dropdown (e.g., "FinPay Systems")
  --> Replay counter shows: "Replays Used: 0 / 2"
  --> Student clicks: "Play Briefing Passage Aloud"
  --> Speech Synthesis reads the technical passage aloud with animated soundwaves
  --> No text transcript is shown on the screen (tests pure auditory comprehension!)
  --> Narration finishes
  --> Question 1 appears:
        "What is the maximum end-to-end latency specified by FinPay Systems for merchant transactions?"
  --> Student clicks: "Record Verbal Answer"
  --> Student speaks: "The maximum end-to-end latency specified is 250 milliseconds."
  --> Speech-to-text captures the answer into the preview box
  --> Student clicks: "Next Question"
  --> Student answers Question 2 and Question 3 verbally
  --> Student clicks: "Submit All & Generate Scorecard"
  --> Evaluation engine matches spoken response against passage constraints and keywords
  --> System calculates listening comprehension score (e.g., 90/100)
  --> Generates a Listening Diagnostic Report and navigates to the Scorecard view
```

---

### Journey 10: Placement Coordinator (Super Admin) Portal

```text
Placement Coordinator logs in (coord@college.edu)
  --> System loads the Placement Coordinator Portal
  --> Macro College Intelligence Dashboard displays live metrics:
        - Total Candidates Tracked: 240 Students
        - Placement Ready Candidates: 187 Students
        - Active Institutional Programs: Configured by Super Admin
        - Placement Ready Rate: 78% of students scoring >= 75
  --> Coordinator clicks on Cohort Filter Tabs:
        [All Candidates] | [Technical Readiness Track] | [Cloud Systems] | [General Track]
  --> Coordinator types in the search bar: "Aravind"
  --> Candidate table dynamically filters to display:
        - Roll Number: 21CS1084
        - Candidate Name: Aravind Kumar
        - Cohort: Technical Readiness Track
        - Domain: Full Stack
        - Mock Score: 86%
        - Checklist: 4/5
        - Status: PLACEMENT_READY
  --> Coordinator clicks: "Export Senate CSV Report"
  --> Browser automatically downloads: college_placement_readiness_2026-09-25.csv
  --> Coordinator clicks: "Assign College Mock Interview"
  --> Assignment modal opens:
        - Title: "University-Wide Pre-Placement Mock Drill #3"
        - Target: "All Batches (2026)"
        - Due Date: Selected via date picker
        - Mandatory: Checked
  --> Coordinator clicks "Publish Assignment"
  --> Assignment broadcasts immediately across all student dashboards
```

---

### Journey 11: Faculty Mentor Portal & Criteria Verification

```text
Faculty Mentor logs in (mentor@college.edu)
  --> Faculty Mentor Portal opens
  --> Mentor views their assigned roster of ~25 mentees
  --> Mentor sees student "Aravind Kumar" has completed a task awaiting verification
  --> Mentor clicks "Inspect History" on Aravind's card
  --> Student History Modal pops up:
        - Reviews previous mock interview scores (86%, 82%)
        - Reviews speech pacing (134 WPM) and filler counts
        - Checks proctoring audit (0 tab switches, clean record)
        - Reviews uploaded resume skills and external handles (LeetCode: 195)
  --> Mentor navigates to "Placement Criteria Checklist" tab in the modal:
        - Task: "Deploy Internal Project with Live URL" [Pending Verification]
        - Student has attached GitHub repository link
  --> Mentor inspects the link and clicks the green "Verify Task" toggle button
  --> Task status changes instantly to "Verified by Mentor ✓" with timestamp
  --> Student's dashboard updates in real-time to reflect 5/5 verified tasks!
```

---

### Journey 12: Program Admin (Domain Lead) & Trainer Onboarding

```text
Program Admin / Domain Head logs in (program@college.edu)
  --> Program Admin Portal loads
  --> Shows domain roster for assigned institutional training programs
  --> Admin navigates to the "Visiting Domain Trainers" tab
  --> Admin clicks: "Onboard Visiting Trainer"
  --> Admin enters:
        - Trainer Name: "Sneha Kapur"
        - Trainer Email: "sneha.k@codecraft.io"
        - Organization: "CodeCraft Solutions"
        - Assigned Domain: "Full Stack Web Architecture"
        - Active Tenure: "2026-09-10 to 2026-09-24" (10–15 day workshop)
  --> Admin clicks: "Authorize Trainer Access"
  --> Trainer account is activated with domain-scoped privileges
  --> When the 15-day workshop concludes:
        - Admin clicks "Revoke Access"
        - Trainer access is immediately deactivated
```

---

### Journey 13: Visiting Industry Trainer Portal

```text
Visiting Trainer logs in during active tenure (trainer@techtraining.org)
  --> Trainer Portal loads
  --> Trainer sees communication metrics for students in their assigned domain only
  --> Trainer reviews weak communication clusters:
        - 4 students flagged for hesitant speaking pace (<110 WPM)
        - 3 students flagged for high filler word density ('um', 'actually')
  --> Trainer clicks: "Assign Domain Practice Drill"
  --> Selects domain: "Cloud Computing & DevOps"
  --> Enters drill instructions: "Focus on continuous speaking pace without pauses"
  --> Publishes targeted practice drill to help students calibrate before placement day
```

---

# 4. Frontend Component Directory & File Inventory

```text
frontend/src/
├── App.tsx                              # Root routing & view dispatcher
├── main.tsx                             # Application bootstrap & DOM mount
├── index.css                            # Global styles & Tailwind directives
├── context/
│   └── AppContext.tsx                   # Central state management & RBAC store
├── types/
│   └── index.ts                         # Complete TypeScript domain contracts
├── services/
│   └── api.ts                           # Speech evaluation engine & local storage
├── data/
│   └── mockData.ts                      # Demonstration & testing dataset
└── components/
    ├── common/
    │   ├── Navbar.tsx                   # Top navigation & demo role switcher
    │   ├── StudentHistoryModal.tsx      # Comprehensive student audit modal
    │   └── DeleteConfirmModal.tsx       # Destructive action confirmation modal
    ├── auth/
    │   └── AuthModal.tsx                # Role-aware login & self-registration modal
    ├── landing/
    │   └── LandingPage.tsx              # Public-facing showcase & cohort details
    ├── student/
    │   ├── StudentDashboard.tsx         # Student command hub, handles & checklist
    │   ├── MockInterviewRoom.tsx        # Proctored voice mock interview room
    │   ├── ListeningRoom.tsx            # Audio-only listening comprehension test
    │   ├── DiagnosticReportView.tsx     # Post-session performance report card
    │   ├── ResumeUploadModal.tsx        # Resume parser & skill tag extractor
    │   ├── SuggestionChatModal.tsx      # Interactive communication coach
    │   └── VoiceOrb.tsx                 # Real-time animated audio visualizer
    └── portals/
        ├── PlacementCoordinatorPortal.tsx # Campus-wide analytics & criteria manager
        ├── FacultyMentorPortal.tsx        # Mentee progress & verification portal
        ├── ProgramAdminPortal.tsx         # Track domain lead & trainer manager
        ├── TrainerPortal.tsx              # Visiting trainer domain scorecard
        └── SuperAdminPortal.tsx           # Global user & ecosystem management
```

---

# 5. Client-Side State & Storage Persistence

The platform operates as a self-contained system with persistent state maintained in browser `localStorage`:

| Storage Key | Stored Content | Used By |
| :--- | :--- | :--- |
| `auth_token` | JWT session token | `AppContext`, `api.auth` |
| `auth_user` | Current authenticated user identity & role | `Navbar`, `App.tsx` |
| `student_profile` | Active student record (resume, handles, checklist) | `StudentDashboard`, `MockInterviewRoom` |
| `student_profile_{id}` | Isolated student profiles for multi-user registration | `api.student`, `AuthModal` |
| `admin_students` | College-wide candidates roster with live scores | `PlacementCoordinatorPortal`, `FacultyMentorPortal` |
| `trainer_tenures` | Active & revoked trainer tenure schedules | `ProgramAdminPortal`, `TrainerPortal` |
| `assignments` | Scheduled practice and mock interview drills | `StudentDashboard`, `PlacementCoordinatorPortal` |

---
*End of Master Frontend Specification Document*
