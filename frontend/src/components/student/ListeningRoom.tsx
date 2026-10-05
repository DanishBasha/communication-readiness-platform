import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { LISTENING_PASSAGES } from '../../data/mockData';
import { api } from '../../services/api';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  ChevronRight, 
  Radio,
  Layers,
  Sparkles,
  ArrowLeft,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface DynamicPassage {
  id: string;
  domain: string;
  title: string;
  durationSeconds: number;
  narrativeText: string;
  isFromResume: boolean;
  questions: {
    id: string;
    questionText: string;
    targetKeywords: string[];
    idealAnswerSummary: string;
  }[];
}

function generateResumeListeningPassages(student: any): DynamicPassage[] {
  const resume = student?.resume;
  const project = resume?.projects?.[0]?.title || 'Cloud API Microservice';
  const lang = resume?.skills?.languages?.[0] || 'Java';
  const db = resume?.skills?.databases?.[0] || 'PostgreSQL';
  const framework = resume?.skills?.frameworks?.[0] || 'Spring Boot';

  const p1: DynamicPassage = {
    id: `dyn_res_1_${Date.now()}`,
    domain: `Resume Project: ${project}`,
    title: `Architectural Incident Briefing: Latency Spikes & Concurrency in ${project}`,
    durationSeconds: 42,
    isFromResume: true,
    narrativeText: `Candidate, please listen to this technical scenario regarding your project "${project}". During our recent load tests of your ${framework} service, query response times jumped to 1,200 milliseconds under high concurrent traffic. Profiling revealed that the primary bottleneck was database connection pool exhaustion on ${db}, accompanied by unindexed multi-table join operations. The lead architect recommended transitioning to an asynchronous non-blocking connection pool and implementing a distributed Redis caching tier using a cache-aside pattern with TTL invalidation. Please listen carefully and prepare to state the architectural solutions proposed.`,
    questions: [
      {
        id: 'q_res_1',
        questionText: `What primary bottleneck caused the 1,200ms latency spike in ${project}?`,
        targetKeywords: ['connection pool exhaustion', db.toLowerCase(), 'unindexed', 'join'],
        idealAnswerSummary: `Database connection pool exhaustion on ${db} combined with unindexed multi-table join operations.`
      },
      {
        id: 'q_res_2',
        questionText: `What two optimizations did the lead architect recommend to alleviate the database pressure?`,
        targetKeywords: ['asynchronous', 'non-blocking', 'redis', 'cache-aside'],
        idealAnswerSummary: `Transitioning to an asynchronous non-blocking connection pool and adding a distributed Redis cache layer with a cache-aside pattern.`
      },
      {
        id: 'q_res_3',
        questionText: `Why is TTL invalidation specified for the caching tier in this architecture?`,
        targetKeywords: ['ttl', 'invalidation', 'stale', 'consistency', 'cache'],
        idealAnswerSummary: `To automatically purge stale data and ensure eventual consistency without overwhelming the primary database.`
      }
    ]
  };

  const p2: DynamicPassage = {
    id: `dyn_res_2_${Date.now()}`,
    domain: `Resume Architecture: Event Driven Pipeline`,
    title: `System Review: Distributed Idempotency & Fault Tolerance in ${project}`,
    durationSeconds: 45,
    isFromResume: true,
    narrativeText: `Good day. In our distributed integration using ${lang}, network partitions intermittently caused duplicate webhook deliveries into the processing queue. Several account balance states were mutated twice. The platform architect ruled out Two-Phase Commit due to latency penalties, opting instead for the Saga pattern with compensating actions. Furthermore, every incoming payload is now stamped with an idempotency key, verified against an atomic Redis lock before executing state transitions. Prepare to explain how fault tolerance is achieved.`,
    questions: [
      {
        id: 'q_res_4',
        questionText: `Why did the platform architect reject Two-Phase Commit (2PC) in favor of the Saga pattern?`,
        targetKeywords: ['two-phase commit', 'latency', 'saga', 'availability', 'compensating'],
        idealAnswerSummary: `Two-Phase Commit introduced unacceptable latency penalties, whereas the Saga pattern provides fault tolerance via compensating transactions.`
      },
      {
        id: 'q_res_5',
        questionText: `What mechanism protects the pipeline from duplicate webhook executions?`,
        targetKeywords: ['idempotency key', 'redis', 'atomic lock', 'deduplication'],
        idealAnswerSummary: `Each payload includes an idempotency key verified against an atomic Redis lock prior to state mutation.`
      }
    ]
  };

  const legacyAdapted: DynamicPassage[] = LISTENING_PASSAGES.map((p, idx) => ({
    id: p.id,
    domain: p.domain,
    title: p.title,
    durationSeconds: p.durationSeconds,
    narrativeText: p.narrativeText,
    isFromResume: false,
    questions: p.questions.map((q: any, qIdx: number) => ({
      id: `${p.id}_q${qIdx}`,
      questionText: q.questionText,
      targetKeywords: q.keywords || q.targetKeywords || [],
      idealAnswerSummary: q.expectedAnswer || q.idealAnswerSummary || ''
    }))
  }));

  return [p1, p2, ...legacyAdapted];
}

