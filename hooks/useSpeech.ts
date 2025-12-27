import { useState, useEffect, useCallback } from 'react';
import { PRONUNCIATION_MAP } from '../types';

export const useSpeech = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const avail = window.speechSynthesis.getVoices().filter(v => v.lang.includes('pt'));
      setVoices(avail);
      
      // Auto-select Google or Luciana if available, otherwise first PT voice
      const preferred = avail.find(v => v.name.includes("Google") || v.name.includes("Luciana"));
      if (preferred) setSelectedVoice(preferred);
      else if (avail.length > 0) setSelectedVoice(avail[0]);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text) return;

    window.speechSynthesis.cancel();
    setSpeaking(true);

    // Handle special pronunciations
    const txtToSpeak = PRONUNCIATION_MAP[text] || text;

    const u = new SpeechSynthesisUtterance(txtToSpeak);
    u.lang = 'pt-BR';
    if (selectedVoice) u.voice = selectedVoice;
    u.rate = 0.9; // Slightly slower for kids
    
    u.onend = () => {
      setSpeaking(false);
      if (onEnd) onEnd();
    };

    u.onerror = () => {
        setSpeaking(false);
    };

    window.speechSynthesis.speak(u);
  }, [selectedVoice]);

  return { voices, selectedVoice, setSelectedVoice, speak, speaking };
};