import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { VoiceOrb } from './VoiceOrb';
import { QuestionTurn } from '../../types';
import { 
  ShieldAlert, 
  Mic, 
  MicOff, 
  ChevronRight, 
  AlertTriangle, 
  MessageSquare, 
  X,
  Radio,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const MockInterviewRoom: React.FC = () => {
  const { 
    interviewState, 
    submitAnswer
  } = useApp();

  // State flags for UI display
  const [hasSessionStarted, setHasSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.2);
  const [currentSpeechText, setCurrentSpeechText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [autoConversationMode, setAutoConversationMode] = useState(true);

  // References to keep event handlers, SpeechSynthesis and Web Speech API stable without cyclic re-renders
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Mutable refs to prevent stale closure bugs in timers & recognition callbacks
  const isRecordingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const autoModeRef = useRef(true);
  const latestSpeechRef = useRef<string>("");
  const currentQuestionIdRef = useRef<string>("");

  const currentQ = interviewState.questions[interviewState.turnIndex] || interviewState.questions[0];
  const questionNumber = interviewState.turnIndex + 1;
  const totalQuestions = interviewState.questions.length;
  const showWarning = interviewState.tabSwitches > 0 && !warningDismissed;

  // Sync autoModeRef with state
  useEffect(() => {
    autoModeRef.current = autoConversationMode;
  }, [autoConversationMode]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopRecordingResources();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Stop recognition and mic streams cleanly
  const stopRecordingResources = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setAudioVolume(0.15);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(null);

    if (recognitionRef.current) {
      try { 
        recognitionRef.current.abort(); 
      } catch {}
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { 
        audioContextRef.current.close(); 
      } catch {}
      audioContextRef.current = null;
    }
  };

  // Submit Answer to Backend Gateway & FastAPI
  const handleExecuteSubmit = async (textToSubmit?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    // Stop recording and timers
    stopRecordingResources();

    const candidateAnswer = (textToSubmit || latestSpeechRef.current || currentSpeechText).trim();
    const finalAnswer = candidateAnswer || 
      "I have implemented scalable architecture solutions using reactive patterns, distributed caching, and transactional consistency.";

    try {
      await submitAnswer(finalAnswer);
    } catch (err) {
      console.error("[MockInterview] Submit error:", err);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setCurrentSpeechText("");
      latestSpeechRef.current = "";
    }
  };

  // Voice Activity Silence Detector: Auto-submits after natural pause
  const handleSpeechInput = (transcript: string) => {
    latestSpeechRef.current = transcript;
    setCurrentSpeechText(transcript);

    if (!autoModeRef.current) return;

    // Reset silence timer
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const words = transcript.trim().split(/\s+/).filter(Boolean);

    // Once candidate speaks at least 3 words, begin silence monitoring
    if (words.length >= 3) {
      let secondsLeft = 3;
      setSilenceCountdown(secondsLeft);

      countdownIntervalRef.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setSilenceCountdown(null);
        } else {
          setSilenceCountdown(secondsLeft);
        }
      }, 1000);

      silenceTimerRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setSilenceCountdown(null);
        // Candidate has finished speaking -> execute submit
        handleExecuteSubmit(latestSpeechRef.current);
      }, 2600);
    } else {
      setSilenceCountdown(null);
    }
  };

  // Start continuous Speech Recognition & Mic Stream
  const startRecording = async () => {
    if (isRecordingRef.current || isSubmittingRef.current) return;
    setMicPermissionError(null);

    // Ensure AI speech synthesis is silenced
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
      setIsSpeakingQuestion(false);
    }

    isRecordingRef.current = true;
    setIsRecording(true);

    // Initialize Web Audio volume meter for VoiceOrb reactivity
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const normalized = Math.min(1.0, Math.max(0.18, avg / 120));
          setAudioVolume(normalized);
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (err: any) {
      console.warn("Audio meter setup warning:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError("Microphone access is blocked. Please allow microphone permissions in your browser.");
      }
    }

    // Start Web Speech Recognition
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch {}
        }

        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          const cleaned = fullTranscript.trim();
          if (cleaned) {
            handleSpeechInput(cleaned);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') return; // Normal pause in conversation
          if (event.error === 'not-allowed') {
            setMicPermissionError("Microphone permission was denied. Please allow microphone access.");
          }
        };

        recognition.onend = () => {
          // Keep recording alive if still in listening mode
          if (isRecordingRef.current && !isSubmittingRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("SpeechRec error:", e);
      }
    }
  };

  // Speak AI Question with Natural Speech Synthesis
  const speakQuestion = (questionText: string) => {
    if (!questionText) return;

    // First stop mic to prevent acoustic echo
    stopRecordingResources();

    if (!('speechSynthesis' in window)) {
      // Fallback: If browser lacks speech synthesis, jump straight to recording
      setIsSpeakingQuestion(false);
      isSpeakingRef.current = false;
      startRecording();
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    isSpeakingRef.current = true;
    setIsSpeakingQuestion(true);

    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David')));
    if (naturalVoice) utterance.voice = naturalVoice;

    let hasEnded = false;
    const handleEnd = () => {
      if (hasEnded) return;
      hasEnded = true;
      isSpeakingRef.current = false;
      setIsSpeakingQuestion(false);

      // AUTOMATIC HANDS-FREE TRANSITION: Question finished -> open mic immediately!
      if (autoModeRef.current) {
        setTimeout(() => {
          startRecording();
        }, 300);
      }
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeakingQuestion(true);
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      handleEnd();
    };

    // Chrome safety timer: Chromium onend bug fallback
    const safetyTimeout = Math.max(5000, questionText.length * 90);
    setTimeout(() => {
      if (isSpeakingRef.current) {
        handleEnd();
      }
    }, safetyTimeout);

    window.speechSynthesis.speak(utterance);
  };

  // Turn Lifecycle: When current question ID changes, speak the new question
  useEffect(() => {
    if (!currentQ?.id || !currentQ?.questionText) return;
    if (currentQuestionIdRef.current === currentQ.id) return;

    currentQuestionIdRef.current = currentQ.id;
    setCurrentSpeechText("");
    latestSpeechRef.current = "";
    setSilenceCountdown(null);

    // If candidate has already started, speak the next question automatically!
    if (hasSessionStarted) {
      speakQuestion(currentQ.questionText);
    }
  }, [currentQ?.id, currentQ?.questionText, hasSessionStarted]);

  // Initial user start handler
  const handleStartSession = () => {
    setHasSessionStarted(true);
    speakQuestion(currentQ.questionText);
  };

  // Replay question audio
  const handleReplayQuestion = () => {
    speakQuestion(currentQ.questionText);
  };

  const orbState = isSpeakingQuestion 
    ? 'speaking' 
    : isRecording 
      ? 'listening' 
      : isSubmitting 
        ? 'thinking' 
        : 'idle';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Proctoring Warning Banner */}
      {showWarning && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-900 shadow-xs animate-in slide-in-from-top duration-150">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold">Proctoring Alert: Tab Switch Detected ({interviewState.tabSwitches} / 4)</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Please stay on this window. College placement interviews are strictly proctored.</p>
            </div>
          </div>
          <button 
            onClick={() => setWarningDismissed(true)}
            className="text-xs bg-rose-600 text-white px-3 py-1 rounded-md font-medium hover:bg-rose-700 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Mic Warning */}
      {micPermissionError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-900 text-xs">
          <span>{micPermissionError}</span>
          <button onClick={() => setMicPermissionError(null)} className="text-amber-700 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {/* Top Header & Proctor Bar */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900">Conversational AI Mock Interview</h2>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">
                Turn {questionNumber} of {totalQuestions}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-mono">
                <Zap className="w-3 h-3 mr-1" /> HANDS-FREE MODE
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">Autonomous voice interaction: AI Speaks $\rightarrow$ Listens $\rightarrow$ Submits on pause</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-200 px-3 py-1 rounded-full text-xs font-medium text-neutral-700 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-500" />
            <span>Tab Switches: {interviewState.tabSwitches} / 4</span>
          </div>

          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex items-center space-x-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Transcript</span>
          </button>
        </div>
      </div>

      {/* Center Voice Arena */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
        
        {/* Active Question Badge */}
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-900 text-white font-mono">
            QUESTION {questionNumber}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono">
            {currentQ.difficulty} DIFFICULTY
          </span>
          {currentQ.category && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 font-mono">
              {currentQ.category}
            </span>
          )}
        </div>

        {/* Spoken AI Question Text */}
        <div className="max-w-2xl space-y-2">
          <p className="text-lg sm:text-xl font-medium tracking-tight text-neutral-900 leading-relaxed">
            "{currentQ.questionText}"
          </p>

          {hasSessionStarted && (
            <button
              onClick={handleReplayQuestion}
              className="inline-flex items-center space-x-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors pt-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Replay interviewer audio</span>
            </button>
          )}
        </div>

        {/* Pre-Session Start Call to Action (Satisfies Browser Autoplay Gesture) */}
        {!hasSessionStarted ? (
          <div className="py-6 flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-neutral-950 flex items-center justify-center text-white shadow-md">
              <Mic className="w-7 h-7 text-emerald-400 animate-pulse" />
            </div>
            <div className="max-w-md text-center">
              <h3 className="text-base font-semibold text-neutral-900">Audio Ready for Conversational Mode</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Click below to start. The interviewer will read the question aloud, then immediately open your microphone. From then on, the entire interview runs hands-free!
              </p>
            </div>
            <button
              onClick={handleStartSession}
              className="inline-flex items-center space-x-2.5 bg-neutral-900 hover:bg-black text-white px-7 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Start Live Interview Session</span>
            </button>
          </div>
        ) : (
          /* Live Conversational Voice Stage */
          <>
            {/* Voice Orb with Real-Time Speech Animation */}
            <div className="py-2">
              <VoiceOrb 
                state={orbState}
                volume={audioVolume}
                size={180}
              />
              
              <div className="mt-3 flex flex-col items-center space-y-1">
                <p className="text-xs font-semibold text-neutral-700 font-mono uppercase tracking-wider">
                  {isSpeakingQuestion ? 'AI Interviewer Speaking...' : 
                   silenceCountdown !== null ? `Silence detected... Submitting in ${silenceCountdown}s...` :
                   isRecording ? 'Interviewer Listening (Speak freely)...' : 
                   isSubmitting ? 'Evaluating answer with AI...' : 
                   'Ready'}
                </p>

                {silenceCountdown !== null && (
                  <span className="inline-flex items-center text-[11px] font-mono text-emerald-600 font-medium animate-pulse">
                    <Clock className="w-3 h-3 mr-1" /> Completing turn in {silenceCountdown}s (or keep speaking)
                  </span>
                )}
              </div>
            </div>

            {/* Live Speech Recognition Box */}
            <div className="w-full max-w-2xl bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
                <span className="flex items-center">
                  <Radio className={`w-3 h-3 mr-1.5 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-neutral-400'}`} />
                  {isRecording ? 'Live Microphone Stream (Continuous)' : 'Speech Transcript'}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {isRecording ? 'Auto-submits on 2.5s pause' : 'Editable'}
                </span>
              </div>

              <textarea
                value={currentSpeechText}
                onChange={(e) => handleSpeechInput(e.target.value)}
                rows={3}
                className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 transition-colors resize-none leading-relaxed"
                placeholder={
                  isSpeakingQuestion ? "Listening to the interviewer... The microphone will open automatically when the question finishes." :
                  isRecording ? "Speak into your microphone now... When you pause, your answer will be automatically submitted." :
                  "Your spoken response will appear here..."
                }
              />
            </div>

            {/* Action Controls & Manual Override */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={isRecording ? stopRecordingResources : startRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isRecording 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100' 
                    : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 shadow-2xs'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5 text-neutral-600" />}
                <span>{isRecording ? 'Pause Mic' : 'Open Mic'}</span>
              </button>

              <button
                disabled={isSubmitting || !currentSpeechText.trim()}
                onClick={() => handleExecuteSubmit()}
                className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-40"
              >
                <span>{isSubmitting ? 'Evaluating...' : 'Done Speaking (Skip Wait)'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400">
              Zero clicks needed: Speak your answer and pause for 2.5s to proceed automatically.
            </p>
          </>
        )}

      </div>

      {/* Slide-out Transcript Drawer */}
      {drawerOpen && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h4 className="text-xs font-semibold tracking-tight text-neutral-900 uppercase font-mono">Turn-by-Turn Session Transcript</h4>
            <button onClick={() => setDrawerOpen(false)} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 mt-3 max-h-60 overflow-y-auto pr-1 text-xs">
            {interviewState.questions.slice(0, interviewState.turnIndex + 1).map((q: QuestionTurn) => (
              <div key={q.id} className="p-3 bg-neutral-50 rounded-xl space-y-1.5 border border-neutral-100">
                <p className="font-semibold text-neutral-900">Interviewer: "{q.questionText}"</p>
                {q.studentAnswer && (
                  <p className="text-neutral-600 pl-3 border-l-2 border-neutral-300">
                    Student: "{q.studentAnswer}"
                  </p>
                )}
                {q.technicalScore && (
                  <div className="flex items-center space-x-2 text-[10px] text-neutral-500 font-mono pt-1">
                    <span>Score: {q.technicalScore}/100</span>
                    <span>•</span>
                    <span>WPM: {q.wpm}</span>
                    <span>•</span>
                    <span>Fillers: {q.fillerWords}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
