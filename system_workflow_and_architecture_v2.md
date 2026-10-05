# Comprehensive System Workflow & Platform Architecture (Updated)

---

## 1. Visitor Entry & Session Verification
```
Visitor opens portal
--> System checks whether the user already has an active authenticated session
--> No active session found (Visitor is unauthenticated)
--> Landing Page loads onto the screen
--> Visitor decides to sign in and clicks the black "Sign In" button in the header
```

---

## 2. Universal Login & Candidate Self-Registration

### Visitor clicks "Sign In"
```
--> Auth Modal slides in over a dark blurred backdrop
--> User sees two top tabs: [Sign In] and [Candidate Self-Registration]
```

### OPTION A: Institutional Sign In
```
--> User enters institutional email (ex: student@college.edu or admin@college.edu)
--> User enters password
--> User clicks the black button: "Sign In"
--> Login request is sent to the backend API
--> Backend verifies the credentials against the user database
--> Role-based routing:
    - If email matches Super Admin --> Role = SUPER_ADMIN --> Mounts SuperAdminPortal
    - If email matches Department Admin --> Role = DEPARTMENT_ADMIN --> Mounts DepartmentAdminPortal
    - If email matches Program Lead --> Role = PROGRAM_ADMIN (strictly domain-scoped) --> Mounts ProgramAdminPortal
    - If email matches Coordinator --> Role = PLACEMENT_COORDINATOR --> Mounts PlacementCoordinatorPortal
    - If email matches Faculty Mentor --> Role = FACULTY_MENTOR --> Mounts FacultyMentorPortal
    - If student credentials --> Role = STUDENT --> Mounts StudentDashboard
--> Authentication session is created securely by the backend
--> Active user profile and role are available to the frontend through the authenticated session
--> Modal closes automatically
--> Top Navigation Bar mounts showing:
    - College Logo & Platform Badge
    - Active Role Badge
    - For Students: Live Coin Balance Pill [🪙 5 Coins] positioned exclusively beside the profile avatar
    - Profile Avatar & Logout trigger
```

### OPTION B: Candidate Self-Registration (Independent / External Track)
```
--> User clicks the tab: [Candidate Self-Registration]
--> Registration form appears
--> Candidate fills in:
    - Full Name: "Rahul Sharma"
    - Email Address: "rahul.s@college.edu"
    - Password: (at least 6 characters)
    - Department dropdown: "Computer Science & Engineering"
    - Batch Year: "2026"
--> Candidate clicks: "Continue to Email Verification"
--> Registration request is sent to the backend
--> Backend creates a temporary registration record
--> System generates a 6-digit confirmation code (ex: "582914")
--> Verification code is sent to candidate's email
--> Screen flips to the code verification card displaying: "Code sent to rahul.s@college.edu"
--> Candidate enters the code into the input box
--> Candidate clicks: "Verify Email & Access Dashboard"
--> Backend verifies confirmation code
--> Student profile is created in the database initialized with 5 Available Coins
--> User is automatically authenticated and routed into their personal Student Dashboard
```

---

## 3. Student Dashboard & Profile Experience

```
Student logs in and arrives on the Student Dashboard
--> Frontend requests student's profile from the backend API
--> Backend gets student data from the database
--> Top Navigation Bar shows live coin balance [🪙 5 Coins] right next to the student profile avatar
--> Top Profile Header displays clean academic identity:
    - Student Name: "Aravind Kumar"
    - Track Badge: "★ HOPE_ELITE" or "★ Independent Candidate"
    - Roll Number: "21CS1084"
    - Academic Path: "Computer Science & Engineering · Batch of 2026 · Primary Track: Hope"
    - Action buttons on the right: [View Resume Dossier] and [View Latest Scorecard]
    (Coins are not shown inside this welcome card; kept exclusively in top navbar)
--> Stat Strip below loads four live metrics:
    1. LeetCode Solved Count: 184 / 300 Target
    2. GitHub Repositories: 12 Repos
    3. Mentor Verified Tasks: 4 / 5 Verified
    4. Overall Readiness Progress: 80% Complete
--> Zero Credits Alert Policy (Only appears if balance hits 0 Coins):
    - Independent Candidates: Displays 72-hour live regeneration countdown [⏳ 3-Day Waiting Period Active]
    - Institutional Students: Displays institutional alert: "Only Super Admin can restore all 5 credits for you"
```

