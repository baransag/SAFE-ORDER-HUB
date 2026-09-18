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
  Heart
} from 'lucide-react';
import { User, Order } from '@/lib/types';

interface Props {
  currentUser: User | null;
  onRefreshOrders?: () => void;
  onOpenOrder?: (order: Order) => void;
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
  
  // Voice Synthesis Configuration
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [voiceRate, setVoiceRate] = useState<number>(0.88); // Calm, deliberate, executive cadence
  const [voicePitch, setVoicePitch] = useState<number>(0.80); // Deep, mature, masculine tone (avoids high/childish voice)
  const [listenLang, setListenLang] = useState<'ur-PK' | 'hi-IN' | 'en-US'>('ur-PK');

  // Real-time Order Monitoring
  const [latestNewOrder, setLatestNewOrder] = useState<Order | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Thank You Message State
  const [thankYouModal, setThankYouModal] = useState<{
    open: boolean;
    order: Order | null;
    messageText: string;
    whatsappUrl: string;
    clientPhone: string;
    controllerPhone: string;
    copied: boolean;
  }>({
    open: false,
    order: null,
    messageText: '',
    whatsappUrl: '',
    clientPhone: '',
    controllerPhone: currentUser?.phone || '03468760963',
    copied: false,
  });

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Load High Quality Voices on Mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      // Filter and sort prioritizing natural, loud, calm, decent male Urdu/English voices
      const sorted = [...allVoices].sort((a, b) => {
        const aScore = getVoiceScore(a);
        const bScore = getVoiceScore(b);
        return bScore - aScore;
      });

      setAvailableVoices(sorted);

