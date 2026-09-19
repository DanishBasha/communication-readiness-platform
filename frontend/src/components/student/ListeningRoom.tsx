import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LISTENING_PASSAGE } from '../../data/mockData';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Volume2,
  FileCheck
} from 'lucide-react';

export const ListeningRoom: React.FC = () => {
  const { endInterview } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(1);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<{ [id: string]: string }>({});
  const [activeVoiceInput, setActiveVoiceInput] = useState('');

  const questions = LISTENING_PASSAGE.questions;
  const activeQ = questions[currentQIndex];

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTurn = () => {
    const answer = activeVoiceInput.trim() || 'The maximum end-to-end latency specified is 250 milliseconds with 99.99% availability.';
    setStudentAnswers(prev => ({ ...prev, [activeQ.id]: answer }));
    setActiveVoiceInput('');

    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      endInterview();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8 max-w-4xl mx-auto flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Listening Comprehension Assessment</h1>
            <p className="text-xs text-slate-400">Listen to the technical scenario and respond verbally to comprehension checks.</p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
          Replays: {replaysUsed} / 2 allowed
        </span>
      </div>

      {/* Center Audio Player Card */}
      <div className="my-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        <div className="flex flex-col items-center justify-center gap-4">
          
          <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10">
            <Volume2 className={`w-10 h-10 ${isPlaying ? 'animate-pulse text-cyan-300' : ''}`} />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">{LISTENING_PASSAGE.title}</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">Audio Duration: {LISTENING_PASSAGE.durationSeconds}s</p>
          </div>

          {/* Audio Wave Bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 my-2">
            {[40, 65, 80, 50, 95, 30, 70, 85, 45, 100, 60, 75, 40, 90, 55, 70, 35].map((h, i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'
                }`}
                style={{ height: isPlaying ? `${Math.max(15, Math.floor(h * Math.random()))}px` : `${h * 0.3}px` }}
              />
            ))}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayToggle}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Passage' : 'Play Scenario Audio'}</span>
            </button>

            <button
              onClick={() => {
                if (replaysUsed < 2) setReplaysUsed(replaysUsed + 1);
              }}
              disabled={replaysUsed >= 2}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 max-w-md">
            *Note: The text transcript is intentionally hidden to test your real-time auditory retention and precision under interview conditions.
          </p>
        </div>

      </div>

      {/* Comprehension Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
            Comprehension Check {currentQIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-slate-400 font-mono">Voice Response</span>
        </div>

        <h4 className="text-sm sm:text-base font-medium text-white mb-4">
          "{activeQ.questionText}"
        </h4>

        <div className="space-y-3">
          <textarea
            rows={2}
            value={activeVoiceInput}
            onChange={(e) => setActiveVoiceInput(e.target.value)}
            placeholder="Speak or simulate your answer to the question above..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition resize-none"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Microphone listening</span>
            </div>

            <button
              onClick={handleNextTurn}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition"
            >
              <span>{currentQIndex + 1 === questions.length ? 'Finish & Generate Scorecard' : 'Submit Answer & Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
