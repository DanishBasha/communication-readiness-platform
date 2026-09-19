import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UploadCloud, CheckCircle2, FileText, Sparkles, ArrowRight } from 'lucide-react';

interface ResumeUploadModalProps {
  onClose: () => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({ onClose }) => {
  const { student } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'extracted'>('upload');

  const handleSimulateUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActiveTab('extracted');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Student Resume Intake</h3>
              <p className="text-xs text-neutral-500">Grounds AI mock interview questions in your verified projects</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {activeTab === 'upload' ? (
            <div className="space-y-4">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleSimulateUpload(); }}
                onClick={handleSimulateUpload}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-neutral-900 bg-neutral-50' 
                    : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-neutral-800">
                  Click to browse or drop your PDF resume here
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Supported formats: PDF, DOCX (Max 10MB)
                </p>

                {isProcessing && (
                  <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-neutral-600 font-medium">
                    <Sparkles className="w-4 h-4 animate-spin text-neutral-800" />
                    <span>Parsing technical competencies with AI...</span>
                  </div>
                )}
              </div>

              {student.resume && (
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-800">{student.resume.fileName}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">Parsed {student.resume.parsedAt} · Verified</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('extracted')}
                    className="text-xs font-medium text-neutral-700 hover:text-black flex items-center"
                  >
                    <span>Review data</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2 font-mono">
                  Extracted Technical Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {student.resume?.skills.languages.concat(student.resume?.skills.frameworks || []).map((skill: string, idx: number) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2 font-mono">
                  Verified Project Archetype
                </p>
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 text-xs text-neutral-700 leading-relaxed">
                  {student.resume?.projects[0]?.title || 'Distributed Microservices Order Engine'}: {student.resume?.projects[0]?.description || 'High throughput event-driven pipeline handling 1,500 req/sec with Apache Kafka and Spring Boot idempotency guards.'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-medium flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> Ready for AI Interview Grounding
          </span>
          <button
            onClick={onClose}
            className="bg-neutral-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
