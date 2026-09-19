import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, FileText, CheckCircle2, Sparkles, X, Code, GitBranch, Terminal } from 'lucide-react';
import { ParsedResume } from '../../types';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({ isOpen, onClose }) => {
  const { student, uploadResumeData } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [previewParsed, setPreviewParsed] = useState<ParsedResume | null>(student.resume);
  const [githubInput, setGithubInput] = useState(student.codingHandles.github || '');
  const [leetcodeInput, setLeetcodeInput] = useState(student.codingHandles.leetcode || '');

  if (!isOpen) return null;

  const handleSimulatedUpload = (file: File) => {
    setIsUploading(true);
    // Simulate AI parsing delay
    setTimeout(() => {
      const mockParsed: ParsedResume = {
        fileName: file.name,
        parsedAt: new Date().toISOString().split('T')[0],
        summary: 'Full Stack Engineer with strong foundation in Java, Spring Boot, React, and Event-Driven Kafka architectures.',
        skills: {
          languages: ['Java', 'TypeScript', 'SQL', 'Python'],
          frameworks: ['Spring Boot', 'React', 'Node.js', 'Express', 'Tailwind'],
          databases: ['PostgreSQL', 'Redis'],
          tools: ['Docker', 'Kafka', 'Git', 'Linux']
        },
        projects: [
          {
            title: 'High-Throughput Order Settlement Engine',
            techStack: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL'],
            description: 'Idempotent transaction processing handling 1,500 checkout req/sec with zero race conditions.'
          }
        ]
      };
      setPreviewParsed(mockParsed);
      setIsUploading(false);
    }, 1200);
  };

  const handleSave = () => {
    if (previewParsed) {
      uploadResumeData(previewParsed);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative my-8">
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Candidate Resume & Profiles</h2>
            <p className="text-xs text-slate-400">Resume parsing grounds your AI mock interview questions in your real projects.</p>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-xl p-6 text-center bg-slate-950/40 transition cursor-pointer relative">
          <input 
            type="file" 
            accept=".pdf,.docx" 
            className="absolute inset-0 opacity-0 cursor-pointer" 
            onChange={(e) => {
              if (e.target.files?.[0]) handleSimulatedUpload(e.target.files[0]);
            }}
          />
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
              <p className="text-sm font-medium text-white">Parsing resume via AI Extractor...</p>
              <p className="text-xs text-slate-400">Extracting skills, frameworks, and project architectures</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <UploadCloud className="w-10 h-10 text-indigo-400 mb-2" />
              <p className="text-sm font-medium text-white">Click or drag PDF/DOCX resume here</p>
              <p className="text-xs text-slate-400 mt-1">
                {previewParsed ? `Current: ${previewParsed.fileName} (Parsed)` : 'Mandatory for placement mock interviews'}
              </p>
            </div>
          )}
        </div>

        {/* Extracted Skills Preview Tags */}
        {previewParsed && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Extracted Competencies (Grounded Context)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">v1.0 parsed</span>
            </div>

            <p className="text-xs text-slate-300 italic mb-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              "{previewParsed.summary}"
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1">Languages & Frameworks:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[...previewParsed.skills.languages, ...previewParsed.skills.frameworks].map((item, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium block mb-1">Databases & Cloud/DevOps:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[...previewParsed.skills.databases, ...previewParsed.skills.tools].map((item, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coding Handles Input */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              GitHub Username / URL
            </label>
            <input
              type="text"
              placeholder="https://github.com/username"
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
              <Code className="w-3.5 h-3.5 text-amber-400" />
              LeetCode Handle
            </label>
            <input
              type="text"
              placeholder="e.g. coder_aravind"
              value={leetcodeInput}
              onChange={(e) => setLeetcodeInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!previewParsed}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition"
          >
            Save & Update Profile
          </button>
        </div>

      </div>
    </div>
  );
};
