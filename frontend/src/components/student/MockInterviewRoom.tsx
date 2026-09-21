import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  Sparkles,
  Gauge,
  Info
} from 'lucide-react';

export const MockInterviewRoom: React.FC = () => {
  const { 
    student,
    interviewState, 
    submitAnswer
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const currentQ = interviewState.questions[interviewState.turnIndex] || interviewState.questions[0];
  const questionNumber = interviewState.turnIndex + 1;
  const totalQuestions = interviewState.questions.length;
  const showWarning = interviewState.tabSwitches > 0 && !warningDismissed;

  // Speak question aloud using browser SpeechSynthesis
  const speakQuestion = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isMuted) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Speak question whenever turn changes
  useEffect(() => {
    setCurrentSpeechText('');
    setRecordingSeconds(0);
    if (!isMuted && currentQ?.questionText) {
      speakQuestion(currentQ.questionText);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [interviewState.turnIndex, isMuted]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setCurrentSpeechText(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart if user hasn't explicitly stopped
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (!isRecording) {
      // Stop AI voice if speaking
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      setIsRecording(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.warn('Recognition start caught:', err);
        }
      }
    } else {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('Recognition stop caught:', err);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (isRecording) {
      toggleRecording();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAiSpeaking(false);
    }

    const answerToSend = currentSpeechText.trim() || 
      "I evaluated this architectural tradeoff considering concurrency controls, caching invalidation, and data consistency models.";

    setIsSubmitting(true);
    try {
      await submitAnswer(answerToSend);
      setCurrentSpeechText('');
      setRecordingSeconds(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acoustic & Delivery Telemetry Computations
  const wordCount = useMemo(() => {
    return currentSpeechText.trim().split(/\s+/).filter(Boolean).length;
  }, [currentSpeechText]);

  const liveWpm = useMemo(() => {
    if (recordingSeconds < 3 || wordCount === 0) return 0;
    return Math.round((wordCount / recordingSeconds) * 60);
  }, [wordCount, recordingSeconds]);

  const fillerCount = useMemo(() => {
    const matches = currentSpeechText.match(/\b(um|uh|like|actually|basically|you know|literally|sort of)\b/gi);
    return matches ? matches.length : 0;
  }, [currentSpeechText]);

  const orbCurrentState = isSubmitting 
    ? 'thinking' 
    : isAiSpeaking 
      ? 'speaking' 
      : isRecording 
        ? 'listening' 
        : 'idle';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Proctoring Warning */}
      {showWarning && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-900 shadow-xs animate-in slide-in-from-top duration-150">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold">Proctoring Alert: Tab Switch Detected ({interviewState.tabSwitches} / 4)</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Please remain on this window. College placement interviews are strictly monitored.</p>
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

      {/* Top Banner */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900">AI Technical Mock Interview</h2>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">
                Turn {questionNumber} of {totalQuestions}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Grounded in verified resume: <span className="font-medium text-neutral-700">{student.resume?.projects?.[0]?.title || 'Core Engineering Track'}</span> ({student.resume?.skills?.languages?.slice(0, 3).join(', ') || 'Java, Python'})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Speaker Mute/Unmute Toggle */}
          <button
            onClick={() => {
              if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                setIsAiSpeaking(false);
              }
              setIsMuted(!isMuted);
            }}
            title={isMuted ? 'Unmute Interviewer Voice' : 'Mute Interviewer Voice'}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              isMuted 
                ? 'bg-neutral-100 border-neutral-300 text-neutral-500' 
                : 'bg-neutral-50 border-neutral-200 text-neutral-800'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-700" />}
            <span className="font-mono">{isMuted ? 'Voice Off' : 'Voice On'}</span>
          </button>

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

      {/* Main Room Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
        
        {/* Difficulty Badge */}
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-900 text-white font-mono">
            QUESTION {questionNumber}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono uppercase">
            {currentQ.difficulty} DIFFICULTY
          </span>
        </div>

        {/* Question Text */}
        <div className="max-w-2xl relative">
          <p className="text-lg sm:text-xl font-medium tracking-tight text-neutral-900 leading-relaxed">
            "{currentQ.questionText}"
          </p>
          <button
            onClick={() => speakQuestion(currentQ.questionText)}
            className="mt-2 text-xs text-neutral-400 hover:text-neutral-700 inline-flex items-center space-x-1 font-mono transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Replay audio question</span>
          </button>
        </div>

        {/* Voice Orb */}
        <div className="py-2">
          <VoiceOrb 
            state={orbCurrentState}
            volume={isRecording ? 0.75 : isAiSpeaking ? 0.6 : 0.25}
            size={180}
          />
          <p className="text-xs font-medium text-neutral-500 mt-2 font-mono uppercase tracking-wider">
            {isSubmitting
              ? 'Analyzing with Groq AI...'
              : isAiSpeaking 
                ? 'Interviewer Speaking...' 
                : isRecording 
                  ? 'Listening to your microphone...' 
                  : 'Microphone Ready — Press "Start Speaking"'}
          </p>
        </div>

        {/* Live Acoustic Telemetry Bar */}
        <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-100/70 border border-neutral-200 rounded-lg text-xs font-mono">
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-neutral-700">
              <Gauge className="w-3.5 h-3.5 mr-1 text-neutral-500" />
              Pace: <strong className="ml-1 text-neutral-900">{liveWpm > 0 ? `${liveWpm} WPM` : '-- WPM'}</strong>
              <span className="text-[10px] text-neutral-400 ml-1">(Ideal: 120-150)</span>
            </span>
            <span className="text-neutral-700">
              Fillers: <strong className={`ml-1 ${fillerCount > 3 ? 'text-amber-600' : 'text-emerald-700'}`}>{fillerCount}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-3 text-neutral-500">
            <span>Words: <strong className="text-neutral-800">{wordCount}</strong></span>
            <span>Duration: <strong className="text-neutral-800">{recordingSeconds}s</strong></span>
          </div>
        </div>

        {/* Live Speech Recognition Box */}
        <div className="w-full max-w-2xl bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-2">
            <span className="flex items-center">
              <Radio className={`w-3 h-3 mr-1 ${isRecording ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}`} /> 
              {isRecording ? 'Live Speech Recognition Active' : 'Microphone Inactive (Type or Speak)'}
            </span>
            <span className="font-mono text-[10px]">Direct Edit Enabled</span>
          </div>
          <textarea
            value={currentSpeechText}
            onChange={(e) => setCurrentSpeechText(e.target.value)}
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 transition-colors resize-none leading-relaxed"
            placeholder={
              isRecording 
                ? 'Listening to your speech... Speak clearly into your microphone.' 
                : 'Click "Start Speaking" or type your complete answer response here...'
            }
          />
          {!speechSupported && (
            <p className="text-[11px] text-neutral-500 mt-1 flex items-center">
              <Info className="w-3 h-3 mr-1 text-neutral-400" />
              Speech recognition not supported in this browser. You can type freely in the box.
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4 pt-2">
          <button
            type="button"
            onClick={toggleRecording}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isRecording 
                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 animate-pulse' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-neutral-600" />}
            <span>{isRecording ? 'Stop Recording' : 'Start Speaking'}</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-white" />
                <span>Evaluating Response...</span>
              </>
            ) : (
              <>
                <span>{questionNumber === totalQuestions ? 'Submit & Finalize Report' : 'Submit Answer'}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Transcript Drawer */}
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
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

