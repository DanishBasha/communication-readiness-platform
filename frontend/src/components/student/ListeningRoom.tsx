import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LISTENING_PASSAGE } from '../../data/mockData';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  ArrowRight,
  Volume2
} from 'lucide-react';

export const ListeningRoom: React.FC = () => {
  const { endInterview } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(1);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [activeVoiceInput, setActiveVoiceInput] = useState('');

  const questions = LISTENING_PASSAGE.questions;
  const activeQ = questions[currentQIndex];

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTurn = () => {
    setActiveVoiceInput('');
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      endInterview();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF8F5] text-stone-900 p-4 sm:p-8 max-w-4xl mx-auto flex flex-col justify-between">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-stone-900">Listening Comprehension Assessment</h1>
            <p className="text-xs text-stone-500">Listen to the technical scenario passage and respond verbally to retention questions.</p>
          </div>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 font-mono font-bold">
          Replays: {replaysUsed} / 2 allowed
        </span>
      </div>

      {/* Audio Player Card */}
      <div className="my-8 bg-white border border-stone-200/90 rounded-[32px] p-8 sm:p-10 shadow-sm text-center relative overflow-hidden">
        
        <div className="flex flex-col items-center justify-center gap-4">
          
          <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
            <Volume2 className={`w-10 h-10 ${isPlaying ? 'animate-pulse text-emerald-600' : ''}`} />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900">{LISTENING_PASSAGE.title}</h3>
            <p className="text-xs text-stone-500 mt-1 font-mono">Duration: {LISTENING_PASSAGE.durationSeconds}s</p>
          </div>

          {/* Bamboo Green Soundwave Bars */}
          <div className="flex items-center justify-center gap-1.5 h-10 my-2">
            {[40, 65, 80, 50, 95, 30, 70, 85, 45, 100, 60, 75, 40, 90, 55, 70, 35].map((h, i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-full transition-all duration-200 ${
                  isPlaying ? 'bg-emerald-600 animate-pulse' : 'bg-stone-300'
                }`}
                style={{ height: isPlaying ? `${Math.max(15, Math.floor(h * Math.random()))}px` : `${h * 0.35}px` }}
              />
            ))}
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayToggle}
              className="px-6 py-3 rounded-2xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Passage' : 'Play Scenario Audio'}</span>
            </button>

            <button
              onClick={() => {
                if (replaysUsed < 2) setReplaysUsed(replaysUsed + 1);
              }}
              disabled={replaysUsed >= 2}
              className="px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-semibold border border-stone-200 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-400 max-w-md">
            *Note: The narrative text is hidden to simulate active workplace listening and verbal retention.
          </p>
        </div>

      </div>

      {/* Comprehension Question Card */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-emerald-800 uppercase tracking-wider">
            Comprehension Check {currentQIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-stone-500 font-mono">Voice Response</span>
        </div>

        <h4 className="text-base sm:text-lg font-bold text-stone-900 mb-4">
          "{activeQ.questionText}"
        </h4>

        <div className="space-y-3">
          <textarea
            rows={2}
            value={activeVoiceInput}
            onChange={(e) => setActiveVoiceInput(e.target.value)}
            placeholder="Speak or type your summary of the answer..."
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-600 transition resize-none"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Mic className="w-4 h-4 text-emerald-600" />
              <span>Microphone Ready</span>
            </div>

            <button
              onClick={handleNextTurn}
              className="px-5 py-2.5 rounded-xl bg-[#191C1A] hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <span>{currentQIndex + 1 === questions.length ? 'Finish & Generate Scorecard' : 'Submit & Next Question'}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
