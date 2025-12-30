
import { useState, useEffect, useRef } from 'react';
import { GameItem } from '../types';

export const useFlashcardGame = (
    items: GameItem[], 
    isActive: boolean,
    speak: (text: string) => void,
    getSpeakableText: (item: GameItem) => string
) => {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive || items.length === 0) {
        clearInterval(intervalRef.current);
        return;
    }

    // Reset to 0 and speak first item
    setIndex(0);
    speak(getSpeakableText(items[0]));

    intervalRef.current = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % items.length;
        speak(getSpeakableText(items[next]));
        return next;
      });
    }, 3500);

    return () => clearInterval(intervalRef.current);
  }, [isActive, items, speak, getSpeakableText]);

  return { index, setIndex };
};