### SUB-FLOW: Editing Coding Handles
```
--> Student clicks the pencil icon on the LeetCode or GitHub card
--> "Update Coding Profiles" modal opens
--> Student updates their LeetCode username and solved count: 184 --> 195
--> Student updates their GitHub username and repository count: 12 --> 14
--> Optional: Student can link other competitive coding platforms (Codeforces, HackerRank, CodeChef)
--> Student clicks "Save Profiles"
--> Frontend sends updated information to the backend API
--> Backend validates request and updates the student record in database
--> Dashboard fetches updated values and displays them immediately
--> Updated values are simultaneously accessible to Placement Coordinator and Faculty Mentor
--> Modal closes
```

### SUB-FLOW: Toggling Placement Criteria Checklist Tasks
```
--> Student views the "Placement Criteria Checklist" section:
    [x] Solve 50 LeetCode Medium Questions (Verified by Mentor ✓)
    [x] Resume Review & Verification (Verified by Mentor ✓)
    [ ] Attend 3 Full Proctored Mock Interviews (Unfinished)
    [ ] Complete AWS Cloud Practitioner Certification (Unfinished)
    [x] Deploy Internal Project with Live URL (Pending Mentor Verification)
--> Student clicks an unfinished checklist item
--> Frontend sends task update to the backend
--> Backend updates task status in the database
--> Checkbox turns into a green checkmark
--> Progress bar increments from 60% --> 80%
--> Status badge updates to: "Awaiting Mentor Verification"
--> Task state is stored in database so Faculty Mentor can inspect and verify it
```

### SUB-FLOW: Resume Grounding & Verification
```
--> Student clicks the "Upload Resume" / "View Resume Dossier" button on dashboard
--> "Upload Resume & Grounding" modal opens
--> Student can either drag & drop a PDF resume or paste raw resume text
--> Resume data is uploaded to the backend
--> Backend processes resume content with client/server parser:
    - Extracts Programming Languages: [Java, SQL, TypeScript]
    - Extracts Frameworks: [Spring Boot, React, Kafka, Docker]
    - Extracts Projects: "Distributed Payment Settlement Engine"
--> Parsed data is saved to student's profile in the database
--> Dashboard updates to show: "Active Resume Grounding: Verified & Active ✓"
--> AI Interview Engine uses the grounded resume data when formulating technical questions
```

---

## 4. Fullscreen Proctored Mock Interview & Credit System

```
Student clicks: "Launch Mock Interview" (Cost: 1 Coin)
--> System checks student coin balance:
    - If coins < 1: Action blocked; alert displays "Insufficient Coins (0 Coins - Balance Required)"
    - If coins >= 1: Session begins; 1 Coin is deducted
--> System switches active view to 'INTERVIEW_ROOM'
--> Browser enters Fullscreen Mode automatically
--> Browser prompts: "Allow application to use your microphone?"
--> Student clicks "Allow"
--> Proctoring system initializes:
    - Fullscreen lock engaged (monitors fullscreen exit events)
    - Tab switch & window blur listeners actively attached
    - Proctor status pill shows: "Proctor Active · Tab Switches: 0 / 4"
--> Center of screen renders 3D animated "Voice Orb"
--> Frontend loads student's grounded resume and chosen track
--> AI Interview Engine prepares Question 1 (EASY difficulty)
--> Voice Orb pulses in blue 'SPEAKING' mode
--> Browser Speech Synthesis speaks Question 1 aloud; live transcript box renders text
--> Narration finishes --> 300ms pause --> Microphone automatically opens
--> Voice Orb transitions into glowing green 'LISTENING TO YOU...' mode
--> Real-time audio waveform pulses with the volume of student's voice
--> Web Speech Recognition transcribes spoken words in real time
--> If student pauses for 3 seconds: Auto-submit countdown pill appears (3... 2... 1...)
--> Student can also click "Done Speaking / Submit Answer" manually
```

