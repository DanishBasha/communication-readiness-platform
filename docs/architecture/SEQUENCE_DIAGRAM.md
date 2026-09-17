# End-to-End Sequence Diagram — AI Assessment & Evaluation Lifecycle

This diagram illustrates the chronological interaction flow between the student, the client SPA, the Node.js modular monolith services, the FastAPI AI intelligence engine, external providers, and the PostgreSQL persistence layer.

---

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant SPA as React Web App
    participant API as Node.js API (Express)
    participant Auth as AuthorizationService
    participant AssSvc as AssessmentService
    participant IntSvc as InterviewService
    participant CtxMgr as ContextManager
    participant QGen as QuestionGenerationService
    participant FastAI as FastAPI AI Service
    participant Speech as SpeechProvider (STT)
    participant Comm as CommunicationAnalyzer
    participant KB as KnowledgeProvider (pgvector)
    participant Web as WebSearchProvider
    participant LLM as LLMProvider
    participant Score as ScoringService
    participant RepSvc as ReportService
    participant DB as PostgreSQL (System of Record)

    %% ---------------------------------------------------------
    %% 1. AUTHENTICATION & ATTEMPT INITIALIZATION
    %% ---------------------------------------------------------
    rect rgb(240, 248, 255)
    note over Student, Auth: Phase 1: Authentication & Assessment Initialization
    Student->>SPA: Click "Start AI Technical Interview"
    SPA->>API: POST /api/assessments/:id/start (Bearer JWT)
    API->>Auth: authorize(user, "assessment:attempt", scope)
    Auth-->>API: 200 OK (Authorized)
    API->>AssSvc: startAttempt(studentId, assessmentId)
    AssSvc->>DB: Check student credit balance & deduct credit (CreditService)
    DB-->>AssSvc: Credit deducted (Balance valid)
    AssSvc->>DB: INSERT AssessmentAttempt (Status: IN_PROGRESS)
    DB-->>AssSvc: attemptId
    AssSvc->>IntSvc: initiateSession(attemptId, ADAPTIVE_TECHNICAL)
    IntSvc->>DB: INSERT InterviewSession (Difficulty: EASY, Status: ACTIVE)
    DB-->>IntSvc: sessionId
    end

    %% ---------------------------------------------------------
    %% 2. CONTEXTUAL QUESTION GENERATION
    %% ---------------------------------------------------------
    rect rgb(254, 249, 195)
    note over IntSvc, LLM: Phase 2: Dynamic & Context-Aware Question Generation
    IntSvc->>CtxMgr: getStudentContext(studentId)
    CtxMgr->>DB: SELECT Resume, Domain, TargetSkills
    DB-->>CtxMgr: Resume parsedText & Student profile
    CtxMgr-->>IntSvc: Student Domain Context
    IntSvc->>QGen: generateQuestion(domain, difficulty=EASY, resumeContext)
    QGen->>KB: retrieveSemanticContext(domainSkillQuery, topK=3)
    KB->>DB: SELECT * FROM embeddings WHERE cosine_distance < threshold
    alt KB Coverage Sufficient
        DB-->>KB: Technical Concept Context Documents
    else KB Sparse
        KB->>Web: search(technicalSkillQuery)
        Web-->>KB: External Reference Snippets
    end
    KB-->>QGen: Retrieved Technical Context
    QGen->>LLM: generateQuestion(prompt, context, difficulty)
    LLM-->>QGen: Generated Question Text
    QGen->>DB: INSERT Question (text, difficulty, sessionId)
    DB-->>QGen: questionId
    QGen-->>IntSvc: Question Object
    IntSvc-->>API: Question Payload
    API-->>SPA: 200 OK { sessionId, questionId, questionText }
    SPA-->>Student: Display Question & Prompt Microphone
    end

    %% ---------------------------------------------------------
    %% 3. STUDENT VOICE RESPONSE & AI SPEECH PROCESSING
    %% ---------------------------------------------------------
    rect rgb(240, 253, 244)
    note over Student, FastAI: Phase 3: Speech Capture & Transient Audio Analysis
    Student->>SPA: Speaks Voice Answer (Microphone stream)
    SPA->>API: Stream Audio Chunks (WebSocket / Multipart)
    API->>FastAI: Forward transient audio stream
    FastAI->>Speech: Transcribe audio stream (STT)
    Speech-->>FastAI: Raw transcript & word timestamps
    FastAI->>Comm: extractAudioMetrics(audioStream, transcript)
    note over Comm: Computes Fluency, Clarity, Pace (WPM), Pitch modulation
    Comm-->>FastAI: CommunicationMetrics (Pace: 135 WPM, Fluency: 8.8/10, etc.)
    note over FastAI: Audio buffer discarded from RAM (Transient privacy guarantee)
    end

    %% ---------------------------------------------------------
    %% 4. SINGLE-PASS LLM EVALUATION
    %% ---------------------------------------------------------
    rect rgb(253, 242, 248)
    note over FastAI, Score: Phase 4: Single-Pass Evaluation & Deterministic Difficulty
    FastAI->>LLM: evaluateStructured(question, transcript, technicalContext, rubric)
    note over LLM: Single-pass evaluates technical correctness, depth, reasoning, misconceptions, and evidence
    LLM-->>FastAI: Structured Evaluation JSON (Technical Score: 85, Strengths, Gaps)
    FastAI-->>API: Combined AI Result { transcript, evalResult, commAnalysis }
    API->>DB: INSERT Response (transcript, mode=VOICE)
    API->>DB: INSERT EvaluationResult (score, feedback, strengths, gaps)
    API->>DB: INSERT CommunicationAnalysis (fluency, clarity, pace, pitch)

    API->>IntSvc: handleAnswerSubmitted(sessionId, currentQuestionScore)
    note over IntSvc: Deterministic state engine adjusts difficulty (e.g. Score > 80 -> MEDIUM)
    IntSvc->>DB: UPDATE InterviewSession (currentDifficulty = MEDIUM)
    end

    %% ---------------------------------------------------------
    %% 5. REPORT COMPILATION & PERFORMANCE UPDATE
    %% ---------------------------------------------------------
    rect rgb(250, 245, 255)
    note over IntSvc, Student: Phase 5: Final Scoring, Immutable Report & Dashboards
    note over IntSvc: Loop continues for all assessment questions. Once complete:
    IntSvc->>AssSvc: finalizeAttempt(attemptId)
    AssSvc->>Score: calculateAggregate(evaluations, componentWeights)
    note over Score: Deterministic formula: 90% Technical + 10% Communication
    Score-->>AssSvc: Final Scores (Technical: 88, Communication: 82, Overall: 87.4)
    AssSvc->>RepSvc: generateReport(attemptId, finalScores)
    RepSvc->>DB: INSERT AssessmentReport (Immutable point-in-time snapshot)
    RepSvc->>DB: UPDATE PerformanceProfile (Aggregated state)
    RepSvc->>DB: INSERT PerformanceSnapshot (Historical progression log)
    AssSvc->>DB: Check performance credit eligibility (Earn bonus credits if score >= threshold)
    AssSvc-->>API: Assessment Complete { reportId, overallScore, feedback }
    API-->>SPA: 200 OK Complete
    SPA-->>Student: Display Assessment Report & Learning Recommendations
    end
```
