'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Check, 
  X, 
  ArrowRight, 
  Building2, 
  MapPin, 
  Phone, 
  Package, 
  AlertCircle,
  FileText,
  Volume2
} from 'lucide-react';
import { User, Product } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOrderCreated?: () => void;
}

export default function VoiceOrderModal({ isOpen, onClose, currentUser, onOrderCreated }: Props) {
  const router = useRouter();
  const [recordingState, setRecordingState] = useState<'IDLE' | 'RECORDING' | 'STOPPED'>('IDLE');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Extracted Fields for Human Review & Editing
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [quotedRate, setQuotedRate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSttSupported(false);
      }
    }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const handleReset = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setRecordingState('IDLE');
    setDuration(0);
    setAudioUrl(null);
    setTranscript('');
    setCustomerName('');
    setCustomerPhone('');
    setCity('Lahore');
    setDeliveryAddress('');
    setProductDetails('');
    setQuotedRate('');
    setOrderNotes('');
    setSuccessMessage(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setRecordingState('RECORDING');
      setDuration(0);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start live speech transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        recognitionRef.current = rec;
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'ur-PK'; // Urdu / English mixed support in Pakistan

        let fullTranscript = '';
        rec.onresult = (event: any) => {
          let currentSession = '';
          for (let i = 0; i < event.results.length; i++) {
            currentSession += event.results[i][0].transcript + ' ';
          }
          fullTranscript = currentSession;
          setTranscript(currentSession);
          extractDetailsFromTranscript(currentSession);
        };

        rec.onerror = () => {
          // Fallback to en-US if ur-PK is unsupported in browser
          try {
            rec.lang = 'en-US';
            rec.start();
          } catch {}
        };

        try {
          rec.start();
        } catch {}
      }
    } catch (err: any) {
      alert('Microphone access denied or not available. You can also upload a recorded audio file or type the transcript directly.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setRecordingState('STOPPED');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAudioUrl(event.target?.result as string);
      setRecordingState('STOPPED');
      setDuration(Math.round(file.size / 16000)); // rough estimate
    };
    reader.readAsDataURL(file);
  };

  // Rule-based heuristic extraction for Pakistani construction order voice notes
  const extractDetailsFromTranscript = (text: string) => {
    const lower = text.toLowerCase();

    // 1. Phone number (03xx-xxxxxxx or 03xxxxxxxxx)
    const phoneMatch = text.match(/(03\d{2}[-\s]?\d{7}|923\d{2}[-\s]?\d{7})/);
    if (phoneMatch) {
      setCustomerPhone(phoneMatch[0].replace(/\s+/g, ''));
    }

    // 2. City
    const cities = ['Lahore', 'Faisalabad', 'Islamabad', 'Rawalpindi', 'Gujranwala', 'Multan', 'Sialkot', 'Karachi', 'Peshawar', 'Sargodha', 'Sheikhupura'];
    for (const c of cities) {
      if (lower.includes(c.toLowerCase())) {
        setCity(c);
        break;
      }
    }

    // 3. Products
    const productsDetected: string[] = [];
    if (lower.includes('ultra seal') || lower.includes('ultraseal')) productsDetected.push('Ultra Seal');
    if (lower.includes('pu sealant') || lower.includes('sealant')) productsDetected.push('PU Sealant');
    if (lower.includes('conad') || lower.includes('con ad')) productsDetected.push('ConAD');
    if (lower.includes('dpc') || lower.includes('membrane')) productsDetected.push('DPC Roll 9"');
    if (lower.includes('conrepair') || lower.includes('mortar') || lower.includes('repair')) productsDetected.push('ConRepair Structural Mortar');
    if (lower.includes('water stop') || lower.includes('waterstop')) productsDetected.push('Water Stop Bar');

    // 4. Quantities & Rate
    const qtyMatch = text.match(/(\d+)\s*(bucket|can|roll|bag|sausage|kg|liter|roll|drum|piece|petti)/i) || text.match(/(\d+)\s*(bastey|bottles|bori)/i);
    let prodSummary = productsDetected.join(', ');
    if (qtyMatch) {
      prodSummary += ` (Quantity: ${qtyMatch[0]})`;
    }
    if (prodSummary) setProductDetails(prodSummary);

    const rateMatch = text.match(/rate\s*(\d+)/i) || text.match(/rs\.?\s*(\d+)/i);
    if (rateMatch) {
      setQuotedRate(rateMatch[1]);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Submit to Voice Inbox for Operations Review
  const handleSubmitToInbox = async () => {
    if (!transcript.trim()) {
      alert('Please speak or enter an order transcript before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/voice-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          durationSeconds: duration,
          transcript,
          extractedCustomerName: customerName,
          extractedCustomerPhone: customerPhone,
          extractedCity: city,
          extractedDeliveryAddress: deliveryAddress,
          extractedProducts: productDetails ? [{ name: productDetails }] : null,
          extractedRates: quotedRate,
          extractedNotes: orderNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit voice order');

      setSuccessMessage('Voice order logged and submitted to Operations Voice Inbox for review!');
      if (onOrderCreated) onOrderCreated();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Error saving voice order');
    } finally {
      setSubmitting(false);
    }
  };

  // Handoff to New Order Form
  const handleProceedToOrderForm = () => {
    const queryParams = new URLSearchParams();
    if (customerName) queryParams.set('name', customerName);
    if (customerPhone) queryParams.set('phone', customerPhone);
    if (city) queryParams.set('city', city);
    if (deliveryAddress) queryParams.set('address', deliveryAddress);
    if (orderNotes) queryParams.set('remarks', `[Voice Order Note]: ${orderNotes} - Spoken: ${transcript}`);

    onClose();
    router.push(`/orders/new?${queryParams.toString()}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#241F1F]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-[#B7937A]/25 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#BCAEC4]/25 text-[#AF9292] flex items-center justify-center font-bold">
              <Mic className="w-5 h-5 text-[#B7937A]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#221D1D] tracking-tight">
                🎙️ Voice Order Recording
              </h2>
              <p className="text-xs text-[#635858]">
                Record client call / voice note, edit the transcription, and submit for fulfillment.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F6] hover:bg-[#E6DDDD] text-[#635858] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMessage ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">{successMessage}</h3>
            <p className="text-xs text-slate-500">Closing window...</p>
          </div>
        ) : (
          <>
            {/* Recorder Controls Bar */}
            <div className="bg-[#FAF8F6] p-4 sm:p-5 rounded-2xl border border-[#B7937A]/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {recordingState === 'RECORDING' ? (
                    <button
                      onClick={stopRecording}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>STOP RECORDING</span>
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="px-4 py-2.5 rounded-xl bg-[#B7937A] hover:bg-[#9E7B62] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{recordingState === 'STOPPED' ? 'RECORD AGAIN' : 'START RECORDING'}</span>
                    </button>
                  )}

                  <input 
                    type="file" 
                    accept="audio/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#E6DDDD]/50 text-[#635858] border border-[#C8B5A9] font-medium text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Audio</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#221D1D]">
                  <span className="text-[#635858]">Duration:</span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#C8B5A9]">
                    {formatTimer(duration)}
                  </span>
                </div>
              </div>

              {/* Audio Playback Player */}
              {audioUrl && (
                <div className="pt-2 border-t border-[#E6DDDD] flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-[#B7937A]" />
                  <audio ref={audioPlayerRef} controls src={audioUrl} className="w-full h-8" />
                </div>
              )}
            </div>

            {/* Editable Transcript Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-[#221D1D] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#B7937A]" />
                  <span>Speech-to-Text Transcript (Editable)</span>
                </label>
                <span className="text-[11px] text-[#635858]">
                  {sttSupported ? 'Live speech detection active' : 'Type or edit freely'}
                </span>
              </div>
              <textarea
                rows={3}
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  extractDetailsFromTranscript(e.target.value);
                }}
                placeholder="Spoken words will appear here automatically. You can also type or paste client voice note transcription manually..."
                className="w-full text-xs p-3 rounded-xl border border-[#C8B5A9] focus:outline-none focus:ring-2 focus:ring-[#B7937A] bg-white text-[#221D1D]"
              />
            </div>

            {/* Human Verification & Extracted Fields Card */}
            <div className="bg-[#FAF8F6] p-4 rounded-2xl border border-[#B7937A]/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#221D1D] tracking-tight">
                  Extracted Order Details (Verify and Edit)
                </span>
                <span className="text-[10px] font-semibold text-[#AF9292] bg-white px-2 py-0.5 rounded-full border border-[#C8B5A9]">
                  Review Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Customer / Site Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Mian Construction / Engr. Tariq"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Customer Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0321-7684000"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Delivery City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lahore / Faisalabad"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Quoted Rate (Optional)</label>
                  <input
                    type="text"
                    value={quotedRate}
                    onChange={(e) => setQuotedRate(e.target.value)}
                    placeholder="e.g. 4800 per bucket"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Products & Quantities</label>
                  <input
                    type="text"
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    placeholder="e.g. Ultra Seal (10 Buckets), PU Sealant (20 Sausages)"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-[#635858] mb-1 block">Delivery Site Address / Instructions</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Plot 45, Phase 8, DHA, Lahore"
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#635858] hover:text-[#221D1D] flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={submitting || !transcript.trim()}
                  onClick={handleSubmitToInbox}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-[#B7937A] text-[#B7937A] hover:bg-[#FAF8F6] font-bold text-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : '📥 Submit to Voice Inbox'}
                </button>

                <button
                  type="button"
                  disabled={!transcript.trim()}
                  onClick={handleProceedToOrderForm}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <span>Book Order Directly</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
