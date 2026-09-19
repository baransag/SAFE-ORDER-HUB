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
  Check, 
  AlertCircle, 
  Package, 
  Clock, 
  TrendingUp,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { User } from '@/lib/types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  confirmationCard?: any;
  confirmedAction?: any;
  timestamp: string;
}

export default function SafeCopilotFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(d => {
        if (d.user) {
          setCurrentUser(d.user);
          // Initial greeting message
          const name = d.user.name.split(' ')[0];
          setMessages([
            {
              id: 'init_1',
              sender: 'ai',
              text: `Assalam-o-Alaikum ${name}! Main SAFE COPILOT hoon. Orders, rates, deliveries ya system help ke mutaliq poochiye.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query',
          query: textToSend,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.message || data.spokenText,
          confirmationCard: data.confirmationCard,
          confirmedAction: data.confirmedAction,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, aiMsg]);
        speakText(data.spokenText || data.message);
      } else {
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: data.error || 'Request processing failed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: 'Network connection issue. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msg: Message) => {
    if (!msg.confirmedAction) return;
    setIsExecutingAction(true);

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_confirmed_action',
          confirmedAction: msg.confirmedAction,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [
          ...prev.map(m => m.id === msg.id ? { ...m, confirmationCard: null } : m),
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: `✓ ${data.message || 'Action confirmed and executed successfully!'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
        speakText(data.spokenText || data.message);
      } else {
        alert(data.error || 'Failed to execute action');
      }
    } catch {
      alert('Error executing confirmed action');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages(prev => [
      ...prev.map(m => m.id === msgId ? { ...m, confirmationCard: null } : m),
      {
        id: `cancel_${Date.now()}`,
        sender: 'ai',
        text: 'Action cancelled. No changes were made.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  // Do not display if not authenticated
  if (!currentUser) return null;

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-5 z-40 px-4 py-3 rounded-full grad-lavender-emerald text-white font-extrabold text-xs flex items-center gap-2 shadow-xl shadow-teal-500/25 hover:scale-105 active:scale-95 transition-all group"
        title="Open Safe Copilot AI"
      >
        <Sparkles className="w-4 h-4 animate-spin-slow group-hover:rotate-12 transition-transform" />
        <span className="tracking-wide">✨ Safe Copilot</span>
      </button>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white z-50 shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl grad-lavender-emerald flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight">SAFE COPILOT</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-full">
                    RBAC Protected
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">SAFE SOLUTIONS Intelligence Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={voiceEnabled ? 'Mute voice responses' : 'Enable voice responses'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Suggested Prompts */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] font-semibold text-slate-600 shrink-0">
            <button
              onClick={() => handleSend("Today's orders")}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-teal-500 hover:text-teal-700 whitespace-nowrap shadow-xs"
            >
              Today&apos;s orders
            </button>
            <button
              onClick={() => handleSend('Pending deliveries')}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-teal-500 hover:text-teal-700 whitespace-nowrap shadow-xs"
            >
              Pending deliveries
            </button>
            <button
              onClick={() => handleSend('Ultra Seal standard rate')}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-teal-500 hover:text-teal-700 whitespace-nowrap shadow-xs"
            >
              Ultra Seal rate
            </button>
            {isFullAccess && (
              <button
                onClick={() => handleSend('Give me monthly sales summary')}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-teal-500 hover:text-teal-700 whitespace-nowrap shadow-xs"
              >
                Month sales
              </button>
            )}
            <button
              onClick={() => handleSend('How do I create a new order?')}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:border-teal-500 hover:text-teal-700 whitespace-nowrap shadow-xs"
            >
              How to order?
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-teal-600 text-white rounded-tr-xs shadow-xs' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Confirmation Card for High-Impact Actions */}
                  {msg.confirmationCard && (
                    <div className="mt-3 p-3 rounded-xl bg-white border border-amber-300 text-slate-900 space-y-2 shadow-xs animate-in zoom-in-95">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>{msg.confirmationCard.title}</span>
                      </div>

                      <div className="space-y-1 text-[11px] border-y border-slate-100 py-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Client:</span>
                          <span className="font-bold">{msg.confirmationCard.client}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Product:</span>
                          <span className="font-bold">{msg.confirmationCard.product}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Quantity:</span>
                          <span>{msg.confirmationCard.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rate:</span>
                          <span>{msg.confirmationCard.rate}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-emerald-700">
                          <span>Total:</span>
                          <span>{msg.confirmationCard.total}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCancelAction(msg.id)}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isExecutingAction}
                          onClick={() => handleConfirmAction(msg)}
                          className="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-xs"
                        >
                          {isExecutingAction ? 'Executing...' : 'Confirm & Submit'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <span>Safe Copilot is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }} 
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask Safe Copilot anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
