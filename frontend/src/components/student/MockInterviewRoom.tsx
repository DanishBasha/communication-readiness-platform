import React, { useState } from 'react';
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
  Radio
} from 'lucide-react';

export const MockInterviewRoom: React.FC = () => {
  const { 
    interviewState, 
    submitAnswer
  } = useApp();

  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState(
    "For handling concurrency in high-throughput payment gateways, I implemented Redis distributed locks alongside Kafka consumer group offsets to guarantee idempotency and avoid duplicate ledger writes."
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  const currentQ = interviewState.questions[interviewState.turnIndex] || interviewState.questions[0];
  const questionNumber = interviewState.turnIndex + 1;
  const totalQuestions = interviewState.questions.length;
  const showWarning = interviewState.tabSwitches > 0 && !warningDismissed;

  const handleSubmit = () => {
    setIsRecording(false);
    submitAnswer(currentSpeechText);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
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

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center text-center space-y-6">
        
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-900 text-white font-mono">
            QUESTION {questionNumber}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 font-mono">
            {currentQ.difficulty} DIFFICULTY
          </span>
        </div>

        <div className="max-w-2xl">
          <p className="text-lg sm:text-xl font-medium tracking-tight text-neutral-900 leading-relaxed">
            "{currentQ.questionText}"
          </p>
        </div>

        <div className="py-2">
          <VoiceOrb 
            state={interviewState.orbState === 'SPEAKING' ? 'speaking' : isRecording ? 'listening' : 'idle'}
            volume={isRecording ? 0.65 : 0.3}
            size={180}
          />
          <p className="text-xs font-medium text-neutral-500 mt-2 font-mono uppercase tracking-wider">
            {interviewState.orbState === 'SPEAKING' ? 'Interviewer Speaking...' : isRecording ? 'Listening to your response...' : 'Microphone Ready'}
          </p>
        </div>

        <div className="w-full max-w-2xl bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-2">
            <span className="flex items-center">
              <Radio className="w-3 h-3 text-emerald-600 mr-1 animate-pulse" /> Live Speech Recognition
            </span>
            <span className="font-mono">Editable Preview</span>
          </div>
          <textarea
            value={currentSpeechText}
            onChange={(e) => setCurrentSpeechText(e.target.value)}
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-800 focus:outline-none focus:border-neutral-900 transition-colors resize-none leading-relaxed"
            placeholder="Speak or edit your answer transcript here..."
          />
        </div>

        <div className="flex items-center space-x-4 pt-2">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              isRecording 
                ? 'bg-rose-600 text-white shadow-sm hover:bg-rose-700' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 shadow-2xs'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-neutral-600" />}
            <span>{isRecording ? 'Mute Mic' : 'Start Speaking'}</span>
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs"
          >
            <span>{questionNumber === totalQuestions ? 'Submit & Finalize' : 'Next Question'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

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