### STRICT PROCTORING & DISQUALIFICATION RULE (4 Tab Switches)
```
During the interview, student attempts to switch tabs or minimize the browser window:
--> 'visibilitychange' or 'blur' event fires instantly
--> Proctoring counter increments: tabSwitches = tabSwitches + 1
--> Real-time warning modal & banner alerts the student:
    - Switch 1: "⚠️ Level 1 Warning: Tab switch detected (1 / 4). Stay focused on this proctored drill."
    - Switch 2: "⚠️ Level 2 Warning: Tab switch detected (2 / 4). Next violations lead to immediate termination."
    - Switch 3: "⚠️ Critical Warning: Tab switch detected (3 / 4). One more switch permanently ends this drill."
--> If student switches tabs for the 4th time:
    - Session is IMMEDIATELY TERMINATED
    - Student is DISQUALIFIED
    - Interview Room locks and closes immediately
    - Spent coin is NOT restored (coin permanently deducted)
    - Student is PERMANENTLY BARRED from re-entering or retrying that specific interview session
    - Permanent disqualification flag is logged to candidate's history
```

### Normal Interview Progression (Turns 1 to 3)
```
Student submits answer for Turn 1 legitimately
--> Microphone mutes immediately to eliminate acoustic echo
--> Voice Orb glows in amber 'THINKING & EVALUATING...' mode
--> Speech Analysis Engine executes in the backend:
    1. Word count & Words Per Minute (WPM)
    2. Filler word density scanning ("uh", "um", "basically")
    3. Technical keyword extraction & depth scoring
    4. Delivery & clarity computation
--> Turn feedback drawer summarizes instant metrics
--> AI Interviewer formulates Question 2 (MEDIUM difficulty) adapted to Turn 1 response
--> Student answers Turn 2 --> Analyzed by engine
--> AI Interviewer formulates Question 3 (ADVANCED difficulty)
--> Student answers Turn 3 --> Analyzed by engine
--> Turn 3 completes --> Interview finishes legitimately
--> System RESTORES the 1 spent coin (up to the maximum cap of 5 Coins)
--> Final evaluation data stored in database
--> Screen transitions to Diagnostic Scorecard view
```

---

## 5. Diagnostic Scorecard & Performance Analytics

```
Interview finishes legitimately
--> Backend calculates final weighted score:
    Final Score = (TechnicalAverage * 0.70) + (CommunicationAverage * 0.30)
--> Diagnostic Scorecard screen loads:
    - Overall Score: 86 / 100 [Placement Ready ✓]
    - Technical Depth: 88%
    - Clarity & Delivery: 83%
    - Proctoring Status: Clean Audit (0 / 4 Tab Switches)
--> Speaking Pace Meter highlights:
    - Recorded Rate: 134 Words Per Minute (optimal 120–150 target band)
    - Verbal verdict: "Cadence is within optimal conversational range."
--> Filler Word Density card displays:
    - "uh" x1, "basically" x1 (Low Density)
--> Technical Skill Matrix: 4 dynamic competencies mapped to resume
--> Actionable Next Steps: Bulleted improvements generated by AI coach
--> Student clicks "Back to Student Dashboard"
--> Scorecard (86/100) displays in student's recent assessment reports
```

---

## 6. Listening Comprehension Room