      if (!selectedVoiceUri && sorted.length > 0) {
        // Automatically select the highest scoring male Urdu / English natural voice
        setSelectedVoiceUri(sorted[0].voiceURI);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }, [selectedVoiceUri]);

  // Scoring function for voice quality (prioritizes loud, calm, decent male Urdu/English voices)
  const getVoiceScore = (v: SpeechSynthesisVoice) => {
    let score = 0;
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();

    // 1. Male Urdu / Pakistani voices (e.g. Microsoft Asad Online Natural)
    if (name.includes('asad') || (lang.includes('ur') && !name.includes('gul') && !name.includes('female'))) {
      score += 120;
    }

    // 2. Natural / Neural male voices with clear Indian/Pakistani/British diction
    if (name.includes('madhur')) score += 80;
    if (name.includes('oliver') || name.includes('ryan') || name.includes('guy') || name.includes('george')) {
      score += 60;
    }

    // 3. General natural / neural voices
    if (name.includes('natural') || name.includes('online')) score += 40;
    if (name.includes('google')) score += 30;

    // 4. Languages
    if (lang.startsWith('ur') || lang.startsWith('hi')) score += 35;
    if (lang.includes('gb') || lang.includes('uk')) score += 20;

    // Deduct points for female voices because user requested a loud, calm, decent male speaker
    if (
      name.includes('female') || 
      name.includes('zira') || 
      name.includes('sonia') || 
      name.includes('natasha') || 
      name.includes('jenny') || 
      name.includes('gul') || 
      name.includes('samantha') || 
      name.includes('swara') ||
      name.includes('heera')
    ) {
      score -= 60;
    }

    return score;
  };

  // 1. Play Soft Dignified Executive Chime
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Warm, authoritative tone
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, ctx.currentTime + 0.15); // C#5

      gain.gain.setValueAtTime(0.18, ctx.currentTime); // Loud & clear
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // AudioContext fallback
    }
  };

  // 2. Loud, Calm & Decent Male Urdu Voice Synthesizer
  const speakVoice = (text: string) => {
    if (!isVoiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      playChime();
      window.speechSynthesis.cancel(); // Stop any overlapping speech

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      // Find chosen voice or best male candidate
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

      // Loud, calm, dignified pacing and pitch
      utterance.rate = voiceRate; // 0.92 for calm, deliberate cadence
      utterance.pitch = voicePitch; // 0.92 for deep, masculine, calm tone
      utterance.volume = 1.0; // Loud and crystal clear
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  };

  // 3. Test Voice Button
  const handleTestVoice = () => {
    const greeting = "Assalam-o-Alaikum Controller sahib! Main Safe Solutions ka Operations Officer hoon. Loud aur calm Urdu aawaz mein aap ka har order foran process karoonga.";
    speakVoice(greeting);
    setAiResponse("🎙️ Voice Test: 'Assalam-o-Alaikum Controller sahib! Main Safe Solutions ka Operations Officer hoon. Loud aur calm Urdu aawaz mein aap ka har order foran process karoonga.'");
  };

  // 4. Real-time Order Monitoring (Polls every 6 seconds)
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

          // Loud, calm, decent announcement
          const client = newest.companyName || newest.customerName;
          const announcement = `Naya order aa gaya hai! ${newest.orderTakenByName} ne ${client} ke naam par order confirm kiya hai. Total raqam ${newest.grandTotal.toLocaleString()} rupay hai. Baraye meherbani proceed karein!`;
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

  // 5. Active Listening Speech Recognition (Microphone)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true; // Show live interim transcript as user speaks!
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
      alert("Microphone recognition is supported on Chrome, Edge, and Opera browsers. You can also type directly in the command box!");
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

  // 6. Execute Natural Language or Action Commands
  const executeCommand = async (cmdText?: string) => {
    const query = (cmdText || commandInput).trim();
    if (!query) return;

    setLoading(true);
    setAiResponse(null);

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

        if (data.updatedCount && onRefreshOrders) {
          onRefreshOrders();
        }

        if (data.actionType === 'thank_you' && data.order) {
          setThankYouModal({
            open: true,
            order: data.order,
            messageText: data.messageText,
            whatsappUrl: data.whatsappUrl,
            clientPhone: data.order.customerWhatsapp || data.order.customerPhone || '',
            controllerPhone: currentUser?.phone || '03468760963',
            copied: false,
          });
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

  // Quick Action Handlers
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

  const handleOpenThankYouGenerator = async (order?: Order) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'thank_you_message',
          orderId: order?.id,
          controllerPhone: currentUser?.phone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setThankYouModal({
          open: true,
          order: data.order,
          messageText: data.messageText,
          whatsappUrl: data.whatsappUrl,
          clientPhone: data.clientPhone,
          controllerPhone: data.controllerPhone,
          copied: false,
        });
        if (data.spokenText) {
          speakVoice(data.spokenText);
        }
      }
    } catch {
      alert("Could not prepare Thank You message.");
    } finally {
      setLoading(false);
    }
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
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-teal-500/10 border border-teal-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-white">
                    🚨 LIVE ORDER ANNOUNCEMENT
                  </span>
                  <span className="text-xs text-white/80 font-mono">
                    {latestNewOrder.orderNumber}
                  </span>
                </div>
                <h4 className="text-base font-bold mt-1 text-white">
                  {latestNewOrder.orderTakenByName} confirmed order for <span className="underline decoration-white/50">{latestNewOrder.companyName || latestNewOrder.customerName}</span> ({latestNewOrder.city})
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
                  <span>Open Drawer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenThankYouGenerator(latestNewOrder)}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border border-white/30 transition-all flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 Thank You Text</span>
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

      {/* 2. Executive Safe AI Operations Voice Assistant Card */}
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
                  SAFE AI Operations Officer
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 text-teal-300 border border-slate-700 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Loud, Calm &amp; Decent Urdu Speaker
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Loud, calm aur decent Urdu aawaz mein automatic announcements • Urdu / Roman Urdu voice commands sunnay aur execute karne ke liye
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Test Voice Button */}
            <button
              type="button"
              onClick={handleTestVoice}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold border border-slate-700 transition-all shadow-sm"
              title="Test the loud and calm male Urdu voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>🎙️ Test Male Voice</span>
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
            {/* Voice selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Male Urdu / English Voice:
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

            {/* Speaking Pace (Calm vs Fast) */}
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

            {/* Voice Tone & Depth (Pitch) */}
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
                  {voicePitch <= 0.85 ? 'Deep & Mature 🎙️' : 'Standard'}
                </span>
              </div>
            </div>

            {/* Listening Language (Urdu vs English) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mic Listening Accent:
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
            
            {/* Live Audio Waves when Mic is Listening */}
            {isListening && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white flex items-center justify-between shadow-lg shadow-rose-500/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white animate-bounce" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>Live Listening...</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                    <p className="text-[11px] text-white/90">
                      {interimText || 'Boliye: "Adnan ke order deliver confirm kardo"...'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMic}
                  className="px-3 py-1 bg-white/25 hover:bg-white/35 rounded-lg text-xs font-bold text-white border border-white/30"
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
                  placeholder='Boliye ya type karein: "Adnan ke order deliver confirm kardo" ya "Client ko Thank You text likho"...'
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeCommand();
                  }}
                  className="w-full pl-4 pr-12 py-2.5 bg-white border border-teal-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs transition-all"
                />
                <button
                  type="button"
                  onClick={() => executeCommand()}
                  disabled={loading || !commandInput.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 disabled:hover:bg-teal-600 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Large Mic Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-black transition-all ${
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

            {/* Active AI Spoken / Text Feedback Bubble */}
            {aiResponse && (
              <div className="p-3.5 rounded-xl bg-teal-50/90 border border-teal-200 text-xs text-teal-950 flex items-start gap-2.5 animate-in fade-in duration-200">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <strong className="text-teal-900 font-bold">Safe AI Assistant:</strong> {aiResponse}
                </div>
                <button
                  type="button"
                  onClick={() => setAiResponse(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Action Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Direct Actions:
              </span>

              <button
                type="button"
                onClick={() => handleQuickDeliver('Adnan')}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <span>📦 Adnan ke orders Delivered mark karo</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDeliver('Shahzaib')}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <span>📦 Shahzaib ke orders Delivered mark karo</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenThankYouGenerator()}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3 h-3 text-teal-600" />
                <span>💬 Client ko Thank You WhatsApp bhejo</span>
              </button>

              <button
                type="button"
                onClick={handleTeamSummary}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <Users className="w-3 h-3 text-teal-600" />
                <span>📊 Full Team Dashboard Overview</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Thank You WhatsApp Message Modal */}
      {thankYouModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="korean-card max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Client Thank You WhatsApp Generator
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    For {thankYouModal.order?.customerName} ({thankYouModal.order?.orderNumber})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setThankYouModal(prev => ({ ...prev, open: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sender / Controller Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Manager/Controller Contact No:
                </label>
                <input
                  type="text"
                  value={thankYouModal.controllerPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setThankYouModal(prev => ({
                      ...prev,
                      controllerPhone: val,
                    }));
                  }}
                  placeholder="03468760963"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Client WhatsApp No:
                </label>
                <input
                  type="text"
                  value={thankYouModal.clientPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    let clean = val.replace(/\D/g, '');
                    if (clean.startsWith('0')) clean = '92' + clean.slice(1);
                    const newUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(thankYouModal.messageText)}`;
                    setThankYouModal(prev => ({
                      ...prev,
                      clientPhone: val,
                      whatsappUrl: newUrl,
                    }));
                  }}
                  placeholder="03001234567"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Formatted Message Box */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                WhatsApp Message Preview:
              </label>
              <textarea
                rows={7}
                value={thankYouModal.messageText}
                onChange={(e) => {
                  const val = e.target.value;
                  let clean = thankYouModal.clientPhone.replace(/\D/g, '');
                  if (clean.startsWith('0')) clean = '92' + clean.slice(1);
                  const newUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(val)}`;
                  setThankYouModal(prev => ({
                    ...prev,
                    messageText: val,
                    whatsappUrl: newUrl,
                  }));
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed text-slate-800"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(thankYouModal.messageText);
                  setThankYouModal(prev => ({ ...prev, copied: true }));
                  setTimeout(() => setThankYouModal(prev => ({ ...prev, copied: false })), 3000);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{thankYouModal.copied ? '✓ Copied!' : 'Copy Text'}</span>
              </button>

              <a
                href={thankYouModal.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-green-600/20 transition-all"
              >
                <span>🚀 Send via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
