import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { VoiceOrb } from './VoiceOrb';
import { 
  ShieldAlert, 
  Mic, 
  MicOff, 
  Maximize2, 
  XSquare, 
  ArrowRight, 
  ListOrdered, 
  Sparkles, 
  Activity,
  AlertTriangle,
  Flame,
  Volume2
} from 'lucide-react';

export const MockInterviewRoom: React.FC = () => {
  const { interviewState, submitAnswer, endInterview, recordTabSwitch } = useApp();
  const [isMicActive, setIsMicActive] = useState(true);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [simulatedAudioLevel, setSimulatedAudioLevel] = useState(0.4);

  const currentQ = interviewState.questions[interviewState.turnIndex] || interviewState.questions[0];

  // Proctoring tab switch simulation & alert
  useEffect(() => {
    // Audio fluctuation simulation
    const interval = setInterval(() => {
      if (interviewState.orbState === 'LISTENING' || interviewState.orbState === 'SPEAKING') {
        setSimulatedAudioLevel(0.3 + Math.random() * 0.6);
      } else {
        setSimulatedAudioLevel(0.1);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [interviewState.orbState]);

  const handleFinishTurn = () => {
    const finalAnswer = transcriptInput.trim() || 
      'I chose Kafka because its distributed partition model guarantees horizontal scalability and fault tolerance. In PostgreSQL, we applied row-level locks and isolation levels to avoid double spending.';
    submitAnswer(finalAnswer);
    setTranscriptInput('');
  };

  const difficultyColors = {
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ADVANCED: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      
      {/* Top Proctoring Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md">
        
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-xs font-mono font-semibold text-slate-200 border border-slate-700">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Q {interviewState.turnIndex + 1} of {interviewState.questions.length}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-xl font-mono uppercase font-semibold border ${difficultyColors[interviewState.currentDifficulty]}`}>
            {interviewState.currentDifficulty} Difficulty
          </span>
        </div>

        {/* Proctoring Status Pill */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono border ${
            interviewState.tabSwitches === 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : interviewState.tabSwitches < 4
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-bounce'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Tab Switches: {interviewState.tabSwitches} / 4</span>
          </div>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
            <span>Transcript</span>
          </button>
        </div>

      </div>

      {/* Proctoring Warning Banner if tab switch detected */}
      {interviewState.tabSwitches > 0 && (
        <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Proctor Warning:</strong> Tab-switch detected ({interviewState.tabSwitches}/4). Please remain in fullscreen. Repeated violations will flag your session to the Placement Coordinator.
            </span>
          </div>
          <button 
            onClick={recordTabSwitch}
            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[10px] hover:bg-amber-500/30 transition"
          >
            Simulate Violation
          </button>
        </div>
      )}

      {/* Center Stage: ChatGPT Style Voice Orb & Current Question */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-3xl mx-auto w-full text-center">
        
        {/* Pulsing Animated Voice Orb */}
        <VoiceOrb 
          state={interviewState.orbState} 
          audioLevel={simulatedAudioLevel} 
          size={240} 
        />

        {/* Live AI Spoken Question Box */}
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/90 shadow-2xl w-full backdrop-blur-md">
          <div className="flex items-center justify-center gap-2 mb-2 text-xs uppercase tracking-wider font-semibold text-indigo-400">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>AI Interviewer Question</span>
          </div>
          <h2 className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
            "{currentQ.questionText}"
          </h2>
        </div>

        {/* Candidate Spoken Transcript Preview */}
        <div className="mt-4 w-full">
          <div className="relative">
            <textarea
              rows={2}
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              placeholder="Listening to your voice... (or type your response here to simulate speaking)"
              className="w-full rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
            <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] text-slate-400 font-mono">Real-Time STT Active</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Floating Control Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-md max-w-2xl mx-auto w-full">
        
        <button
          onClick={() => setIsMicActive(!isMicActive)}
          className={`p-3 rounded-xl border transition flex items-center gap-2 text-xs font-semibold ${
            isMicActive 
              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' 
              : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
          }`}
        >
          {isMicActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
          <span className="hidden sm:inline">{isMicActive ? 'Mute Mic' : 'Mic Muted'}</span>
        </button>

        <button
          onClick={handleFinishTurn}
          className="flex-1 max-w-xs py-3 px-5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-95"
        >
          <span>I'm Done Speaking</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={endInterview}
          className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-700 text-xs font-medium text-slate-400 transition"
        >
          <span className="hidden sm:inline">End Early</span>
          <XSquare className="w-4 h-4 sm:hidden" />
        </button>

      </div>

      {/* Slide-out Live Transcript Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 p-5 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Live Session Transcript</h3>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
            {interviewState.questions.slice(0, interviewState.turnIndex + 1).map((q, idx) => (
              <div key={q.id} className="space-y-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-indigo-400 block mb-1">Interviewer (Turn {idx + 1}):</span>
                  <p className="text-slate-200">{q.questionText}</p>
                </div>

                {q.studentAnswer && (
                  <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20 ml-3">
                    <span className="font-bold text-emerald-400 block mb-1">You:</span>
                    <p className="text-slate-300">{q.studentAnswer}</p>
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