```
Student clicks: "Start Listening" (Cost: 1 Coin)
--> System verifies coin balance (must be >= 1)
--> Active view switches to 'LISTENING_ROOM'
--> Modern CustomSelect dropdown loads real-world technical passages:
    1. FinPay Systems: Real-Time Payment Settlement Gateway (FinTech)
    2. CloudScale: Kubernetes Microservices & API Gateway (Cloud/DevOps)
    3. NeuroData AI: Feature Store & Model Inference (AI/ML)
    4. CyberShield: Zero-Trust Identity Federation (Cybersecurity)
--> Replay counter shows: "Replays Used: 0 / 2"
--> Student clicks: "Play Briefing Passage Aloud"
--> Speech Synthesis narrates passage with animated audio waveform (no text transcript)
--> Question 1 appears --> Student clicks "Record Verbal Answer"
--> Student records answers for Questions 1, 2, and 3 verbally
--> Student clicks: "Submit All & Generate Scorecard"
--> Evaluation engine scores comprehension against passage constraints
--> 1 Coin restored upon legitimate completion (capped at 5)
--> Listening Diagnostic Report generated and displayed
```

---

## 7. Placement Coordinator Portal

```
Placement Coordinator logs in (coord@college.edu)
--> Macro College Intelligence Dashboard loads:
    - Total Candidates Tracked: 240 Students
    - HOPE Elite Coders: 42 Students
    - PEP Specialized Domains: 97 Students across 21 Tracks
    - Placement Ready Rate: 78% of students scoring >= 75
--> Filter Tabs & Search:
    - Filter by track or batch year (e.g., Batch 2026, 2028)
    - Search candidate by Name, Roll Number, or Batch Year
--> Candidate table shows readiness metric, completed drills, and live coins
--> Coordinator clicks: "Export Senate CSV Report" --> Downloads college_placement_readiness.csv
--> Coordinator clicks: "Assign College Mock Interview"
--> Assignment modal dispatches practice drills across target cohorts
```

---

## 8. Faculty Mentor Portal

```
Faculty Mentor logs in (mentor@college.edu)
--> Faculty Mentor Portal displays assigned roster of mentees
--> Mentor sees pending verification requests from students
--> Mentor clicks on student row:
    - Opens Student History Modal
    - Reviews past interview scores, pacing (WPM), filler density, proctoring logs
    - Inspects submitted GitHub repository or certification proof
--> Mentor clicks "Verify Task" toggle button
--> Task status updates to "Verified by Mentor ✓"
--> Student dashboard updates to 5/5 verified tasks
```

---

## 9. Program Admin Portal (Strictly Scoped by Program Domain)

```
Program Admin logs in (program@college.edu or hope@college.edu)
--> Program Admin Portal loads strictly scoped to their assigned program (e.g. HOPE):
    - NO access or permissions to modify college departments
    - NO permission to reassign admins to other programs
    - Visiting Trainer module completely removed (no trainer onboarding/revoking)
--> Student Roster & College-Wide Search:
    - Program Admin adds students to the program by searching across college departments
    - Search input supports Name, Roll Number, and Batch Year
    - Because student already exists in an academic department, Program Admin simply links
      them into the program domain without re-typing their department/credentials
--> Assignment Management:
    - Assign practice assessments scoped to program domain cohorts
    - Assignments table displays FORMAT, ASSIGNMENT TITLE, TARGET COHORT, ASSIGNED BY, SUBMISSIONS, DUE DATE
    - POLICY column and Mandatory badge removed for clean workflow
--> Student Card Click:
    - Clicking on any student opens the dedicated StudentManagementDashboardModal
    - Shows student details, tracks, readiness metrics, and 1-click coin restoration
```

---

## 10. Super Admin Portal (Global Governance & Batch Lifecycle)

```
Super Admin logs in (superadmin@college.edu)
--> Full institutional command center loads:
1. Department Bulk Creation via CSV:
   - Dedicated modal to bulk create departments and assign department admins via CSV upload
   - Restricted strictly to departments (not programs)
2. Batch Year Management & Bulk Purge:
   - Every student addition / import requires a Batch Year (e.g., 2028)
   - When a batch graduates from college, Super Admin can completely remove/purge that batch
   - All student searches across the system include Batch Year
3. Program Creation with Template Duplication ("Copy Hope"):
   - When creating a new program, option to clone an existing program (e.g. copy "Hope")
   - Automatically replicates tracks, structure, permissions, and enrolled student schema
4. Dedicated Student Management Dashboard Modal:
   - Clicking any student in the directory opens StudentManagementDashboardModal
   - Does NOT hijack or redirect to the full student portal
   - Super Admin can inspect analytics, edit student details, and 1-click Restore 5 Credits
5. UI Cleanups:
   - Redundant "Required" text removed from modal forms, replaced with standard red asterisks (*)
```

