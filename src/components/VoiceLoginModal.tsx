import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, CheckCircle2, ShieldAlert, Sparkles, X, Volume2 } from 'lucide-react';
import { api } from '../services/api.ts';

interface VoiceLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhraseMatched: (username: string) => void;
}

export const VoiceLoginModal: React.FC<VoiceLoginModalProps> = ({
  isOpen,
  onClose,
  onPhraseMatched,
}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('Click the microphone and speak: "This is Nujahath."');
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setError(null);
      setMatched(false);
      setStatusMessage('Click the microphone and speak: "This is Nujahath."');
    }
  }, [isOpen]);

  const startListening = () => {
    setError(null);
    setTranscript('');
    setMatched(false);

    // Browser Speech Recognition Support Check
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Browser speech recognition is not supported in this browser. Please use Google Chrome, Edge, or use manual login.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setListening(true);
        setStatusMessage('Listening... Speak: "This is Nujahath."');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access or sign in manually.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please click the microphone again and speak clearly.');
        } else {
          setError(`Speech error: ${event.error}. You can also type your username manually.`);
        }
      };

      recognition.onend = async () => {
        setListening(false);
        if (transcript.trim().length > 0) {
          await verifyPhraseWithBackend(transcript);
        } else {
          setStatusMessage('Microphone stopped. Click to try again or sign in manually.');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setListening(false);
      setError(`Could not initialize microphone: ${err.message}`);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const verifyPhraseWithBackend = async (phraseToVerify: string) => {
    try {
      setStatusMessage('Verifying phrase format with vault security...');
      const res = await api.voicePhraseAssist(phraseToVerify);
      if (res.matched) {
        setMatched(true);
        setStatusMessage(res.message);
        setTimeout(() => {
          onPhraseMatched(res.suggestedUsername);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Voice phrase did not match required text.');
    }
  };

  // Simulation fallback button for testing environments without working hardware mic
  const handleSimulateVoice = async () => {
    setTranscript('This is Nujahath.');
    await verifyPhraseWithBackend('This is Nujahath.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DCE6F5] relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-200 shadow-xs">
            <Volume2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#142B4D]">Voice Login Assistance</h3>
          <p className="text-xs text-[#64748B] mt-1">
            Convenience voice phrase recognition for rapid username autofill.
          </p>
        </div>

        {/* Required Phrase Card */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl mb-5 text-center">
          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
            Required Spoken Phrase:
          </span>
          <span className="text-base font-extrabold text-[#2563EB] font-mono tracking-wide">
            "This is Nujahath."
          </span>
        </div>

        {/* Microphone Button with Soundwaves */}
        <div className="flex flex-col items-center justify-center my-4 space-y-3">
          <button
            onClick={listening ? stopListening : startListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              listening
                ? 'bg-red-500 text-white shadow-lg shadow-red-200 ring-8 ring-red-100 animate-pulse'
                : 'bg-[#2563EB] text-white shadow-lg shadow-blue-200 hover:bg-blue-700 ring-4 ring-blue-50'
            }`}
          >
            {listening ? <Mic className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <span className="text-xs font-semibold text-slate-700">
            {listening ? 'Listening... speak now' : 'Click microphone to speak'}
          </span>
        </div>

        {/* Live Transcript Display */}
        <div className="min-h-[50px] p-3 bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl text-center flex flex-col justify-center mb-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Heard Audio Transcript</span>
          <p className="text-sm font-medium text-[#142B4D] italic mt-0.5">
            {transcript ? `"${transcript}"` : <span className="text-slate-400 font-normal">Awaiting microphone audio...</span>}
          </p>
        </div>

        {/* Status or Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {matched && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Zero-Trust Security Notice */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 mb-4">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Zero-Trust Notice:</strong> Spoken audio phrase only prefills the account username. Recorded audio can be reproduced; backend credential password verification is strictly required for vault authentication.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleSimulateVoice}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            title="Convenience test simulation for headless or microphone-disabled environments"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Voice ("This is Nujahath.")</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Manual Login
          </button>
        </div>
      </div>
    </div>
  );
};
