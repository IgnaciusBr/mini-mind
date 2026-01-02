
import { useState, useCallback } from 'react';
import { GameItem, ContentType } from '../types';
import { db } from '../firebase';
import { doc, setDoc, increment } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { useAnalytics } from './useAnalytics';

export const useQuizGame = (
  items: GameItem[], 
  contentType: ContentType, 
  user: User | null, 
  speak: (text: string, onEnd?: () => void) => void,
  getSpeakableText: (item: GameItem) => string,
  getPhonetic: (text: string) => string,
  getArticle: (item: GameItem) => string
) => {
  const [target, setTarget] = useState<GameItem | null>(null);
  const [options, setOptions] = useState<GameItem[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);
  const { trackLevelEnd, trackLevelStart } = useAnalytics();

  const startRound = useCallback(() => {
    if (items.length === 0) return;
    setFeedback(null);
    setBlockInput(true);
    
    // Select Target
    const newTarget = items[Math.floor(Math.random() * items.length)];
    setTarget(newTarget);

    // Generate Options (Target + 2 or 3 distractors)
    const opts = [newTarget];
    const pool = items.filter(i => i.id !== newTarget.id);
    
    while(opts.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      opts.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setOptions(opts.sort(() => Math.random() - 0.5));

    trackLevelStart('quiz_round', { target: newTarget.text, category: contentType });

    setTimeout(() => {
      speak(`Cadê ${getArticle(newTarget)} ${getPhonetic(getSpeakableText(newTarget))}?`, () => setBlockInput(false));
    }, 500);
  }, [items, speak, getArticle, getPhonetic, getSpeakableText, contentType]);

  const saveStats = async (isCorrect: boolean) => {
    if (!user) return;
    try {
        const statsRef = doc(db, "users", user.uid, "stats", "quiz");
        await setDoc(statsRef, {
            [contentType]: {
                correct: increment(isCorrect ? 1 : 0),
                wrong: increment(isCorrect ? 0 : 1)
            }
        }, { merge: true });
    } catch (error) {
        console.error("Error saving quiz stats:", error);
    }
  };

  const handleAnswer = (item: GameItem, onCorrect: () => void) => {
    if (blockInput || !target) return;

    if (item.id === target.id) {
        setFeedback('correct');
        saveStats(true);
        trackLevelEnd('quiz_round', true);
        setBlockInput(true);
        speak("Parabéns!", () => {
            onCorrect(); 
            setTimeout(() => startRound(), 1000);
        });
    } else {
        setFeedback('wrong');
        saveStats(false);
        trackLevelEnd('quiz_round', false);
        setBlockInput(true);
        const speakable = getSpeakableText(item);
        speak(`Não! Esse é ${getArticle(item)} ${getPhonetic(speakable)}.`, () => {
            setFeedback(null);
            setTimeout(() => {
                if (target) {
                  speak(`Tente de novo. Cadê ${getArticle(target)} ${getPhonetic(getSpeakableText(target))}?`, () => setBlockInput(false));
                } else { setBlockInput(false); }
            }, 500);
        });
    }
  };

  const reset = () => {
      setTarget(null);
      setOptions([]);
      setFeedback(null);
      setBlockInput(false);
  };

  return { target, options, feedback, startRound, handleAnswer, reset, blockInput };
};
