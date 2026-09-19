'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Users, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Copy,
  AlertCircle,
  X,
  Radio,
  Sliders,
  Heart,
  TrendingUp,
  AlertTriangle,
  Package,
  Layers
} from 'lucide-react';
import { User, Order, OrderStatus } from '@/lib/types';
import ThankYouModal from '@/components/ThankYouModal';

interface Props {
  currentUser: User | null;
  onRefreshOrders?: () => void;
  onOpenOrder?: (order: Order) => void;
}

interface ChatHistoryItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actionType?: string;
  order?: Order;
  timestamp: string;
}

export default function SafeAIAssistant({ currentUser, onRefreshOrders, onOpenOrder }: Props) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [lastActionOrder, setLastActionOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Dynamic Salutation
  const userSalutation = currentUser?.role === 'BOSS'
    ? 'Boss sahib'
    : currentUser?.role === 'MANAGER'
      ? 'Manager sahiba'
      : 'Controller sahib';

  // Voice Synthesis Configuration
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [voiceRate, setVoiceRate] = useState<number>(0.88); // Calm, executive cadence
  const [voicePitch, setVoicePitch] = useState<number>(0.80); // Deep, mature tone
  const [listenLang, setListenLang] = useState<'ur-PK' | 'hi-IN' | 'en-US'>('ur-PK');

  // Real-time Order Monitoring
  const [latestNewOrder, setLatestNewOrder] = useState<Order | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Thank You Modal State
  const [thankYouOrder, setThankYouOrder] = useState<Order | null>(null);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Load High Quality Voices on Mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      const sorted = [...allVoices].sort((a, b) => {
        const aScore = getVoiceScore(a);
        const bScore = getVoiceScore(b);
        return bScore - aScore;
      });

      setAvailableVoices(sorted);

      if (!selectedVoiceUri && sorted.length > 0) {
        setSelectedVoiceUri(sorted[0].voiceURI);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }, [selectedVoiceUri]);

  const getVoiceScore = (v: SpeechSynthesisVoice) => {
    let score = 0;
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();

    if (name.includes('asad') || (lang.includes('ur') && !name.includes('gul') && !name.includes('female'))) {
      score += 120;
    }
    if (name.includes('madhur')) score += 80;
    if (name.includes('oliver') || name.includes('ryan') || name.includes('guy') || name.includes('george')) {
      score += 60;
    }
    if (name.includes('natural') || name.includes('online')) score += 40;
    if (name.includes('google')) score += 30;
    if (lang.startsWith('ur') || lang.startsWith('hi')) score += 35;
    if (lang.includes('gb') || lang.includes('uk')) score += 20;

    if (
      name.includes('female') || 
      name.includes('zira') || 
      name.includes('sonia') || 
      name.includes('natasha') || 
      name.includes('jenny') || 
      name.includes('gul') || 
      name.includes('samantha')
    ) {
      score -= 60;
    }

    return score;
  };

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(554.37, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext fallback
    }
  };

  const speakVoice = (text: string) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      playChime();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      let voiceToUse = voices.find(v => v.voiceURI === selectedVoiceUri);

      if (!voiceToUse) {
        voiceToUse = voices.find(v => {
          const name = v.name.toLowerCase();
          return (
            name.includes('asad') || 
            name.includes('madhur') || 
            name.includes('oliver') || 
            name.includes('ryan') || 
            name.includes('natural')
          );
        }) || voices[0];
      }

      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }

      utterance.rate = voiceRate;
      utterance.pitch = voicePitch;
      utterance.volume = 1.0;
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  };

  const handleTestVoice = () => {
    const greeting = `Assalam-o-Alaikum ${userSalutation}! Main Safe Solutions ka AI Operations Copilot hoon. Har voice hukam foran execute karoonga.`;
    speakVoice(greeting);
    setAiResponse(greeting);
  };

  // Real-time Order Monitoring (Polls every 6 seconds)
  useEffect(() => {
    const checkOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        const orders: Order[] = data.orders || [];

        if (isInitialLoadRef.current) {
          orders.forEach(o => knownOrderIdsRef.current.add(o.id));
          isInitialLoadRef.current = false;
          return;
        }

        const brandNewOrders = orders.filter(o => !knownOrderIdsRef.current.has(o.id));

        if (brandNewOrders.length > 0) {
          const newest = brandNewOrders[0];
          brandNewOrders.forEach(o => knownOrderIdsRef.current.add(o.id));
          setLatestNewOrder(newest);

          const client = newest.companyName || newest.customerName;
          const announcement = `Naya order aa gaya hai! ${newest.orderTakenByName} ne ${client} ke naam par order confirm kiya hai. Total raqam ${newest.grandTotal.toLocaleString()} rupay hai.`;
          speakVoice(announcement);

          if (onRefreshOrders) {
            onRefreshOrders();
          }
        }
      } catch {
        // network issue
      }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 6000);
    return () => clearInterval(interval);
  }, [isVoiceEnabled, selectedVoiceUri, voiceRate, voicePitch, onRefreshOrders]);

  // Speech Recognition (Microphone)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = listenLang;

        rec.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (interim) {
            setInterimText(interim);
          }

          if (final) {
            setCommandInput(final);
            setInterimText('');
            setIsListening(false);
            executeCommand(final);
          }
        };

        rec.onerror = () => {
          setIsListening(false);
          setInterimText('');
        };

        rec.onend = () => {
          setIsListening(false);
          setInterimText('');
        };

        recognitionRef.current = rec;
      }
    }
  }, [listenLang]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Microphone recognition is supported on Chrome, Edge, and Android/Safari browsers. You can also type directly in the box!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
    } else {
      try {
        recognitionRef.current.lang = listenLang;
        recognitionRef.current.start();
        setIsListening(true);
        setInterimText('Listening... boliye');
      } catch {
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimText('');
      }
    }
  };

  // Execute Natural Language Commands
  const executeCommand = async (cmdText?: string) => {
    const query = (cmdText || commandInput).trim();
    if (!query) return;

    setLoading(true);
    setAiResponse(null);
    setLastActionOrder(null);

    // Append to conversation history
    const userMsg: ChatHistoryItem = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHistory(prev => [userMsg, ...prev.slice(0, 7)]);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'voice_query',
          query,
          controllerPhone: currentUser?.phone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.spokenText) {
        setAiResponse(data.spokenText);
        speakVoice(data.spokenText);

        const aiMsg: ChatHistoryItem = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.spokenText,
          actionType: data.actionType,
          order: data.order,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory(prev => [aiMsg, ...prev.slice(0, 7)]);

        if (data.order) {
          setLastActionOrder(data.order);
        }

        // Refresh orders list if database was modified
        if (data.updatedCount && onRefreshOrders) {
          onRefreshOrders();
        }

        // Action: Open order drawer automatically
        if (data.actionType === 'open_order' && data.order && onOpenOrder) {
          onOpenOrder(data.order);
        }

        // Action: Open Thank You modal
        if (data.actionType === 'thank_you' && data.order) {
          setThankYouOrder(data.order);
          setIsThankYouModalOpen(true);
        }
      } else {
        const fallback = data.error || "Aap ka hukam samajh nahi aaya, baraye meherbani dobara boliye.";
        setAiResponse(fallback);
      }
    } catch {
      setAiResponse("Server se rabta nahi ho saka. Baraye meherbani dobara koshish karein.");
    } finally {
      setLoading(false);
      setCommandInput('');
      setInterimText('');
    }
  };

  // Direct Action Handlers
  const handleQuickDeliver = async (empName: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_delivered',
          employeeName: empName,
        }),
      });
      const data = await res.json();
      if (data.spokenText) {
        setAiResponse(data.spokenText);
        speakVoice(data.spokenText);
      }
      if (onRefreshOrders) onRefreshOrders();
    } catch {
      setAiResponse("Error updating orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenThankYou = (order?: Order) => {
    if (order) {
      setThankYouOrder(order);
    } else if (lastActionOrder) {
      setThankYouOrder(lastActionOrder);
    }
    setIsThankYouModalOpen(true);
  };

  const handleTeamSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'team_summary' }),
      });
      const data = await res.json();
      if (data.spokenText) {
        setAiResponse(data.spokenText);
        speakVoice(data.spokenText);
      }
    } catch {
      setAiResponse("Failed to fetch team report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Real-time New Order Banner */}
      {latestNewOrder && (
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-teal-500/10 border border-teal-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                    🚨 LIVE ORDER ANNOUNCEMENT
                  </span>
                  <span className="text-xs text-white/80 font-mono">
                    {latestNewOrder.orderNumber}
                  </span>
                </div>
                <h4 className="text-base font-bold mt-1 text-white">
                  {latestNewOrder.orderTakenByName} booked for <span className="underline decoration-white/50">{latestNewOrder.companyName || latestNewOrder.customerName}</span> ({latestNewOrder.city})
                </h4>
                <p className="text-xs text-white/90 mt-0.5">
                  Amount: <strong className="text-amber-200">Rs. {latestNewOrder.grandTotal.toLocaleString()}</strong> • Status: <span className="font-semibold uppercase">{latestNewOrder.status}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {onOpenOrder && (
                <button
                  type="button"
                  onClick={() => onOpenOrder(latestNewOrder)}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-teal-900 text-xs font-bold hover:bg-teal-50 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenThankYou(latestNewOrder)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 Thank You Hub</span>
              </button>
              <button
                type="button"
                onClick={() => setLatestNewOrder(null)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Executive Safe AI Operations Card */}
      <div className="korean-card overflow-hidden border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/20 to-emerald-50/30 shadow-md">
        
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-teal-100/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                <Sparkles className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  SAFE AI Operations Copilot
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-teal-300 border border-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  {userSalutation} Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Urdu &amp; Roman voice commands for instant actions: Status updates, rate approvals, analytics &amp; Thank You texts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Test Voice Button */}
            <button
              type="button"
              onClick={handleTestVoice}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold border border-slate-700 transition-all shadow-xs"
              title="Test the voice synthesizer"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>🎙️ Test Voice</span>
            </button>

            {/* Voice Settings Toggle */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border transition-all ${
                showSettings ? 'bg-teal-100 border-teal-300 text-teal-800' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Voice & Mic Tuning Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Voice Mute / Unmute Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isVoiceEnabled;
                setIsVoiceEnabled(next);
                if (next) speakVoice("Aawaz on kar di gayi hai.");
              }}
              className={`p-2 rounded-xl border transition-all ${
                isVoiceEnabled 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
              title={isVoiceEnabled ? 'Voice active (Click to mute)' : 'Voice muted (Click to unmute)'}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Collapse / Expand */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Optional Voice & Mic Tuning Panel */}
        {showSettings && isExpanded && (
          <div className="p-4 bg-teal-50/50 border-b border-teal-100/80 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Voice Output:
              </label>
              <select
                value={selectedVoiceUri}
                onChange={(e) => {
                  setSelectedVoiceUri(e.target.value);
                  setTimeout(handleTestVoice, 100);
                }}
                className="w-full px-2 py-1.5 bg-white border border-teal-200 rounded-lg text-[11px] font-semibold text-slate-800"
              >
                {availableVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    🎙️ {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pace / Speed: ({voiceRate}x)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.75"
                  max="1.15"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-teal-800 font-bold whitespace-nowrap">
                  {voiceRate <= 0.88 ? 'Calm 🕊️' : 'Standard'}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tone Depth: ({voicePitch.toFixed(2)})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.65"
                  max="1.10"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => setVoicePitch(Number(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-teal-800 font-bold whitespace-nowrap">
                  {voicePitch <= 0.85 ? 'Deep & Clear 🎙️' : 'Standard'}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mic Accent:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setListenLang('ur-PK')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    listenLang === 'ur-PK' ? 'bg-slate-900 text-teal-300 border-slate-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🇵🇰 Urdu / Roman
                </button>
                <button
                  type="button"
                  onClick={() => setListenLang('en-US')}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border transition-all ${
                    listenLang === 'en-US' ? 'bg-slate-900 text-teal-300 border-slate-900 shadow-xs' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  🌐 English / Mix
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Assistant Body */}
        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            
            {/* Live Audio Visualizer Waves when Mic is Listening */}
            {isListening && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white flex items-center justify-between shadow-lg shadow-rose-500/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>Live Listening...</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                    <p className="text-xs text-white/95 font-medium mt-0.5">
                      {interimText || 'Boliye: "Adnan ke orders deliver mark karo" ya "Pending orders kitne hain"...'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMic}
                  className="px-3 py-1.5 bg-white/25 hover:bg-white/35 rounded-xl text-xs font-bold text-white border border-white/30 transition-all"
                >
                  Stop Mic
                </button>
              </div>
            )}

            {/* Voice / Text Command Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder='Boliye ya type karein: "Adnan ke orders deliver karo", "Order 1 check karo", "Shahzaib ki performance"...'
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeCommand();
                  }}
                  className="w-full pl-4 pr-12 py-3 bg-white border border-teal-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => executeCommand()}
                  disabled={loading || !commandInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 disabled:hover:bg-teal-600 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Large Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-4 py-3 rounded-2xl border flex items-center gap-2 text-xs font-black transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-500/30 animate-pulse'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-600 shadow-md shadow-teal-600/20 hover:brightness-105 active:scale-95'
                }`}
                title="Click and speak into your microphone"
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 text-white" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-white" />
                    <span>Bol Kar Kahein 🎙️</span>
                  </>
                )}
              </button>
            </div>

            {/* Active AI Feedback Bubble with Quick Action Trigger */}
            {aiResponse && (
              <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-teal-900 font-bold">Safe AI Copilot:</strong> {aiResponse}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {lastActionOrder && onOpenOrder && (
                    <button
                      type="button"
                      onClick={() => onOpenOrder(lastActionOrder)}
                      className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
                    >
                      <span>View Order</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {lastActionOrder && (
                    <button
                      type="button"
                      onClick={() => handleOpenThankYou(lastActionOrder)}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Thank You Hub</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAiResponse(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Categorized Quick Action Chips */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                  📦 Actions:
                </span>
                <button
                  type="button"
                  onClick={() => executeCommand('Adnan ke orders deliver mark karo')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold transition-all"
                >
                  Deliver Adnan Orders
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('Shahzaib ke orders deliver mark karo')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold transition-all"
                >
                  Deliver Shahzaib Orders
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('Pending orders confirm kardo')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold transition-all"
                >
                  Confirm Pending Orders
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                  💬 Client:
                </span>
                <button
                  type="button"
                  onClick={() => executeCommand('Client ko VIP Urdu Thank You text banao')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <MessageSquare className="w-3 h-3 text-purple-600" />
                  <span>VIP Client Urdu Thank You</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenThankYou()}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>Open Thank You Generator Hub</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">
                  📊 Insights:
                </span>
                <button
                  type="button"
                  onClick={handleTeamSummary}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <Users className="w-3 h-3 text-teal-600" />
                  <span>Team Performance Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('Urgent orders kaunse hain')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Urgent Orders Alert</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('Sabse zyada sales kis ki hain')}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <TrendingUp className="w-3 h-3 text-teal-600" />
                  <span>Top Salesperson</span>
                </button>
              </div>
            </div>

            {/* Recent Voice Command Transcript History (Collapsible) */}
            {history.length > 0 && (
              <div className="pt-2">
                <details className="text-xs group">
                  <summary className="cursor-pointer text-slate-500 font-bold flex items-center justify-between hover:text-slate-800">
                    <span>Recent Voice Transcripts &amp; Activity ({history.length})</span>
                    <span className="text-[10px] text-teal-600 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {history.map(item => (
                      <div
                        key={item.id}
                        className={`p-2 rounded-xl text-xs flex items-start gap-2 ${
                          item.sender === 'user'
                            ? 'bg-slate-50 text-slate-700 border border-slate-100'
                            : 'bg-teal-50/70 text-teal-900 border border-teal-100'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                          {item.timestamp}
                        </span>
                        <div className="flex-1">
                          <strong className="font-semibold">{item.sender === 'user' ? 'You:' : 'AI:'}</strong> {item.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 3. Mobile Floating Action Button (FAB) for Hands-free Voice on Phones */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={toggleMic}
          className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-2xl transition-all ${
            isListening
              ? 'bg-rose-600 ring-4 ring-rose-300 animate-pulse scale-105'
              : 'bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-teal-500/30'
          }`}
          title="Tap to speak into AI Copilot"
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>

      {/* 4. Intelligent Thank You Modal */}
      <ThankYouModal
        isOpen={isThankYouModalOpen}
        onClose={() => setIsThankYouModalOpen(false)}
        order={thankYouOrder}
        currentUser={currentUser}
        onMessageSent={() => {
          if (onRefreshOrders) onRefreshOrders();
        }}
      />
    </>
  );
}
