import React from 'react';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  ArrowRight
} from 'lucide-react';

export const TrainerPortal: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Visiting Domain Trainer Workspace</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white rounded font-mono">10-15 DAY TENURE</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Active industry expert tenure: Conduct specialized mock rounds and submit domain rubrics.
          </p>
        </div>

        <button className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Specialized Domain Mock</span>
        </button>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-neutral-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Active Contract: Sept 15 – Sept 30, 2026</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">Day 5 of 15 Active</span>
          </div>
          <h3 className="text-base font-semibold text-neutral-900">Domain: Cloud DevOps & Distributed Systems</h3>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-[10px] text-neutral-400 font-mono">BATCH SIZE</p>
            <p className="text-sm font-bold text-neutral-900">45 Students</p>
          </div>
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-[10px] text-neutral-400 font-mono">COMPLETED</p>
            <p className="text-sm font-bold text-neutral-900">28 Mocks</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Assigned Specialized Mock Rounds</h3>
          <p className="text-xs text-neutral-500">Evaluate candidates on microservice resiliency, Docker orchestration, and Kubernetes pod scaling</p>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { title: 'Docker & Kubernetes Ingress Controllers', cohort: 'PEP Track #04', completed: '12 / 15 Evaluated' },
            { title: 'Kafka Partition Lag & High Concurrency Resiliency', cohort: 'HOPE Elite', completed: '16 / 18 Evaluated' },
            { title: 'AWS Cloud Architecture & Terraform State Management', cohort: 'PEP Track #07', completed: 'Scheduled for Tomorrow' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between hover:bg-neutral-100/70 transition-colors">
              <div>
                <p className="text-xs font-semibold text-neutral-900">{item.title}</p>
                <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono">{item.cohort}</span>
                  <span>•</span>
                  <span>{item.completed}</span>
                </div>
              </div>
              <button className="flex items-center space-x-1 text-xs font-medium text-neutral-800 hover:text-black">
                <span>Review evaluations</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