---

## 11. Department Admin Portal (Department & Class Leadership)

```
Department Admin logs in (admin.it@college.edu or dept@college.edu)
--> Department Admin Portal loads:
    - Scoped strictly to their assigned academic department (e.g., IT, CSE)
    - Manage department classes & counsellor assignments via DepartmentClassesManager
    - Bulk create classes (e.g., CSE-A, CSE-B, IT-Cloud)
    - Bulk assign faculty counsellors/mentors to specific classes
    - Search and manage department student roster filtered by Batch Year (2025, 2026, 2027, 2028)
```

---

## 12. Complete Component Map

| Component | Responsibility / Description |
| :--- | :--- |
| **`App.tsx`** | Root application routing, modal manager, and top-level view dispatcher |
| **`main.tsx`** | Application bootstrap & DOM root mount |
| **`index.css`** | Global Tailwind CSS directives & custom design system tokens |
| **`AppContext.tsx`** | Central state management, RBAC store, coin economy & proctoring state |
| **`types/index.ts`** | Complete TypeScript contracts, RBAC roles, student models & metrics |
| **`services/api.ts`** | AI evaluation engine, storage layer, mock data & proctoring calculators |
| **`Navbar.tsx`** | Global header with college branding, role switcher, profile trigger & `[🪙 5 Coins]` pill |
| **`AuthModal.tsx`** | Role-aware institutional login & candidate self-registration modal |
| **`LandingPage.tsx`** | Public landing page, program feature highlights & quick portal entry |
| **`StudentDashboard.tsx`** | Student command center, handles, checklist, zero-coin alert & room launch buttons |
| **`MockInterviewRoom.tsx`** | Fullscreen proctored room, Voice Orb, Web Speech AI, 4-tab termination & coin deduction |
| **`ListeningRoom.tsx`** | Audio-only listening comprehension test, passage player & verbal question recorder |
| **`DiagnosticReportView.tsx`** | Post-interview diagnostic scorecard, WPM cadence meter & filler word breakdown |
| **`ResumeUploadModal.tsx`** | Resume PDF/text uploader, client-side skill parser & interview grounding extractor |
| **`SuggestionChatModal.tsx`** | AI conversational interview coach for personalized question debriefing |
| **`VoiceOrb.tsx`** | 3D real-time animated audio visualizer with Speaking, Listening, and Evaluating states |
| **`StudentManagementDashboardModal.tsx`** | Standalone student dashboard modal with details, edit capabilities & Super Admin 1-click 5 coin restore |
| **`StudentDirectoryTable.tsx`** | Reusable student directory table with score filters, batch year tags & coin indicators |
| **`DepartmentClassesManager.tsx`** | Department class creator and bulk counsellor assignment manager |
| **`AssessmentMonitoringWidget.tsx`** | Cohort assignment monitoring hub & submission inspection tool |
| **`CustomSelect.tsx`** | Reusable modern select component with popovers, checkmarks & badge support |
| **`DatePicker.tsx` / `TimePicker.tsx`** | Modern scheduling pickers for assignment date & time windows |
| **`AutoDismissAlert.tsx`** | Self-dismissing toast notifications for feedback & status updates |
| **`PlacementCoordinatorPortal.tsx`** | Macro campus-wide analytics, cohort filters, CSV senate reports & assignment creator |
| **`FacultyMentorPortal.tsx`** | Mentee progress dashboard, student inspection modal & checklist verification |
| **`ProgramAdminPortal.tsx`** | Strictly domain-scoped program lead hub, college student search & assessment manager |
| **`DepartmentAdminPortal.tsx`** | Departmental admin portal for classes, counsellors & student rosters |
| **`SuperAdminPortal.tsx`** | Institutional governance, department CSV bulk creation, batch year purge & program cloner |
