import React from 'react';
import { 
  Layers, 
  Plus, 
  ArrowRight
} from 'lucide-react';
import { PEP_DOMAINS } from '../../data/mockData';

export const ProgramAdminPortal: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Program Domain Administration</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-700 rounded border border-neutral-200 font-mono">HOPE & PEP TRACKS</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Assign practice interview sessions, configure LeetCode criteria thresholds, and manage the 21 PEP specialized domain tracks.
          </p>
        </div>

        <button className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Cohort Interview Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white">
              ★ HOPE Elite Cohort
            </span>
            <span className="text-xs font-mono text-neutral-500">58 Active Candidates</span>
          </div>

          <h3 className="text-base font-semibold tracking-tight text-neutral-900">
            High Caliber Product Track
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Top tier cohort with accelerated DSA and low-level system design curriculum. Minimum 250+ LeetCode problems required.
          </p>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-700">
              <span className="font-medium">Assigned AI Mock Rounds:</span>
              <span className="font-mono font-bold text-neutral-900">4 Mandatory Sessions</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span className="font-medium">Average Cohort Readiness:</span>
              <span className="font-mono font-bold text-emerald-600">88.4 / 100</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
              PEP Specialized Tracks
            </span>
            <span className="text-xs font-mono text-neutral-500">21 Domain Blueprints</span>
          </div>

          <h3 className="text-base font-semibold tracking-tight text-neutral-900">
            Professional Enhancement Program
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Targeted technical interview banks curated for Cloud, DevOps, Blockchain, Embedded IoT, and Full Stack competencies.
          </p>

          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-700">
              <span className="font-medium">Active Domain Trainers:</span>
              <span className="font-mono font-bold text-neutral-900">14 Visiting Experts</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span className="font-medium">Candidate Enrollment:</span>
              <span className="font-mono font-bold text-neutral-900">1,820 Students</span>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900">The 21 PEP Technical Domains</h3>
            <p className="text-xs text-neutral-500">Click any domain track to review the customized question syllabus</p>
          </div>
          <span className="text-xs font-mono text-neutral-400">21 Active Tracks</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
          {PEP_DOMAINS.map((domain) => (
            <div 
              key={domain}
              className="p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 transition-all cursor-pointer group"
            >
              <p className="text-xs font-medium text-neutral-800 group-hover:text-black truncate">
                {domain}
              </p>
              <div className="flex items-center justify-between mt-1 text-[10px] text-neutral-400">
                <span>Active Track</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
