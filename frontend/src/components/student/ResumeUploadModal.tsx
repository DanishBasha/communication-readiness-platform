import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UploadCloud, FileText, CheckCircle2, Sparkles, X, Code, GitBranch } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-[28px] p-6 sm:p-8 shadow-2xl relative my-8 text-stone-900">
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 p-1 rounded-xl hover:bg-stone-100 transition font-bold"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">Candidate Resume & Profiles</h2>
            <p className="text-xs text-stone-500">Mandatory resume upload grounds your mock interview questions in your real projects.</p>
          </div>
        </div>

        {/* Dropzone */}
        <div className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-2xl p-6 text-center bg-stone-50/60 transition cursor-pointer relative">
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
              <Sparkles className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
              <p className="text-sm font-bold text-stone-900">Extracting competencies via AI...</p>
              <p className="text-xs text-stone-500">Parsing frameworks, architectures, and projects</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <UploadCloud className="w-10 h-10 text-emerald-700 mb-2" />
              <p className="text-sm font-bold text-stone-900">Click or drag PDF/DOCX resume here</p>
              <p className="text-xs text-stone-500 mt-1">
                {previewParsed ? `Loaded: ${previewParsed.fileName} (Parsed)` : 'Mandatory for placement mock interviews'}
              </p>
            </div>
          )}
        </div>

        {/* Extracted Skills Preview Tags */}
        {previewParsed && (
          <div className="mt-5 p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Extracted Competencies
              </span>
              <span className="text-[11px] text-stone-500 font-mono">v1.0 parsed</span>
            </div>

            <p className="text-xs text-stone-700 italic mb-3 bg-white p-3 rounded-xl border border-stone-200">
              "{previewParsed.summary}"
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-stone-500 font-bold block mb-1">Languages & Frameworks:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[...previewParsed.skills.languages, ...previewParsed.skills.frameworks].map((item, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-500 font-bold block mb-1">Databases & Cloud/Tools:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[...previewParsed.skills.databases, ...previewParsed.skills.tools].map((item, idx) => (
                    <span key={idx} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-800 border border-stone-300">
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
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-1">
              <GitBranch className="w-3.5 h-3.5 text-stone-600" />
              GitHub Username / URL
            </label>
            <input
              type="text"
              placeholder="https://github.com/username"
              value={githubInput}
              onChange={(e) => setGithubInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 mb-1">
              <Code className="w-3.5 h-3.5 text-amber-600" />
              LeetCode Handle
            </label>
            <input
              type="text"
              placeholder="e.g. coder_aravind"
              value={leetcodeInput}
              onChange={(e) => setLeetcodeInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!previewParsed}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#191C1A] hover:bg-stone-800 disabled:opacity-50 text-white shadow-md transition"
          >
            Save Profile & Ground Context
          </button>
        </div>

      </div>
    </div>
  );
};
