import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { LISTENING_PASSAGE } from '../../data/mockData';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  ChevronRight, 
  Radio
} from 'lucide-react';

export const ListeningRoom: React.FC = () => {
  const { endInterview } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const recognitionRef = useRef<any>(null);

  const questions = LISTENING_PASSAGE.questions;
  const currentQ = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
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
    const utterance = new SpeechSynthesisUtterance(LISTENING_PASSAGE.narrativeText);
    utterance.rate = 0.95; // Slightly measured rate for technical listening
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

  const startRecording = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
          setCurrentAnswer(transcript.trim());
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch {
        setIsRecording(true);
      }
    } else {
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  const handleNextTurn = () => {
    stopRecording();
    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else {
      endInterview();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900">Listening Comprehension Test</h2>
            <p className="text-xs text-neutral-500">Tests precision auditory retention without reading transcripts</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
            Replays: {replaysUsed} / 2 Used
          </span>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">Audio Passage</span>
            <h3 className="text-base font-semibold text-neutral-900 mt-0.5">{LISTENING_PASSAGE.title}</h3>
          </div>
          <span className="text-xs font-medium text-neutral-500 font-mono">Duration: {LISTENING_PASSAGE.durationSeconds}s</span>
        </div>

        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-5 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-1 h-12">
            {[40, 65, 30, 80, 55, 90, 45, 75, 60, 35, 85, 50, 70, 95, 40, 60, 80, 50].map((h, i) => (
              <span
                key={i}
                style={{ height: isPlaying ? `${Math.max(15, (h * Math.sin(i + 1)) % 48)}px` : '12px' }}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isPlaying ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={playAudioPassage}
              className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Audio' : 'Play Briefing Passage Aloud'}</span>
            </button>

            <button
              disabled={replaysUsed >= 2}
              onClick={playAudioPassage}
              className="flex items-center space-x-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
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
          \"{currentQ.questionText}\"
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-2">
            <span className="flex items-center">
              <Radio className={`w-3 h-3 mr-1.5 ${isRecording ? 'text-rose-600 animate-pulse' : 'text-neutral-400'}`} />
              {isRecording ? 'Listening to your microphone...' : 'Spoken Answer Response'}
            </span>
            <span className="font-mono text-[10px]">Editable Preview</span>
          </div>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 transition-colors resize-none leading-relaxed"
            placeholder={isRecording ? "Speak your answer now..." : "Click Record Verbal Answer or edit text here..."}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              isRecording 
                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 animate-pulse' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700'
            }`}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{isRecording ? 'Stop Mic' : 'Record Verbal Answer'}</span>
          </button>

          <button
            onClick={handleNextTurn}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs"
          >
            <span>{questionNumber === totalQuestions ? 'Submit All & Score' : 'Next Question'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
