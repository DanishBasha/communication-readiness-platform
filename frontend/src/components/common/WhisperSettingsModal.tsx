import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Key, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Trash2,
  Volume2,
  Play,
  Square,
  Radio
} from 'lucide-react';
import { 
  getWhisperApiKey, 
  setWhisperApiKey, 
  hasWhisperApiKey,
  getOpenAITTSVoice,
  setOpenAITTSVoice,
  getOpenAITTSModel,
  setOpenAITTSModel,
  synthesizeSpeechWithOpenAI,
  OPENAI_VOICES,
  OpenAITTSVoice,
  OpenAIVoiceOption
} from '../../services/whisperService';

interface WhisperSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
  onVoiceUpdated?: (voice: OpenAITTSVoice) => void;
}

export const WhisperSettingsModal: React.FC<WhisperSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
  onVoiceUpdated
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<OpenAITTSVoice>('nova');
  const [selectedModel, setSelectedModel] = useState<'tts-1' | 'tts-1-hd'>('tts-1');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentHasKey, setCurrentHasKey] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeKey = getWhisperApiKey();
      setKeyInput(activeKey);
      setCurrentHasKey(Boolean(activeKey));
      setSelectedVoice(getOpenAITTSVoice());
      setSelectedModel(getOpenAITTSModel());
      setIsSaved(false);
      setPreviewingVoice(null);
    } else {
      stopPreview();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPreviewingVoice(null);
  };

  const handlePlaySample = async (voice: OpenAIVoiceOption) => {
    if (previewingVoice === voice.id) {
      stopPreview();
      return;
    }

    stopPreview();
    setPreviewingVoice(voice.id);

    if (keyInput.trim()) {
      try {
        const res = await synthesizeSpeechWithOpenAI(voice.sampleText, voice.id, selectedModel);
        if (res.success && res.audioBlob) {
          const url = URL.createObjectURL(res.audioBlob);
          const audio = new Audio(url);
          previewAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            previewAudioRef.current = null;
            setPreviewingVoice(null);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            previewAudioRef.current = null;
            setPreviewingVoice(null);
          };
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('OpenAI TTS sample failed, falling back:', err);
      }
    }

    // Fallback to browser TTS for preview
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);
      utterance.onend = () => setPreviewingVoice(null);
      utterance.onerror = () => setPreviewingVoice(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPreviewingVoice(null);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    setWhisperApiKey(keyInput);
    setOpenAITTSVoice(selectedVoice);
    setOpenAITTSModel(selectedModel);

    const hasKey = hasWhisperApiKey();
    setCurrentHasKey(hasKey);
    setIsSaved(true);

    if (onKeyUpdated) onKeyUpdated(hasKey);
    if (onVoiceUpdated) onVoiceUpdated(selectedVoice);

    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  const handleRemove = () => {
    setWhisperApiKey('');
    setKeyInput('');
    setCurrentHasKey(false);
    if (onKeyUpdated) onKeyUpdated(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-neutral-200/90 shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-neutral-950 text-amber-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                AI Voice & Speech Settings
              </h3>
              <p className="text-xs text-neutral-500">
                OpenAI Neural Text-to-Speech & Whisper Speech Recognition
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Pill */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
          currentHasKey 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${currentHasKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold">
              {currentHasKey ? 'Neural Voice & Whisper STT Active' : 'Standard Browser Voice (Add Key for OpenAI TTS)'}
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white border border-neutral-200">
            {currentHasKey ? 'OpenAI Neural' : 'Free Client'}
          </span>
        </div>

        {/* Voice Persona Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-neutral-600" />
              <span>Select AI Interviewer Voice</span>
            </label>
            <span className="text-[11px] font-mono text-neutral-400">
              Active: <strong className="text-neutral-900 capitalize">{selectedVoice}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {OPENAI_VOICES.map((v) => {
              const isSelected = selectedVoice === v.id;
              const isPlaying = previewingVoice === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all relative flex flex-col justify-between space-y-2 ${
                    isSelected 
                      ? 'border-neutral-900 bg-neutral-950 text-white shadow-sm ring-1 ring-neutral-900' 
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/70 hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-neutral-300'}`} />
                      <span className="font-bold text-xs">{v.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200/80 text-neutral-600'
                      }`}>
                        {v.gender}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySample(v);
                      }}
                      title={isPlaying ? 'Stop Preview' : 'Play Voice Preview'}
                      className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                        isSelected 
                          ? (isPlaying ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300')
                          : (isPlaying ? 'bg-neutral-900 text-white' : 'bg-white hover:bg-neutral-200 border border-neutral-200 text-neutral-700')
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-mono">Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-mono">Preview</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className={`text-[11px] leading-relaxed line-clamp-2 ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Quality Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-800 flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-neutral-600" />
            <span>Neural TTS Model Engine</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedModel('tts-1')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                selectedModel === 'tts-1'
                  ? 'border-neutral-900 bg-neutral-900 text-white font-semibold shadow-2xs'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div className="font-bold">tts-1 (Low Latency)</div>
              <div className={`text-[10px] ${selectedModel === 'tts-1' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                Recommended for fast real-time conversations
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedModel('tts-1-hd')}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                selectedModel === 'tts-1-hd'
                  ? 'border-neutral-900 bg-neutral-900 text-white font-semibold shadow-2xs'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div className="font-bold">tts-1-hd (Studio HD)</div>
              <div className={`text-[10px] ${selectedModel === 'tts-1-hd' ? 'text-neutral-300' : 'text-neutral-400'}`}>
                Maximum voice clarity and audio richness
              </div>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-800">
            OpenAI API Key (Powers both TTS Voice & Whisper STT)
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all"
            />
          </div>
          <p className="text-[10px] text-neutral-400">
            Your key stays securely in your browser's local storage and connects directly to OpenAI's endpoints.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {currentHasKey ? (
            <button
              onClick={handleRemove}
              className="inline-flex items-center space-x-1.5 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect Key</span>
            </button>
          ) : <div />}

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                stopPreview();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-white" />}
              <span>{isSaved ? 'Settings Saved!' : 'Save & Apply Voice'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
