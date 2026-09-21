import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Mic, 
  FileText, 
  Headphones, 
  ShieldCheck, 
  GraduationCap, 
  Layers, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  Gauge, 
  MessageSquare, 
  Radio, 
  ExternalLink,
  ChevronRight,
  Globe,
  Share2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal } = useApp();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col antialiased">
      
      {/* 1. TOP DUMMY SOCIAL MEDIA & BULLETIN BAR */}
      <div className="bg-neutral-950 text-neutral-300 text-xs py-2 px-4 sm:px-8 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
            CAMPUS HIRING 2026
          </span>
          <span className="text-neutral-400 hidden sm:inline">|</span>
          <span className="text-[11px] text-neutral-300 font-medium truncate">
            Placement Season Active · Technical Interview Accelerators Live for 3,000+ Students
          </span>
        </div>

        {/* Dummy Social Media Links */}
        <div className="flex items-center space-x-4 text-neutral-400">
          <span className="text-[11px] text-neutral-500 hidden md:inline">Connect:</span>
          <a 
            href="#social-github" 
            onClick={(e) => { e.preventDefault(); window.open('https://github.com', '_blank'); }}
            className="hover:text-white transition-colors flex items-center space-x-1" 
            title="GitHub College Repository"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-[11px] hidden lg:inline">GitHub</span>
          </a>
          <a 
            href="#social-linkedin" 
            onClick={(e) => { e.preventDefault(); window.open('https://linkedin.com', '_blank'); }}
            className="hover:text-white transition-colors flex items-center space-x-1" 
            title="LinkedIn Placement Network"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z" />
            </svg>
            <span className="text-[11px] hidden lg:inline">LinkedIn</span>
          </a>
          <a 
            href="#social-twitter" 
            onClick={(e) => { e.preventDefault(); window.open('https://x.com', '_blank'); }}
            className="hover:text-white transition-colors flex items-center space-x-1" 
            title="Twitter / X Updates"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-[11px] hidden lg:inline">Twitter/X</span>
          </a>
          <a 
            href="#social-discord" 
            onClick={(e) => { e.preventDefault(); window.open('https://discord.com', '_blank'); }}
            className="hover:text-white transition-colors flex items-center space-x-1" 
            title="Campus Discord Community"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden lg:inline">Discord</span>
          </a>
        </div>
      </div>

      {/* 2. LANDING NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                R
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold tracking-tight text-neutral-900">READINESS</span>
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-neutral-100 text-neutral-700 rounded border border-neutral-200 font-mono">COLLEGE</span>
                </div>
                <span className="text-[11px] text-neutral-500">Placement & Communication Suite</span>
              </div>
            </div>

            {/* Nav anchors */}
            <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-neutral-600">
              <a href="#about" className="hover:text-neutral-900 transition-colors">About Platform</a>
              <a href="#features" className="hover:text-neutral-900 transition-colors">AI Mock Interview</a>
              <a href="#domains" className="hover:text-neutral-900 transition-colors">21 PEP Domains</a>
              <a href="#rbac" className="hover:text-neutral-900 transition-colors">Role-Based Access (RBAC)</a>
            </nav>

            {/* Auth CTA Buttons */}
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs font-medium px-4 py-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="bg-neutral-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
              >
                <span>Create Student Account</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-neutral-200/80 bg-gradient-to-b from-white to-neutral-50/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          
          <div className="inline-flex items-center space-x-2 bg-neutral-100 border border-neutral-200/80 px-3 py-1 rounded-full text-xs font-medium text-neutral-700 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-neutral-900" />
            <span>Single-College Institutional Edition (2,000–3,000 Students)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 leading-tight">
            AI-Powered Placement Readiness &amp; Communication Platform
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-neutral-600 leading-relaxed">
            Elevate campus recruitment outcomes with real-time speech recognition, automated acoustic cadence analysis, Groq AI resume grounding, and institutional governance across 5 stakeholder roles.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => openAuthModal('register')}
              className="bg-neutral-900 hover:bg-black text-white text-xs sm:text-sm font-medium px-6 py-3 rounded-xl transition-all shadow-sm flex items-center space-x-2"
            >
              <span>Get Started as Student</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#rbac"
              className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-medium px-6 py-3 rounded-xl transition-all shadow-2xs flex items-center space-x-2"
            >
              <span>Explore Institutional Roles</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </a>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-500 font-mono">
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" /> Groq Llama 3.3 / GPT-120B AI</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" /> Real Web Speech Recognition</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" /> PostgreSQL Normalized Schema</span>
            <span className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" /> 5-Tier RBAC Hierarchy</span>
          </div>

        </div>
      </section>

      {/* 4. RBAC INSTITUTIONAL GOVERNANCE & ROLES */}
      <section id="rbac" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] font-semibold text-neutral-500 font-mono uppercase tracking-wider">
            Institutional Role-Based Access Control (RBAC)
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            5-Tier Institutional Governance Hierarchy
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            Strict single-entry authentication where the system automatically verifies credentials and resolves role permissions.
          </p>
        </div>

        {/* Super Admin Root Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <span className="text-2xl">👑</span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-900 uppercase font-mono">Root Administrator Credentials</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 font-mono">Active</span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Login with <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">admin@college.edu</code> and password <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">password123</code> to provision your first Program Admin.
              </p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal('login')}
            className="whitespace-nowrap bg-amber-900 hover:bg-black text-white text-xs font-medium px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
          >
            <span>Sign In to Super Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* 1. Super Admin Card */}
          <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-lg font-bold">
                👑
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono uppercase">
                SUPER ADMIN
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Super Administrator</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Root system authority. Creates and activates Program Admins, tracks campus telemetry across all colleges and departments.
              </p>
            </div>
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs font-mono space-y-1">
              <p className="text-neutral-500">Root Account: <strong className="text-neutral-900">admin@college.edu</strong></p>
              <p className="text-neutral-500">Access: <strong className="text-emerald-700">Root Provisioning</strong></p>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <span>Sign In as Super Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Program Admin Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-lg font-bold">
                🏛️
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                PROGRAM ADMIN
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Program Admin / Dean of Placement</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Provisioned by Super Admin. Onboards Faculty Mentors and Domain Trainers. Assigns student cohorts and dispatches drills.
              </p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono space-y-1">
              <p className="text-neutral-500">Provisioned By: <strong className="text-neutral-900">Super Admin</strong></p>
              <p className="text-neutral-500">Access: <strong className="text-neutral-900">Faculty &amp; Trainer Onboarding</strong></p>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Faculty Mentor Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
                👨‍🏫
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                FACULTY MENTOR
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Faculty Mentor</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Provisioned by Program Admin. Enrolls student accounts into tracks and views scores ONLY for students assigned directly to them.
              </p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono space-y-1">
              <p className="text-neutral-500">Provisioned By: <strong className="text-neutral-900">Program Admin</strong></p>
              <p className="text-neutral-500">Access: <strong className="text-neutral-900">Student Enrollment &amp; Mentee Tracking</strong></p>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4. Domain Trainer Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-bold">
                🏢
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                DOMAIN TRAINER
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Domain Trainer</h3>
              <p className="text-xs text-neutral-600 mt-1">
                External industry experts on active tenures. Dispatches mock interview assignments and reviews technical scores. Cannot create student accounts.
              </p>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono space-y-1">
              <p className="text-neutral-500">Provisioned By: <strong className="text-neutral-900">Program Admin</strong></p>
              <p className="text-neutral-500">Access: <strong className="text-neutral-900">Mock Drills &amp; Rubric Scoring</strong></p>
            </div>
            <button
              onClick={() => openAuthModal('login')}
              className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <span>Sign In to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Student Candidate Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all md:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg font-bold">
                🎓
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                STUDENT
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Student Candidate Portal</h3>
              <p className="text-xs text-neutral-600 mt-1">
                Enrolled by Faculty Mentors (College Tracks) or Self-Registered with Email Verification Code (External Track). Resume grounding, speech telemetry, and AI interviews.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono">
              <p className="text-neutral-500">Internal Track: <strong className="text-neutral-900">Enrolled by Faculty Mentor</strong></p>
              <p className="text-neutral-500">External Track: <strong className="text-neutral-900">Self-Registration (Verified Code)</strong></p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="w-full sm:flex-1 bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <span>Sign In with Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="w-full sm:w-auto bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-medium px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Candidate Self-Registration</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. ABOUT THE WEBSITE & CORE ARCHITECTURAL MODULES */}
      <section id="about" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-neutral-200/80 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] font-semibold text-neutral-500 font-mono uppercase tracking-wider">
            Deep Technical Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Engineered for Campus Technical Hiring
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            A comprehensive overview of how the platform transforms students into placement-ready engineering candidates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Mic className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Live Voice &amp; Delivery Telemetry</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Integrates real Web Speech Recognition to stream microphone speech into text live, paired with browser Text-to-Speech (TTS) and live Words-Per-Minute (WPM) and conversational filler tracking.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Groq ATS Resume Grounding</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Extracts competencies from candidate PDF or text resumes into categorized skills and project archetypes. Ephemeral RAG synthesizes follow-up questions tied to their verified projects.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Listening Comprehension Lab</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Simulates corporate technical briefings with strict 2-replay audio throttling, multi-choice checks, and automated active listening rubrics.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Two-Agent AI Suggestion Coach</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Agent 1 provides conversational coaching guidance while Agent 2 generates structured terminology replacement cards (before vs after phrasing) and S-T-A-R structural advice.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">Proctoring &amp; Anti-Tampering</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tracks window visibility changes and tab switches. Automatically warns candidates and flags sessions exceeding 4 tab switches for placement officer review.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-900">21 Specialized PEP Domains</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Pre-configured domain rubrics spanning Full Stack, DevOps, AI/ML, Cyber Security, Embedded Systems, FinTech, VLSI, Robotics, and Cloud Architecture.
            </p>
          </div>

        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
          
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              R
            </div>
            <div>
              <p className="font-semibold text-neutral-900">College Placement &amp; Training Ecosystem</p>
              <p className="text-[11px] text-neutral-400">Department of Placement &amp; Career Guidance · Institutional Edition</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-neutral-500">
            <a href="#about" className="hover:text-neutral-900">About</a>
            <a href="#rbac" className="hover:text-neutral-900">RBAC Roles</a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Institutional Data Protection: Student telemetry is stored in on-premise PostgreSQL college database.'); }} className="hover:text-neutral-900">Data Policy</a>
            <button onClick={() => openAuthModal('login')} className="hover:text-neutral-900 font-medium">Portal Login</button>
          </div>

          <p className="text-neutral-400 text-[11px]">
            &copy; {new Date().getFullYear()} College Readiness Platform. All rights reserved.
          </p>

        </div>
      </footer>

    </div>
  );
};
