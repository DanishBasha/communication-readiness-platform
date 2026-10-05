import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandIcon } from '../common/BrandLogo';
import { 
  Sparkles, 
  Mic, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Volume2, 
  Zap, 
  Award, 
  Users, 
  Lock, 
  Headphones, 
  Check, 
  Sun, 
  Moon 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal, setActiveView, theme, toggleTheme } = useApp();
  const [activeTab, setActiveTab] = useState<'interview' | 'listening' | 'proctoring' | 'rbac'>('interview');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [heroTab, setHeroTab] = useState<'interview' | 'telemetry' | 'proctoring'>('interview');

  const faqItems = [
    {
      question: "What is LatchUp — Let's Catch Up?",
      answer: "LatchUp is a unified placement and communication readiness platform. Colleges use it to run assessments with proctoring, while students use AI-driven mock interviews, speaking pace tracking, and listening practice labs to prepare for real campus recruitments."
    },
    {
      question: "Is LatchUp free for enrolled candidates?",
      answer: "Yes, practice is included. When institutions onboard, every student receives 5 practice coin credits that recharge automatically upon drills or cooldowns. Students never have to pay out of pocket to sharpen their interview delivery and speech fluency."
    },
    {
      question: "How does the hands-free AI interview engine work?",
      answer: "Our voice system speaks questions aloud through text-to-speech, automatically listens to your microphone once speaking finishes, and intelligently detects silence to advance turns hands-free. Real-time Web Speech recognition transcribes your words while analyzing pace (WPM), filler words ('um', 'like', 'you know'), and technical depth."
    },
    {
      question: "What anti-cheating and proctoring safeguards are built in?",
      answer: "Assessments operate in browser-native fullscreen mode with strict tab switch detection. Each tab switch incurs a logged proctoring infraction. Exceeding 4 infractions automatically terminates the session and revokes assessment access for that assignment."
    },
    {
      question: "Can colleges self-register and manage their own departments?",
      answer: "Absolutely. Any institution can register in under two minutes to automatically provision isolated databases, foundational departments (CSE, IT, ECE), and Super Admin credentials to invite Deans, Placement Coordinators, and Faculty Mentors."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#141414] flex flex-col antialiased selection:bg-[#141414] selection:text-white font-sans">
      
      {/* ──────────────────────────────────────────────────────────
          1. HEADER / NAVBAR
      ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#ededed] transition-colors w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo & Name (Clean, Mobbin typography) */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer select-none" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <BrandIcon size="md" />
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-[#141414] font-sans leading-none">
                  Latch<span className="text-[#717171] font-semibold">Up</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[#fafafa] text-[#141414] rounded-md border border-[#ededed] font-mono tracking-wider uppercase">
                  LET'S CATCH UP
                </span>
              </div>
            </div>

            {/* Navigation Anchor Links */}
            <nav className="hidden md:flex items-center space-x-7 text-xs font-medium text-[#717171]">
              <a href="#institutions" className="hover:text-[#141414] transition-colors">For Institutions</a>
              <a href="#students" className="hover:text-[#141414] transition-colors">For Students</a>
              <a href="#features" className="hover:text-[#141414] transition-colors">Interactive Demos</a>
              <a href="#governance" className="hover:text-[#141414] transition-colors">5-Tier Governance</a>
              <a href="#faq" className="hover:text-[#141414] transition-colors">FAQ</a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              <button
                type="button"
                onClick={() => openAuthModal('register_institution')}
                className="text-xs font-semibold px-3 py-2 bg-[#eff5ff] hover:bg-[#e0ecff] text-[#0065ff] border border-[#d0e1fd] rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                title="Register your college or university"
              >
                <Building2 className="w-3.5 h-3.5 text-[#0065ff]" />
                <span className="hidden sm:inline">Register</span>
                <span>Institution</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveView('ACTIVATE_INVITE')}
                className="text-xs font-semibold px-3 py-2 text-[#0065ff] hover:text-[#0047f0] hover:bg-[#eff5ff] rounded-xl transition-colors cursor-pointer hidden lg:flex items-center space-x-1"
              >
                <span>Activate Invite</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Dark Mode"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-neutral-600" />
                )}
              </button>

              <button
                onClick={() => openAuthModal('login')}
                className="text-xs font-medium px-3.5 py-2 text-[#717171] hover:text-[#141414] hover:bg-[#fafafa] rounded-xl transition-colors cursor-pointer"
              >
                Sign In
              </button>

              <button
                onClick={() => openAuthModal('register')}
                className="bg-[#141414] hover:bg-[#262626] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs border border-black/10 flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Start Practicing</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. HERO SECTION: LATCHUP VOICE AI & PLACEMENT SUITE
      ────────────────────────────────────────────────────────── */}
      <section className="bg-white pt-12 pb-16 sm:pt-16 sm:pb-24 overflow-hidden border-b border-[#ededed]">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column (6 cols): Original LatchUp Messaging & CTA */}
          <div className="lg:col-span-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* Tagline Badge with Mobbin Style */}
            <div className="inline-flex items-center space-x-2 border border-[#ededed] bg-[#fafafa] rounded-full px-3.5 py-1 text-xs font-medium text-[#141414] shadow-2xs mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#0065ff]" />
              <span className="font-semibold tracking-tight">LatchUp</span>
              <span className="text-[#adadad]">·</span>
              <span className="text-[#717171] font-mono text-[11px]">Let's Catch Up</span>
            </div>

            {/* Display Title - Mobbin Typography */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#141414] leading-[1.12] mb-6 font-sans">
              Master Technical &amp; HR Interviews with Voice AI.
            </h1>

            {/* Subtitle */}
            <p className="text-[16px] sm:text-[17px] leading-[1.65] text-[#717171] max-w-[52ch] mb-8 font-normal font-sans">
              LatchUp provides colleges with proctored assessments while equipping students with interactive AI mock interviews, speaking pace tracking, and listening practice drills.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={() => openAuthModal('register_institution')}
                className="inline-flex justify-center items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] sm:text-[15px] font-semibold text-white bg-[#141414] hover:bg-[#262626] border border-black/10 transition-all duration-200 shadow-sm cursor-pointer group"
              >
                <span>Host College Assessments</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => openAuthModal('register')}
                className="inline-flex justify-center items-center px-7 py-3.5 rounded-xl text-[14px] sm:text-[15px] font-semibold text-[#141414] bg-white border border-[#ededed] hover:bg-[#fafafa] transition-all duration-200 shadow-2xs cursor-pointer"
              >
                Start Student Practice
              </button>
            </div>

            {/* Credentials / Micro-indicators */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#717171] font-sans">
              <div className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-[#0065ff]" />
                <span>Hands-free AI voice turn-taking</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-[#0065ff]" />
                <span>Real-time speaking pace (WPM)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-[#0065ff]" />
                <span>Anti-cheat 4-strike proctoring</span>
              </div>
            </div>

          </div>

          {/* Right Column (6 cols): Bespoke LatchUp Interactive Studio Console */}
          <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:mx-0 lg:ml-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            <div className="bg-white border border-[#ededed] rounded-2xl shadow-xl shadow-black/[0.04] overflow-hidden transition-all duration-300 hover:shadow-2xl font-sans">
              
              {/* Studio Header Bar */}
              <div className="px-4 py-3 bg-[#141414] text-white flex items-center justify-between border-b border-[#262626]">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0065ff] inline-block" />
                  </div>
                  <span className="text-[11px] font-mono text-[#adadad] font-semibold tracking-wide pl-1.5 border-l border-[#333333]">
                    LatchUp AI Studio
                  </span>
                </div>

                {/* Interactive Mode Pills */}
                <div className="flex items-center bg-[#262626] rounded-lg p-0.5 text-[10px] font-mono border border-[#333333]">
                  <button
                    type="button"
                    onClick={() => setHeroTab('interview')}
                    className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                      heroTab === 'interview'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#adadad] hover:text-white'
                    }`}
                  >
                    Voice Drill
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab('telemetry')}
                    className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                      heroTab === 'telemetry'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#adadad] hover:text-white'
                    }`}
                  >
                    Speech Stats
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroTab('proctoring')}
                    className={`px-2.5 py-1 rounded-md transition-all font-semibold cursor-pointer ${
                      heroTab === 'proctoring'
                        ? 'bg-white text-[#141414] shadow-xs'
                        : 'text-[#adadad] hover:text-white'
                    }`}
                  >
                    Proctoring
                  </button>
                </div>
              </div>

              {/* View 1: AI Mock Interview (Default) */}
              {heroTab === 'interview' && (
                <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-300">
                  
                  {/* Top Status & Audio Waveform Banner */}
                  <div className="bg-[#141414] rounded-xl p-4 text-white space-y-3 border border-[#262626] shadow-inner">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#0065ff] animate-pulse" />
                        <span className="text-[#ededed] font-semibold text-[11px]">Turn 2 of 5 · Technical Interview</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[#ededed] border border-white/20 text-[10px]">
                        🪙 1 Coin
                      </span>
                    </div>

                    {/* Dynamic Soundwave Visualizer with Mobbin Blue */}
                    <div className="flex items-center justify-center space-x-1 py-2 h-10">
                      {[10, 22, 14, 26, 18, 30, 16, 24, 12, 28, 20, 32, 18, 26, 14, 28, 20, 15, 22, 11].map((height, i) => (
                        <div
                          key={i}
                          className="w-1 bg-[#0065ff] rounded-full origin-center"
                          style={{
                            height: `${height}px`,
                            animation: `soundwaveBar 1.2s ease-in-out infinite`,
                            animationDelay: `${(i * 0.07).toFixed(2)}s`
                          }}
                        />
                      ))}
                    </div>

                    {/* AI Question Box */}
                    <div className="bg-[#262626]/70 rounded-lg p-3 border border-[#333333] text-xs text-[#ededed] leading-relaxed font-sans">
                      <div className="flex items-center space-x-1.5 text-[#adadad] font-mono text-[10px] mb-1">
                        <Mic className="w-3 h-3 text-[#0065ff]" />
                        <span>AI Interviewer (Speaking):</span>
                      </div>
                      "Walk me through how you handled database indexing and concurrency bottlenecks in your full-stack project."
                    </div>
                  </div>

                  {/* Candidate Real-Time Web Speech Box */}
                  <div className="bg-[#fafafa] rounded-xl p-3.5 border border-[#ededed] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center space-x-1.5 text-[#0065ff] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0065ff] animate-ping" />
                        <span>Web Speech Transcribing...</span>
                      </div>
                      <span className="text-[#adadad] text-[10px]">Silence Auto-Advance</span>
                    </div>
                    <p className="text-xs text-[#141414] leading-relaxed font-sans">
                      "In our microservice, we implemented composite B-Tree indexes on tenant identifiers and optimized cache eviction with Redis pub/sub..."
                    </p>
                  </div>

                  {/* Acoustic Telemetry Dock */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#fafafa] border border-[#ededed] text-center">
                      <span className="text-[10px] font-mono text-[#adadad] block uppercase">Pace</span>
                      <span className="text-sm font-bold text-[#141414] font-mono">134 WPM</span>
                      <span className="text-[9px] text-[#0065ff] block font-medium">Optimal</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#fafafa] border border-[#ededed] text-center">
                      <span className="text-[10px] font-mono text-[#adadad] block uppercase">Fillers</span>
                      <span className="text-sm font-bold text-[#141414] font-mono">0 Detected</span>
                      <span className="text-[9px] text-[#717171] block font-medium">Clean delivery</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#fafafa] border border-[#ededed] text-center">
                      <span className="text-[10px] font-mono text-[#adadad] block uppercase">Clarity</span>
                      <span className="text-sm font-bold text-[#141414] font-mono">94%</span>
                      <span className="text-[9px] text-[#0065ff] block font-medium">STAR Framework</span>
                    </div>
                  </div>

                </div>
              )}

              {/* View 2: Cadence Telemetry */}
              {heroTab === 'telemetry' && (
                <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-[#ededed]">
                    <div>
                      <h4 className="text-sm font-bold text-[#141414]">Speech &amp; Delivery Stats</h4>
                      <p className="text-[11px] text-[#717171] font-mono">Performance breakdown across interview turns</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd]">
                      Grade: A+
                    </span>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#141414]">Verbal Pace &amp; Stability</span>
                        <span className="font-mono text-[#0065ff] font-bold">136 WPM avg</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#ededed] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0065ff] rounded-full w-[88%]" />
                      </div>
                      <span className="text-[10px] text-[#adadad] font-mono">Target range: 125–145 words per minute</span>
                    </div>

                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#141414]">Filler Word Suppression</span>
                        <span className="font-mono text-[#141414] font-bold">&lt; 1% (Excellent)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#ededed] rounded-full overflow-hidden">
                        <div className="h-full bg-[#141414] rounded-full w-[94%]" />
                      </div>
                      <span className="text-[10px] text-[#adadad] font-mono">Flagged words: 0 'um', 0 'like', 0 'you know'</span>
                    </div>

                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#141414]">Technical Depth &amp; STAR Structure</span>
                        <span className="font-mono text-[#0065ff] font-bold">92 / 100</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#ededed] rounded-full overflow-hidden">
                        <div className="h-full bg-[#0065ff] rounded-full w-[92%]" />
                      </div>
                      <span className="text-[10px] text-[#adadad] font-mono">Structured STAR progression validated</span>
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: Proctoring Guard */}
              {heroTab === 'proctoring' && (
                <div className="p-5 sm:p-6 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-3 border-b border-[#ededed]">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-[#0065ff]" />
                      <h4 className="text-sm font-bold text-[#141414]">Proctoring &amp; Session Integrity</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#fafafa] text-[#141414] border border-[#ededed]">
                      SECURE
                    </span>
                  </div>

                  <div className="bg-[#eff5ff] border border-[#d0e1fd] rounded-xl p-3.5 space-y-1 text-[#0047f0] font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono">STRICT FULLSCREEN ACTIVE</span>
                      <span className="text-[10px] font-mono font-bold text-[#0065ff]">0 INFRACTIONS</span>
                    </div>
                    <p className="text-[11px] text-[#0047f0]/80 leading-relaxed font-sans">
                      Session is operating under tamper-proof window locks. Background tab switches are logged directly to the institutional Dean's audit log.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 font-sans">
                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed] text-xs">
                      <span className="text-[10px] font-mono text-[#adadad] block uppercase">Tab Switch Policy</span>
                      <span className="font-bold text-[#141414] mt-0.5 block">4-Strike Limit</span>
                      <span className="text-[10px] text-rose-600 mt-1 block">Strike 4 = Auto-Revoke</span>
                    </div>

                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed] text-xs">
                      <span className="text-[10px] font-mono text-[#adadad] block uppercase">Institutional Batch</span>
                      <span className="font-bold text-[#141414] mt-0.5 block">847 Candidates</span>
                      <span className="text-[10px] text-[#0065ff] mt-1 block font-medium">3 Concurrent Drives</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Studio Bottom Bar */}
              <div className="px-4 py-2.5 bg-[#fafafa] border-t border-[#ededed] flex items-center justify-between text-[11px] font-mono text-[#adadad]">
                <span className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0065ff] inline-block" />
                  <span>LatchUp Live Activity v2.4</span>
                </span>
                <span className="text-[#adadad]">Click tabs above to preview</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          3. DUAL PILLARS SECTION (MOBBIN DESIGN SYSTEM)
      ────────────────────────────────────────────────────────── */}
      <section id="institutions" className="py-20 sm:py-28 bg-white border-b border-[#ededed] font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#0065ff] bg-[#eff5ff] px-2.5 py-1 rounded-md border border-[#d0e1fd]">
              Dual-Purpose Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#141414] mt-4 mb-5 font-sans">
              Two Sides of the Same Ecosystem.
            </h2>
            <p className="text-[17px] leading-[1.65] text-[#717171] max-w-2xl mx-auto font-normal font-sans">
              Institutions run rigorous, proctored assessments on their private tenant portal, while students prepare with adaptive AI mock interviews and listening labs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Pillar 1: For Institutions */}
            <div className="bg-[#fafafa] border border-[#ededed] rounded-3xl p-8 sm:p-10 transition-all duration-300 hover:border-[#141414] hover:shadow-xl hover:bg-white group font-sans">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl border border-[#ededed] bg-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6 text-[#0065ff]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#141414] tracking-tight font-sans">
                    For Institutions &amp; Colleges
                  </h3>
                  <p className="text-xs text-[#717171] font-mono">
                    Run assessments on your private portal
                  </p>
                </div>
              </div>

              <ul className="space-y-3.5 mb-8">
                {[
                  "Self-serve college registration with isolated database schemas",
                  "Automated proctoring with 4-strike tab-switch enforcement",
                  "Auto-graded speech turns & speech clarity reports",
                  "5-tier institutional governance: Super Admin, Dean, HOD, Mentor"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] text-[#717171] leading-relaxed font-sans">
                    <CheckCircle2 className="w-4 h-4 text-[#0065ff] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-[#ededed] flex items-center justify-between font-sans">
                <button
                  onClick={() => openAuthModal('register_institution')}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#141414] hover:text-[#0065ff] transition-colors cursor-pointer group/link"
                >
                  <span>Host Institutional Drills</span>
                  <ArrowRight className="w-3.5 h-3.5 group-link-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-[10px] font-mono text-[#adadad]">Under 2 min setup</span>
              </div>
            </div>

            {/* Pillar 2: For Students */}
            <div id="students" className="bg-[#fafafa] border border-[#ededed] rounded-3xl p-8 sm:p-10 transition-all duration-300 hover:border-[#141414] hover:shadow-xl hover:bg-white group font-sans">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl border border-[#ededed] bg-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Award className="w-6 h-6 text-[#0065ff]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#141414] tracking-tight font-sans">
                    For Students &amp; Candidates
                  </h3>
                  <p className="text-xs text-[#717171] font-mono">
                    Practice until you are placement-ready
                  </p>
                </div>
              </div>

              <ul className="space-y-3.5 mb-8">
                {[
                  "Hands-free voice interview room with natural turn-taking",
                  "Speech delivery metrics: Words Per Minute (WPM) & filler-word count",
                  "Listening comprehension lab with audio playback & question turns",
                  "Instant diagnostic scorecards with improvement checklists"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs sm:text-[13px] text-[#717171] leading-relaxed font-sans">
                    <CheckCircle2 className="w-4 h-4 text-[#0065ff] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-[#ededed] flex items-center justify-between font-sans">
                <button
                  onClick={() => openAuthModal('register')}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#141414] hover:text-[#0065ff] transition-colors cursor-pointer group/link"
                >
                  <span>Start Student Practice</span>
                  <ArrowRight className="w-3.5 h-3.5 group-link-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-[10px] font-mono text-[#adadad]">Included Credits</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. INTERACTIVE FEATURE DEMOS (MOBBIN DESIGN SYSTEM)
      ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-[#fafafa] border-b border-[#ededed] font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#adadad]">
              Interactive Platform Demos
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141414] mt-3 mb-4 font-sans">
              Engineered for genuine communication readiness.
            </h2>
            <p className="text-sm text-[#717171] font-sans">
              Toggle between the core modules below to preview how candidates and administrators interact with LatchUp.
            </p>
          </div>

          {/* Interactive Tab Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 font-sans">
            {[
              { id: 'interview', label: 'AI Voice Interview Room', icon: Mic },
              { id: 'listening', label: 'Listening Comprehension Lab', icon: Headphones },
              { id: 'proctoring', label: 'Proctoring & Anti-Cheat', icon: ShieldCheck },
              { id: 'rbac', label: 'College Governance', icon: Building2 }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#141414] text-white shadow-xs' 
                      : 'bg-white hover:bg-[#fafafa] text-[#717171] border border-[#ededed]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#adadad]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Showcase Card */}
          <div className="bg-white border border-[#ededed] rounded-3xl p-6 sm:p-10 shadow-lg shadow-black/[0.02] font-sans">
            
            {activeTab === 'interview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-in fade-in duration-300">
                <div className="space-y-4 font-sans">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] text-[11px] font-mono font-bold">
                    <Zap className="w-3 h-3 text-[#0065ff]" />
                    <span>HANDS-FREE REAL-TIME TURN TAKING</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#141414] font-sans">
                    AI Mock Interview Room with Speaking Pace Analysis
                  </h3>
                  <p className="text-xs sm:text-sm text-[#717171] leading-relaxed font-sans">
                    Candidates sit face-to-face with an interactive 3D particle voice orb that talks through questions, listens to microphone audio, and transitions turns without clicking buttons.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed]">
                      <span className="text-[10px] font-mono text-[#adadad] block">WPM Delivery</span>
                      <span className="text-sm font-bold text-[#141414] font-sans">130–150 WPM</span>
                      <span className="text-[10px] text-[#0065ff] block mt-0.5">Optimal pace target</span>
                    </div>
                    <div className="p-3 bg-[#fafafa] rounded-xl border border-[#ededed]">
                      <span className="text-[10px] font-mono text-[#adadad] block">Filler Disqualification</span>
                      <span className="text-sm font-bold text-[#141414] font-sans">&lt; 3% threshold</span>
                      <span className="text-[10px] text-[#0065ff] block mt-0.5">Real-time detection</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center space-x-2 text-xs font-bold text-[#141414] hover:text-[#0065ff] pt-2 cursor-pointer font-sans"
                  >
                    <span>Try Sample Interview Turn &rarr;</span>
                  </button>
                </div>

                {/* Simulated Room Graphic */}
                <div className="bg-[#141414] rounded-2xl p-6 text-white space-y-5 border border-[#262626] shadow-xl font-sans">
                  <div className="flex items-center justify-between pb-3 border-b border-[#262626] text-xs font-sans">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0065ff] animate-ping" />
                      <span className="font-mono text-[#adadad]">Technical Turn 2 of 5</span>
                    </div>
                    <span className="font-mono text-[#ededed] bg-white/10 px-2 py-0.5 rounded border border-white/20 text-[10px]">
                      🪙 1 Coin at Stake
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-[#0065ff]/15 border-2 border-[#0065ff]/40 flex items-center justify-center animate-pulse">
                      <Mic className="w-8 h-8 text-[#0065ff]" />
                    </div>
                    <p className="text-xs text-[#adadad] text-center font-mono">
                      Interviewer is speaking... Listening begins automatically.
                    </p>
                  </div>
                  <div className="p-3 bg-[#262626]/70 rounded-xl border border-[#333333] text-xs text-[#ededed] font-mono">
                    "Explain how you design an idempotent payment processing API."
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'listening' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-in fade-in duration-300 font-sans">
                <div className="space-y-4 font-sans">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] text-[11px] font-mono font-bold">
                    <Volume2 className="w-3 h-3 text-[#0065ff]" />
                    <span>LISTENING COMPREHENSION LAB</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#141414] font-sans">
                    Listening Comprehension Lab with Resume Grounding
                  </h3>
                  <p className="text-xs sm:text-sm text-[#717171] leading-relaxed font-sans">
                    Evaluates listening clarity and context retention. Audio narratives are generated dynamically from the candidate's actual projects and technical stack.
                  </p>
                  <ul className="space-y-2 text-xs text-[#717171] font-sans">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0065ff]" />
                      <span>Single-play narrative audio with strict replay limits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0065ff]" />
                      <span>Spoken voice answers transcribed with precision Web Speech</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0065ff]" />
                      <span>Instant diagnostic score and answer comparison</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="inline-flex items-center space-x-2 text-xs font-bold text-[#141414] hover:text-[#0065ff] pt-2 cursor-pointer font-sans"
                  >
                    <span>Practice Listening Drills &rarr;</span>
                  </button>
                </div>

                <div className="bg-[#fafafa] rounded-2xl p-6 border border-[#ededed] space-y-4 shadow-sm font-sans">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#141414]">Audio Scenario: FinPay Incident</span>
                    <span className="text-[#adadad]">1 of 3 Questions</span>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-[#ededed] flex items-center justify-between font-sans">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-[#eff5ff] text-[#0065ff] flex items-center justify-center">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#141414] font-sans">System Incident Audio</div>
                        <div className="text-[10px] text-[#adadad] font-mono">Duration: 42s · 1 replay left</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] font-bold font-mono rounded">
                      PLAYING
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-[#ededed] rounded-xl text-xs text-[#141414] font-sans">
                    <strong className="text-[#0065ff]">Question:</strong> What root cause was identified during the distributed deadlock?
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'proctoring' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-in fade-in duration-300 font-sans">
                <div className="space-y-4 font-sans">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] text-[11px] font-mono font-bold">
                    <Lock className="w-3 h-3 text-[#DC2626]" />
                    <span>ANTI-CHEATING &amp; SESSION INTEGRITY</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#141414] font-sans">
                    Proctoring Enforced with 4 Tab-Switch Limit
                  </h3>
                  <p className="text-xs sm:text-sm text-[#717171] leading-relaxed font-sans">
                    Built-in institutional proctoring guarantees fairness. Fullscreen is enforced, background window switches are counted, and disqualifications are permanent.
                  </p>
                  <div className="space-y-2 text-xs text-[#717171] font-sans">
                    <div className="p-2.5 bg-[#fafafa] rounded-xl border border-[#ededed] flex items-center justify-between">
                      <span>Strikes 1, 2, 3: Warning Popup &amp; Activity Log</span>
                      <span className="font-mono text-[#D97706] font-bold">Strike Recorded</span>
                    </div>
                    <div className="p-2.5 bg-[#FEF2F2] rounded-xl border border-[#FECACA] flex items-center justify-between text-[#991B1B]">
                      <span>Strike 4: Automatic Termination &amp; Coin Forfeited</span>
                      <span className="font-mono text-[#DC2626] font-bold">Access Revoked</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FEF2F2]/60 border-2 border-[#FECACA] rounded-2xl p-6 text-center space-y-4 font-sans">
                  <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#991B1B] font-mono">
                    Tab Switch 3 of 4: Critical Final Warning
                  </h4>
                  <p className="text-xs text-[#B91C1C] max-w-sm mx-auto font-sans">
                    Switching tabs one more time will immediately terminate the session with a score of 0 and permanently disqualify the candidate.
                  </p>
                  <div className="inline-block px-3 py-1 bg-white border border-[#FECACA] rounded-lg text-[10px] font-mono font-bold text-[#991B1B]">
                    PROCTORING ALERT SENT TO DEAN
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rbac' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-in fade-in duration-300 font-sans">
                <div className="space-y-4 font-sans">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] text-[11px] font-mono font-bold">
                    <Users className="w-3 h-3 text-[#0065ff]" />
                    <span>INSTITUTIONAL GOVERNANCE</span>
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#141414] font-sans">
                    5-Tier Role Hierarchy for College Placement Cells
                  </h3>
                  <p className="text-xs sm:text-sm text-[#717171] leading-relaxed font-sans">
                    Colleges operate with structured responsibilities. Super Admins provision Deans, Deans onboard HODs, HODs assign sections, and Faculty Mentors track individual students.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['SUPER_ADMIN', 'PROGRAM_ADMIN', 'DEPARTMENT_ADMIN', 'FACULTY_MENTOR', 'STUDENT'].map(role => (
                      <span key={role} className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#fafafa] text-[#141414] border border-[#ededed]">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-[#141414] text-white rounded-2xl p-6 space-y-3 font-mono text-xs border border-[#262626]">
                  <div className="text-[#0065ff] font-bold border-b border-[#262626] pb-2">
                    # Campus Hierarchy Tree
                  </div>
                  <p className="text-[#ededed]">├── Super Admin (admin@college.edu)</p>
                  <p className="text-[#adadad]">│   └── Dean / Program Admin (program@college.edu)</p>
                  <p className="text-[#adadad]">│       ├── Department Admin: CSE, IT, ECE</p>
                  <p className="text-[#adadad]">│       │   └── Faculty Mentors (Dr. Ranganathan)</p>
                  <p className="text-[#0065ff] font-semibold">│       │       └── 3,000+ Enrolled Candidates</p>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. ROLE-BASED ACCESS CONTROL (RBAC) GOVERNANCE
      ────────────────────────────────────────────────────────── */}
      <section id="governance" className="py-20 sm:py-28 bg-white border-b border-[#ededed] font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-semibold text-[#717171] font-mono uppercase tracking-wider">
              Governance &amp; Administrative Roles
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141414] font-sans">
              5-Tier Institutional Governance
            </h2>
            <p className="text-xs sm:text-sm text-[#717171] font-sans">
              Role permissions are automatically resolved on authentication, providing isolated dashboards for each level of administration.
            </p>
          </div>

          {/* Instant Self-Serve Registration Banner */}
          <div className="bg-[#141414] text-white border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 font-sans">
            <div className="space-y-1.5 text-center md:text-left font-sans">
              <div className="inline-flex items-center space-x-2 bg-[#0065ff]/15 text-[#60A5FA] border border-[#0065ff]/30 px-3 py-1 rounded-full text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Direct Self-Serve College Onboarding</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight font-sans text-white">
                Register Your College or University in Under 2 Minutes
              </h3>
              <p className="text-xs sm:text-sm text-[#adadad] max-w-xl leading-relaxed font-sans">
                Self-register your institution to provision dedicated tenant databases, foundational departments (CSE, IT, ECE), and Super Admin credentials.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('register_institution')}
              className="px-6 py-3.5 bg-white text-[#141414] hover:bg-[#fafafa] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shrink-0 flex items-center space-x-2 cursor-pointer hover:scale-105 font-sans"
            >
              <Building2 className="w-4 h-4 text-[#0065ff]" />
              <span>Register Your Institution</span>
              <ArrowRight className="w-4 h-4 text-[#141414]" />
            </button>
          </div>

          {/* 5-Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
            
            {/* Super Admin Card */}
            <div className="bg-white border border-[#ededed] hover:border-[#141414] rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fafafa] text-[#141414] border border-[#ededed] flex items-center justify-center text-lg font-bold">
                  👑
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#141414] text-white font-mono uppercase">
                  SUPER ADMIN
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Super Administrator</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Root system authority. Creates and activates Program Admins, tracks campus performance across all colleges and departments.
                </p>
              </div>
              <div className="bg-[#fafafa] border border-[#ededed] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Scope: <strong className="text-[#141414]">Entire Institution</strong></p>
                <p className="text-[#717171]">Access: <strong className="text-[#0065ff]">Root Provisioning</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In as Super Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Program Admin Card */}
            <div className="bg-white border border-[#ededed] hover:border-[#141414] rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fafafa] text-[#141414] border border-[#ededed] flex items-center justify-center text-lg font-bold">
                  🏛️
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fafafa] text-[#717171] border border-[#ededed] font-mono">
                  PROGRAM ADMIN
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Dean of Placement / Program Admin</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Provisioned by Super Admin. Onboards Faculty Mentors, assigns student batches, and dispatches drills.
                </p>
              </div>
              <div className="bg-[#fafafa] border border-[#ededed] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Scope: <strong className="text-[#141414]">Placement Drives</strong></p>
                <p className="text-[#717171]">Access: <strong className="text-[#141414]">Faculty &amp; Batch Drills</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Department Admin Card */}
            <div className="bg-white border border-[#ededed] hover:border-[#141414] rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fafafa] text-[#141414] border border-[#ededed] flex items-center justify-center text-lg font-bold">
                  🏢
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fafafa] text-[#717171] border border-[#ededed] font-mono">
                  DEPARTMENT ADMIN
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Department Admin / Counselor</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Oversees academic department students (e.g. IT, CSE). Sets up class sections and assigns departmental students.
                </p>
              </div>
              <div className="bg-[#fafafa] border border-[#ededed] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Scope: <strong className="text-[#141414]">Department Level</strong></p>
                <p className="text-[#717171]">Access: <strong className="text-[#141414]">Class Sections &amp; Rosters</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Faculty Mentor Card */}
            <div className="bg-white border border-[#ededed] hover:border-[#141414] rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fafafa] text-[#141414] border border-[#ededed] flex items-center justify-center text-lg font-bold">
                  👨‍🏫
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fafafa] text-[#717171] border border-[#ededed] font-mono">
                  FACULTY MENTOR
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Faculty Mentor</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Provisioned by Program Admin. Enrolls student accounts into tracks and views scores ONLY for students assigned directly to them.
                </p>
              </div>
              <div className="bg-[#fafafa] border border-[#ededed] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Scope: <strong className="text-[#141414]">Assigned Students</strong></p>
                <p className="text-[#717171]">Access: <strong className="text-[#141414]">Student Mentee Tracking</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Candidate / Student Card */}
            <div className="bg-white border-2 border-[#0065ff]/40 rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] flex items-center justify-center text-lg font-bold">
                  🎓
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff5ff] text-[#0065ff] border border-[#d0e1fd] font-mono">
                  STUDENT
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Candidate / Student</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Enrolled directly or registered individually. Attends voice interviews, listening drills, tracks credits, and reviews reports.
                </p>
              </div>
              <div className="bg-[#eff5ff]/50 border border-[#d0e1fd] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Scope: <strong className="text-[#141414]">Independent &amp; Enrolled</strong></p>
                <p className="text-[#717171]">Coins: <strong className="text-[#0065ff]">5 Practice Credits</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#0065ff] hover:bg-[#0047f0] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In as Student</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Placement Coordinator Card */}
            <div className="bg-white border border-[#ededed] hover:border-[#141414] rounded-2xl p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fafafa] text-[#141414] border border-[#ededed] flex items-center justify-center text-lg font-bold">
                  💼
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fafafa] text-[#717171] border border-[#ededed] font-mono">
                  COORDINATOR
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#141414] font-sans">Placement Coordinator</h3>
                <p className="text-xs text-[#717171] mt-1 font-sans">
                  Connects college candidate batches directly with hiring partner profiles and corporate campus drives.
                </p>
              </div>
              <div className="bg-[#fafafa] border border-[#ededed] rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-[#717171]">Account: <strong className="text-[#141414]">placement@college.edu</strong></p>
                <p className="text-[#717171]">Access: <strong className="text-[#141414]">Company Drive Readiness</strong></p>
              </div>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full bg-[#141414] hover:bg-[#262626] text-white text-xs font-medium py-2 rounded-xl transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer font-sans"
              >
                <span>Sign In to Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          6. FAQ ACCORDION SECTION (MOBBIN DESIGN SYSTEM)
      ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28 bg-[#fafafa] border-b border-[#ededed] font-sans">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#717171]">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#141414] mt-3 mb-4 font-sans">
              Everything you need to know.
            </h2>
            <p className="text-sm text-[#717171] font-sans">
              Clear answers regarding student accounts, institutional governance, and speech evaluation.
            </p>
          </div>

          <div className="space-y-3.5 font-sans">
            {faqItems.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-white border border-[#ededed] rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs font-sans"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#fafafa] transition-colors font-sans"
                  >
                    <span className="text-base sm:text-lg font-bold text-[#141414] leading-snug font-sans">
                      {faq.question}
                    </span>
                    <div className={`w-7 h-7 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-[#ededed]' : ''}`}>
                      <ChevronDown className="w-4 h-4 text-[#717171]" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-[13px] leading-relaxed text-[#717171] border-t border-[#ededed] animate-in fade-in duration-200 font-sans">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          7. BOTTOM CALL TO ACTION
      ────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-white font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 font-sans">
          <div className="bg-[#141414] text-white rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden font-sans border border-[#262626]">
            
            {/* Subtle background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#0065ff]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center space-x-2 bg-white/10 px-3.5 py-1 rounded-full text-xs font-mono font-medium text-[#ededed] border border-white/15">
              <span>LatchUp — Let's Catch Up</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight max-w-2xl mx-auto font-sans">
              Ready to elevate your campus placement readiness?
            </h2>

            <p className="text-sm sm:text-base text-[#adadad] max-w-xl mx-auto font-normal leading-relaxed font-sans">
              Empower your students with hands-free AI voice practice while giving your placement cell comprehensive, proctored evaluations.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3 font-sans">
              <button
                onClick={() => openAuthModal('register_institution')}
                className="w-full sm:w-auto px-7 py-3.5 bg-white text-[#141414] hover:bg-[#fafafa] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer font-sans"
              >
                <Building2 className="w-4 h-4 text-[#0065ff]" />
                <span>Register Your Institution</span>
              </button>

              <button
                onClick={() => openAuthModal('register')}
                className="w-full sm:w-auto px-7 py-3.5 bg-transparent border border-white/20 hover:border-white text-white font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer font-sans"
              >
                <span>Student Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          8. FOOTER
      ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#ededed] bg-white py-10 text-xs text-[#717171] font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <BrandIcon size="sm" />
            <span className="font-bold text-[#141414] font-sans">LatchUp</span>
            <span className="text-[#adadad]">·</span>
            <span className="font-mono text-[11px] text-[#717171]">Let's Catch Up</span>
          </div>

          <div className="flex items-center space-x-6 text-[#717171] font-sans">
            <a href="#institutions" className="hover:text-[#141414] transition-colors">Institutions</a>
            <a href="#students" className="hover:text-[#141414] transition-colors">Students</a>
            <a href="#governance" className="hover:text-[#141414] transition-colors">Governance</a>
            <a href="#faq" className="hover:text-[#141414] transition-colors">FAQ</a>
          </div>

          <p className="text-[11px] text-[#adadad] font-mono">
            &copy; {new Date().getFullYear()} LatchUp Technologies. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};