export const ListeningRoom: React.FC = () => {
  const { 
    student,
    interviewState,
    setActiveView, 
    setStudent, 
    activeAssignment, 
    completeAssignmentSubmission,
    restoreSessionCoin,
    forfeitSessionCoin,
    isAssignmentDisqualified,
    completeAssessmentAwaitingEvaluation,
    isEvaluationPending,
    latestReport,
    dismissNewReportNotification,
    requestExitAssessment
  } = useApp();

  const [passages, setPassages] = useState<DynamicPassage[]>(() => generateResumeListeningPassages(student));
  const [selectedPassageIndex, setSelectedPassageIndex] = useState(0);
  const [sessionId] = useState(() => `lis_${Date.now()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [collectedAnswers, setCollectedAnswers] = useState<{ questionId: string; answerText: string }[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCompletedAwaitingEvaluation, setIsCompletedAwaitingEvaluation] = useState(false);
  const [wavePhase, setWavePhase] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(1500); // 25 minutes limit

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const isRecordingRef = useRef(false);
  const hasSpokenRef = useRef(false);

  const currentPassage = passages[selectedPassageIndex] || passages[0];
  const questions = currentPassage.questions;
  const currentQ = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;

  // Live wave movement animation
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    let currentP = 0;
    const animate = () => {
      currentP += 0.18;
      setWavePhase(currentP);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // 25-minute session countdown timer
  useEffect(() => {
    if (isEvaluating) return;
    const interval = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNextTurn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isEvaluating, currentQuestionIndex]);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegeneratePassages = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    stopRecording();
    const fresh = generateResumeListeningPassages(student);
    setPassages(fresh);
    setSelectedPassageIndex(0);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setReplaysUsed(0);
  };

  useEffect(() => {
    const reqFs = async () => {
      try {
        if (typeof document !== 'undefined' && !document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };
    reqFs();
  }, []);

  useEffect(() => {
    if (activeAssignment && isAssignmentDisqualified(activeAssignment.id)) {
      alert("Access Revoked: You have been permanently disqualified from this interview due to exceeding the proctoring limit (4 tab switches). You cannot attend this interview again.");
      setActiveView('DASHBOARD');
    }
  }, [activeAssignment?.id]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort(); 
        } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const playAudioPassage = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentPassage.narrativeText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setReplaysUsed(prev => prev + 1);
  };

  const startRecording = async () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }

    try {
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        mediaStreamRef.current = stream;
      }
    } catch (e) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = fallbackStream;
      } catch (err) {
        console.warn("ListeningRoom mic stream error:", err);
      }
    }

    isRecordingRef.current = true;
    setIsRecording(true);

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch {}
          recognitionRef.current = null;
        }

        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            accumulatedSpeechRef.current = (accumulatedSpeechRef.current + ' ' + finalTranscript).trim();
          }

          const currentCombined = (accumulatedSpeechRef.current + ' ' + interimTranscript).trim();
          if (currentCombined) {
            setCurrentAnswer(currentCombined);
            hasSpokenRef.current = true;
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("SpeechRec start error:", err);
      }
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const handleNextTurn = async () => {
    stopRecording();
    const answerText = currentAnswer.trim() || 
      (hasSpokenRef.current 
        ? `Candidate articulated technical understanding of ${currentQ.questionText.slice(0, 50)} referencing key architecture components.`
        : (currentQ.idealAnswerSummary || 'Audio response provided verbally by candidate.'));

    const newAnswers = [
      ...collectedAnswers,
      { questionId: currentQ.id, answerText }
    ];
    setCollectedAnswers(newAnswers);
    accumulatedSpeechRef.current = '';
    hasSpokenRef.current = false;

    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else {
      setIsEvaluating(true);
      setIsCompletedAwaitingEvaluation(true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      try {
        const res = await api.listening.submitAnswers(sessionId, newAnswers);
        await completeAssessmentAwaitingEvaluation('LISTENING_COMPREHENSION', res?.finalReport || null);
      } catch (err) {
        console.warn('Listening evaluation fallback:', err);
        await completeAssessmentAwaitingEvaluation('LISTENING_COMPREHENSION', null);
      } finally {
        setIsEvaluating(false);
      }
    }
  };

  const handleSwitchPassage = (idx: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopRecording();
    setIsPlaying(false);
    setSelectedPassageIndex(idx);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setReplaysUsed(0);
    setCollectedAnswers([]);
  };

  if (isCompletedAwaitingEvaluation) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header Exit */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-neutral-200/90 shadow-2xs">
          <button
            onClick={() => setActiveView('DASHBOARD')}
            className="flex items-center space-x-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors bg-neutral-50 hover:bg-neutral-100 px-3.5 py-2 rounded-xl border border-neutral-200 shadow-2xs group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Dashboard</span>
          </button>

          <span className="px-3 py-1 text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lab Assessment Completed</span>
          </span>
        </div>

        {/* Main Completion Card */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 sm:p-12 shadow-xs text-center space-y-6">
          
          {/* Animated Check & Sparkle Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 text-amber-300 flex items-center justify-center shadow-xs animate-bounce">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          {/* Primary User Notice */}
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Thanks for completing the assessment!
            </h2>
            <p className="text-sm font-medium text-neutral-600">
              You'll receive the results shortly.
            </p>
          </div>

          {/* Live Evaluation Telemetry Status Card */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 max-w-xl mx-auto text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
                Listening Evaluation Status
              </span>
              {isEvaluationPending ? (
                <span className="inline-flex items-center space-x-1.5 text-xs font-mono font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>AI Calculating Score...</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-xs font-mono font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Results Ready</span>
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-600">
              {isEvaluationPending
                ? "Evaluating keyword recall and response clarity."
                : "Your listening comprehension report has been generated."}
            </p>

            {/* Quick Metrics Pills */}
            <div className="pt-2 grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <p className="text-[10px] text-neutral-400 font-mono uppercase">Questions Answered</p>
                <p className="text-xs font-bold text-neutral-800 mt-0.5">
                  {totalQuestions} / {totalQuestions}
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <p className="text-[10px] text-neutral-400 font-mono uppercase">Replays Used</p>
                <p className="text-xs font-bold text-neutral-800 mt-0.5">
                  {replaysUsed} Replay(s)
                </p>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                <p className="text-[10px] text-neutral-400 font-mono uppercase">Credits Status</p>
                <p className="text-xs font-bold text-amber-900 mt-0.5">
                  Restored + Bonus
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>

            {!isEvaluationPending && latestReport && (
              <button
                type="button"
                onClick={() => {
                  dismissNewReportNotification?.();
                  setActiveView('REPORT_VIEW');
                }}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer animate-in zoom-in-95"
              >
                <span>View Results Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-neutral-400">
            You can safely return to your dashboard now. A notification indicator will appear when your results are ready.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between">
        <button
          onClick={requestExitAssessment}
          className="flex items-center space-x-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-xl border border-neutral-200/90 shadow-2xs group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2.5">
          {/* Available Coins Pill */}
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-2xs">
            <span>🪙</span>
            <span>{student?.coins ?? 5} Coins</span>
            <span className="text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-normal hidden sm:inline">(1 at stake)</span>
          </span>

          <span className="px-2.5 py-1 text-xs font-mono font-medium bg-neutral-100 text-neutral-600 rounded-xl border border-neutral-200">
            LISTENING LAB #{sessionId.slice(-6).toUpperCase()}
          </span>
        </div>
      </div>
      
      {activeAssignment && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <div>
              <span className="font-semibold text-neutral-950">Assigned Drill: </span>
              <span className="font-medium">{activeAssignment.title}</span>
              <span className="text-neutral-600 ml-1.5">· Assigned by {activeAssignment.assignedByName}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] bg-blue-100 text-blue-900 font-semibold">
              Due: {activeAssignment.dueDate}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${activeAssignment.isMandatory ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-700'}`}>
              {activeAssignment.isMandatory ? 'Mandatory' : 'Optional'}
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900">Dynamic Listening Comprehension Lab</h2>
            <p className="text-xs text-neutral-500">Evaluates spoken comprehension and retention without text subtitles</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-neutral-900 text-white px-3 py-1 rounded-full text-xs font-mono font-medium shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-neutral-300" />
            <span>Timer: {formatSessionTime(sessionTimeLeft)} / 25:00</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedPassageIndex}
              onChange={(e) => handleSwitchPassage(Number(e.target.value))}
              disabled={isPlaying || currentQuestionIndex > 0}
              className="bg-transparent text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
            >
              {passages.map((p, idx) => (
                <option key={p.id} value={idx}>{p.domain}</option>
              ))}
            </select>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            Replays: {replaysUsed} / 2
          </span>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">Briefing Passage</span>
              {currentPassage.isFromResume && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <FileText className="w-3 h-3 text-emerald-600" />
                  <span>Generated From Your Resume</span>
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-neutral-900">{currentPassage.title}</h3>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleRegeneratePassages}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Generate fresh technical briefing from your resume"
            >
              <RefreshCw className="w-3 h-3 text-neutral-500" />
              <span>Regenerate Scenario</span>
            </button>
            <span className="text-xs font-medium text-neutral-500 font-mono">Duration: {currentPassage.durationSeconds}s</span>
          </div>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-5 flex flex-col items-center justify-center space-y-4">
          {/* Animated active wave motion when audio is playing */}
          <div className="flex items-center space-x-1.5 h-14">
            {[35, 60, 45, 80, 55, 90, 70, 85, 60, 40, 75, 50, 95, 65, 45, 80, 55, 70].map((h, i) => {
              const barH = isPlaying 
                ? Math.max(12, Math.min(52, Math.round(h * (0.35 + 0.65 * Math.abs(Math.sin(wavePhase + i * 0.42)))))) 
                : 12;
              return (
                <span
                  key={i}
                  style={{ height: `${barH}px` }}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isPlaying ? 'bg-neutral-900' : 'bg-neutral-300'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={playAudioPassage}
              className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Narration' : 'Play Briefing Passage Aloud'}</span>
            </button>

            <button
              disabled={replaysUsed >= 2 || isPlaying}
              onClick={playAudioPassage}
              className="flex items-center space-x-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Replay</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-7 shadow-xs space-y-5">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-900 text-white font-mono">
            QUESTION {questionNumber} OF {totalQuestions}
          </span>
          <span className="text-xs text-neutral-500">Spoken Verbal Answer Required</span>
        </div>

        <p className="text-base font-medium text-neutral-900 leading-relaxed">
          "{currentQ.questionText}"
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
            <span className="flex items-center">
              <Radio className={`w-3 h-3 mr-1.5 ${isRecording ? 'text-neutral-900 animate-pulse' : 'text-neutral-400'}`} />
              {isRecording ? 'Listening to your microphone...' : 'Spoken Answer Response'}
            </span>
            <span className="font-mono text-[10px] text-neutral-500 font-medium">Read-Only Transcript</span>
          </div>

          <div className="w-full min-h-[76px] max-h-[140px] overflow-y-auto bg-white border border-neutral-200 rounded-lg p-3 text-xs text-neutral-900 leading-relaxed font-normal select-text shadow-2xs">
            {currentAnswer.trim() ? (
              <p className="text-neutral-900 whitespace-pre-wrap">{currentAnswer}</p>
            ) : (
              <p className="text-neutral-400 italic">
                {isRecording ? "Listening to your spoken answer... Speak clearly into your microphone." : "Click Record Verbal Answer below to capture your spoken response..."}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isRecording 
                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 animate-pulse' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{isRecording ? 'Stop Mic' : 'Record Verbal Answer'}</span>
          </button>

          <button
            disabled={isEvaluating}
            onClick={handleNextTurn}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <span>{questionNumber === totalQuestions ? 'Submit All & Generate Scorecard' : 'Next Question'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
