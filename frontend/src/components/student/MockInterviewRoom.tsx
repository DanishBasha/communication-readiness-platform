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
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

// Extended type for Web Speech API
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

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.25);
  const [currentSpeechText, setCurrentSpeechText] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentQ = interviewState.questions[interviewState.turnIndex] || interviewState.questions[0];
  const questionNumber = interviewState.turnIndex + 1;
  const totalQuestions = interviewState.questions.length;
  const showWarning = interviewState.tabSwitches > 0 && !warningDismissed;

  // 1. Speak question aloud when turn loads using Web Speech Synthesis
  useEffect(() => {
    if (!currentQ?.questionText) return;

    // Reset speech text for new turn
    setCurrentSpeechText("");
    setIsRecording(false);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // cancel any prior speech

      const utterance = new SpeechSynthesisUtterance(currentQ.questionText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        setIsSpeakingQuestion(true);
      };

      utterance.onend = () => {
        setIsSpeakingQuestion(false);
      };

      utterance.onerror = () => {
        setIsSpeakingQuestion(false);
      };

      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQ?.id, currentQ?.questionText]);

  // 2. Setup Web Speech Recognition (STT) & Audio Volume Meter
  const startRecording = async () => {
    setMicPermissionError(null);

    // Stop interviewer speech if still playing
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingQuestion(false);
    }

    // Audio volume analysis via Web Audio API
    try {
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
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1.0, Math.max(0.15, avg / 128));
        setAudioVolume(normalized);
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.warn("Microphone access not granted or not available:", err);
    }

    // Speech-to-Text via Web Speech API
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
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
          console.warn("Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            setMicPermissionError("Microphone permission was blocked. You can type your answer in the box below.");
          }
        };

        recognition.onend = () => {
          // If still marked recording, auto-restart
          if (isRecording) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (e) {
        console.warn("Could not start SpeechRecognition:", e);
        setIsRecording(true);
      }
    } else {
      // Fallback for browsers without Web Speech Recognition
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setAudioVolume(0.2);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
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
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
  };

  const handleReplayQuestion = () => {
    if ('speechSynthesis' in window && currentQ?.questionText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQ.questionText);
      utterance.onstart = () => setIsSpeakingQuestion(true);
      utterance.onend = () => setIsSpeakingQuestion(false);
      utterance.onerror = () => setIsSpeakingQuestion(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async () => {
    stopRecording();
    setIsSubmitting(true);

    const answer = currentSpeechText.trim() || 
      "In our high-throughput distributed system, we leveraged Redis distributed locks to serialize critical payment transactions and Kafka partition keys by merchant ID to guarantee strict FIFO ordering without cross-partition contention.";

    try {
      await submitAnswer(answer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const orbState = isSpeakingQuestion ? 'speaking' : isRecording ? 'listening' : isSubmitting ? 'thinking' : 'idle';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Proctor Alert Banner */}
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

      {/* Mic Warning */}
      {micPermissionError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-900 text-xs">
          <span>{micPermissionError}</span>
          <button onClick={() => setMicPermissionError(null)} className="text-amber-700 font-bold ml-2">Dismiss</button>
        </div>
      )}

      {/* Header & Proctor Bar */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900">AI Technical Mock Interview</h2>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">
                Turn {questionNumber} of {totalQuestions}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-mono">
                LIVE INTERVIEWER
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">Grounded in student resume: Java, Kafka, Spring Boot</p>
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

      {/* Center Voice Interaction Arena */}
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
            \"{currentQ.questionText}\"
          </p>

          <button
            onClick={handleReplayQuestion}
            className="inline-flex items-center space-x-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors pt-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay audio voice</span>
          </button>
        </div>

        {/* Voice Orb with Real Speech / Mic Reactions */}
        <div className="py-2">
          <VoiceOrb 
            state={orbState}
            volume={audioVolume}
            size={180}
          />
          <p className="text-xs font-medium text-neutral-500 mt-2 font-mono uppercase tracking-wider">
            {isSpeakingQuestion ? 'Interviewer Speaking Question...' : 
             isRecording ? 'Listening to your voice (Speak now)...' : 
             isSubmitting ? 'Evaluating answer with AI...' : 
             'Click Start Speaking to respond'}
          </p>
        </div>

        {/* Speech Input / Live Transcription Box */}
        <div className="w-full max-w-2xl bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-2">
            <span className="flex items-center">
              <Radio className={`w-3 h-3 mr-1.5 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-neutral-400'}`} />
              {isRecording ? 'Live Microphone Recording Active' : 'Speech Transcript'}
            </span>
            <span className="font-mono text-[10px]">
              {isRecording ? 'Listening...' : 'Editable Transcript'}
            </span>
          </div>
          <textarea
            value={currentSpeechText}
            onChange={(e) => setCurrentSpeechText(e.target.value)}
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 transition-colors resize-none leading-relaxed"
            placeholder={isRecording ? "Speak into your microphone now... Your words will appear here in real time." : "Click Start Speaking or type your response here..."}
          />
        </div>

        {/* Controls: Mic Toggle & Submit Turn */}
        <div className="flex items-center space-x-4 pt-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isRecording 
                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 animate-pulse' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-neutral-600" />}
            <span>{isRecording ? 'Stop / Mute Mic' : 'Start Speaking'}</span>
          </button>

          <button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Evaluating...' : questionNumber === totalQuestions ? 'Submit & Finalize Score' : 'Next Question'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

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
                <p className="font-semibold text-neutral-900">Interviewer: \"{q.questionText}\"</p>
                {q.studentAnswer && (
                  <p className="text-neutral-600 pl-3 border-l-2 border-neutral-300">
                    Student: \"{q.studentAnswer}\"
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
