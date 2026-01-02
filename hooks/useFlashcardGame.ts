
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

    // Function to pick next random card
    const nextRandomCard = () => {
        setIndex(prev => {
            let nextIndex = Math.floor(Math.random() * items.length);
            
            // Try to avoid the same card twice if we have enough items
            if (items.length > 1 && nextIndex === prev) {
                nextIndex = (nextIndex + 1) % items.length;
            }
            
            // Speak inside the setState callback to ensure we have the correct new index reference logic,
            // though practically we just use the calculated nextIndex.
            speak(getSpeakableText(items[nextIndex]));
            return nextIndex;
        });
    };

    // Initial item
    nextRandomCard();

    intervalRef.current = setInterval(nextRandomCard, 3500);

    return () => clearInterval(intervalRef.current);
  }, [isActive, items, speak, getSpeakableText]);

  return { index, setIndex };
};
