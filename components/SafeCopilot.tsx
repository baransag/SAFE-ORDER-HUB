'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Square, 
  Copy, 
  Check, 
  Share2, 
  Settings, 
  MessageSquare, 
  Bot,
  User as UserIcon,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { User } from '@/lib/types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  generatedMessage?: {
    romanUrdu: string;
    urdu: string;
    english: string;
    category: string;
  };
  suggestedReplies?: string[];
  actionData?: any;
  timestamp: string;
}

interface SafeCopilotProps {
  currentUser: User | null;
  orderContext?: any;
}

export default function SafeCopilot({ currentUser, orderContext }: SafeCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Assalam-o-Alaikum! Main Safe Copilot hoon. Main aap ko customer thank-you messages, WhatsApp drafts, Technical Data Sheets (Tiger Shell Black, ConBond, ConFloor, ConFlex) aur orders management mein madad de sakti hoon.',
      suggestedReplies: [
        'Customer ke liye thank-you message likh do',
        'Tiger Shell Black ki coverage batao',
        'ConFloor Hardtop ka dosage kiya hai?',
        'Payment reminder message banayein'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Voice output states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Message copy status
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLangTab, setSelectedLangTab] = useState<{ [msgId: string]: 'romanUrdu' | 'urdu' | 'english' }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Prioritize natural female Pakistani Urdu or South Asian voices
      const preferred = voices.find(v => 
        (v.lang.startsWith('ur') && v.name.toLowerCase().includes('female')) ||
        v.lang === 'ur-PK' ||
        v.lang === 'ur' ||
        (v.lang.startsWith('hi') && v.name.toLowerCase().includes('female')) ||
        (v.lang.includes('IN') && (v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('heera') || v.name.toLowerCase().includes('female'))) ||
        v.name.toLowerCase().includes('female')
      ) || voices[0];

      if (preferred) {
        setSelectedVoice(preferred);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Speech synthesis speaker
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner speech
    const cleanSpeech = text
      .replace(/[#*•_`]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .substring(0, 400);

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 0.95; // gentle, natural pacing
    utterance.pitch = 1.05; // natural pleasant tone

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speech Recognition setup
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (typeof window === 'undefined') return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'ur-PK'; // Urdu / Pakistani
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsRecording(false);
      handleSendMessage(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
          orderContext,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const botMsg: Message = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        generatedMessage: data.generatedMessage,
        suggestedReplies: data.suggestedReplies,
        actionData: data.actionData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);

      // Speak response if voice is active
      if (voiceEnabled) {
        speakText(data.reply);
      }
    } catch {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'Maaf kijiye ga, is waqt rabtay mein rukawat aayi hai. Barah-e-karam dobara koshish karein.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-105'
        } bg-gradient-to-r from-[#AF9292] via-[#B7937A] to-[#BCAEC4] text-white border border-white/30 backdrop-blur-md`}
        title="Safe Copilot — Female Pakistani Urdu Assistant"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
            🌸
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-black tracking-tight leading-none">Safe Copilot</div>
          <div className="text-[10px] text-white/80 font-medium">Urdu AI Assistant</div>
        </div>
      </button>

      {/* Slide-Over Floating Modal */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[620px] z-50 flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200/80 sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#AF9292] via-[#B7937A] to-[#BCAEC4] px-4 py-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg border border-white/30 shadow-xs">
                🌸
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight leading-none">Safe Copilot</h3>
                  <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold">
                    Urdu Voice
                  </span>
                </div>
                <p className="text-[10px] text-white/85 mt-0.5">
                  Pakistani Urdu & English Business Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voice Mute / Unmute Toggle */}
              <button
                onClick={() => {
                  if (voiceEnabled) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className={`p-1.5 rounded-xl transition-all ${
                  voiceEnabled ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-100'
                }`}
                title={voiceEnabled ? 'Mute Voice' : 'Unmute Voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Stop Speaking button if active */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-1.5 rounded-xl bg-amber-400 text-slate-900 animate-pulse"
                  title="Stop Speaking"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              {/* Voice Settings */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Voice Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice Settings Drawer */}
          {showVoiceSettings && (
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 animate-in slide-in-from-top duration-150">
              <div className="font-bold mb-1 flex items-center justify-between">
                <span>Speech Synthesis Voice:</span>
                <span className="text-[10px] text-slate-500">
                  {selectedVoice ? selectedVoice.name : 'System Default'}
                </span>
              </div>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const v = availableVoices.find(voice => voice.name === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                {availableVoices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Note: Browser speech synthesis uses available Pakistani Urdu (`ur-PK`) or South Asian voice models installed on your OS.
              </p>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#F8F6F4]/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#AF9292] to-[#B7937A] text-white flex-shrink-0 flex items-center justify-center text-xs shadow-xs mt-0.5">
                    🌸
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl shadow-xs whitespace-pre-wrap leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#B7937A] text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}

                    {/* Action button if technical doc link */}
                    {msg.actionData?.documentId && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          📄 {msg.actionData.title || 'Technical Document'}
                        </span>
                        <a
                          href={`/documents?search=${encodeURIComponent(msg.actionData.title)}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <span>View in Library</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Generated Customer Message Card */}
                  {msg.generatedMessage && (
                    <div className="p-3 bg-white border border-[#BCAEC4]/40 rounded-2xl shadow-xs space-y-2.5">
                      {/* Language Tabs */}
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <button
                          onClick={() => setSelectedLangTab({ ...selectedLangTab, [msg.id]: 'romanUrdu' })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            (selectedLangTab[msg.id] || 'romanUrdu') === 'romanUrdu'
                              ? 'bg-[#AF9292] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Roman Urdu
                        </button>
                        <button
                          onClick={() => setSelectedLangTab({ ...selectedLangTab, [msg.id]: 'urdu' })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            selectedLangTab[msg.id] === 'urdu'
                              ? 'bg-[#AF9292] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          اردو (Urdu)
                        </button>
                        <button
                          onClick={() => setSelectedLangTab({ ...selectedLangTab, [msg.id]: 'english' })}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            selectedLangTab[msg.id] === 'english'
                              ? 'bg-[#AF9292] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          English
                        </button>
                      </div>

                      {/* Display Selected Language Text */}
                      <div className="p-2.5 bg-slate-50/80 rounded-xl text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                        {(selectedLangTab[msg.id] || 'romanUrdu') === 'romanUrdu' && msg.generatedMessage.romanUrdu}
                        {selectedLangTab[msg.id] === 'urdu' && (
                          <div dir="rtl" className="font-serif text-xs leading-loose">
                            {msg.generatedMessage.urdu}
                          </div>
                        )}
                        {selectedLangTab[msg.id] === 'english' && msg.generatedMessage.english}
                      </div>

                      {/* Actions: Copy & WhatsApp */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const curTab = selectedLangTab[msg.id] || 'romanUrdu';
                            const textToCopy = 
                              curTab === 'romanUrdu' ? msg.generatedMessage!.romanUrdu :
                              curTab === 'urdu' ? msg.generatedMessage!.urdu :
                              msg.generatedMessage!.english;
                            handleCopy(msg.id, textToCopy);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            (selectedLangTab[msg.id] || 'romanUrdu') === 'romanUrdu' 
                              ? msg.generatedMessage.romanUrdu 
                              : selectedLangTab[msg.id] === 'urdu'
                              ? msg.generatedMessage.urdu
                              : msg.generatedMessage.english
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all"
                          title="Open in WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Suggested Quick Replies */}
                  {msg.suggestedReplies && msg.suggestedReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(reply)}
                          className="px-2.5 py-1 rounded-full bg-white/90 border border-[#BCAEC4]/50 hover:bg-[#BCAEC4]/20 text-[10px] font-semibold text-slate-700 transition-all text-left shadow-2xs"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 px-1">
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex-shrink-0 flex items-center justify-center text-xs mt-0.5 font-bold">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs italic p-2 bg-white/80 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
                <span className="w-2 h-2 bg-[#AF9292] rounded-full animate-ping" />
                <span>Safe Copilot likh rahi hain...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <div className="flex items-center gap-2">
              {/* Mic Speech Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2.5 rounded-2xl transition-all shadow-xs ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={isRecording ? 'Listening... click to stop' : 'Record Urdu/English voice note'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                placeholder={isRecording ? 'Bolte jayein (listening in Urdu)...' : 'Poochiye ya thank you message likhwaiye...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#AF9292]/30 focus:border-[#AF9292] transition-all"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white disabled:opacity-40 transition-all shadow-xs"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
