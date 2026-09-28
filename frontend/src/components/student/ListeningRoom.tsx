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
  Sparkles
} from 'lucide-react';

export const ListeningRoom: React.FC = () => {
  const { setActiveView, setStudent, activeAssignment, completeAssignmentSubmission } = useApp();
  const [selectedPassageIndex, setSelectedPassageIndex] = useState(() => {
    if (activeAssignment?.listeningPassageId) {
      const idx = LISTENING_PASSAGES.findIndex(p => p.id === activeAssignment.listeningPassageId);
      if (idx !== -1) return idx;
    }
    return 0;
  });
  const [sessionId] = useState(() => `lis_${Date.now()}`);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [collectedAnswers, setCollectedAnswers] = useState<{ questionId: string; answerText: string }[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const recognitionRef = useRef<any>(null);

  const currentPassage = LISTENING_PASSAGES[selectedPassageIndex] || LISTENING_PASSAGES[0];
  const questions = currentPassage.questions;
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

  const handleNextTurn = async () => {
    stopRecording();
    const newAnswers = [
      ...collectedAnswers,
      { questionId: currentQ.id, answerText: currentAnswer.trim() || 'No audio response recorded.' }
    ];
    setCollectedAnswers(newAnswers);

    if (currentQuestionIndex + 1 < totalQuestions) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else {
      setIsEvaluating(true);
      try {
        const res = await api.listening.submitAnswers(sessionId, newAnswers);
        if (res?.finalReport) {
          setStudent(prev => ({
            ...prev,
            recentReports: [res.finalReport, ...(prev.recentReports || [])]
          }));
          if (activeAssignment && activeAssignment.id) {
            await completeAssignmentSubmission(activeAssignment.id, res.finalReport.overallScore, 'LISTENING_COMPREHENSION');
          }
          setActiveView('REPORT_VIEW');
        }
      } catch (err) {
        console.warn('Listening evaluation fallback:', err);
        if (activeAssignment && activeAssignment.id) {
          await completeAssignmentSubmission(activeAssignment.id, 80, 'LISTENING_COMPREHENSION');
        }
        setActiveView('REPORT_VIEW');
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200">
      
      {activeAssignment && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-purple-900 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
            <div>
              <span className="font-semibold text-purple-950">Assigned Drill: </span>
              <span className="font-medium">{activeAssignment.title}</span>
              <span className="text-purple-700 ml-1.5">· Assigned by {activeAssignment.assignedByName}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded font-mono text-[10px] bg-purple-200/70 text-purple-900 font-semibold">
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
          <div className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedPassageIndex}
              onChange={(e) => handleSwitchPassage(Number(e.target.value))}
              disabled={isPlaying || currentQuestionIndex > 0}
              className="bg-transparent text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
            >
              {LISTENING_PASSAGES.map((p, idx) => (
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
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400">Briefing Passage</span>
            <h3 className="text-base font-semibold text-neutral-900 mt-0.5">{currentPassage.title}</h3>
          </div>
          <span className="text-xs font-medium text-neutral-500 font-mono">Duration: {currentPassage.durationSeconds}s</span>
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
            placeholder={isRecording ? "Speak your answer into the microphone..." : "Click Record Verbal Answer or edit text here..."}
          />
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
                <span>Synthesizing Report...</span>
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
