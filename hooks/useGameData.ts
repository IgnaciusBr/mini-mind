
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GameItem, ContentType, COLORS } from '../types';

export const useGameData = (contentType: ContentType, displayStyle: 'standard' | 'alternate') => {
  const [dbAnimals, setDbAnimals] = useState<GameItem[]>([]);
  const [items, setItems] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Animals from Firebase
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "animals"));
        const fetchedAnimals: GameItem[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.name || "Sem nome",
            spokenText: data.name,
            color: '#E6DBBF',
            image: data.image_url,
            gender: data.gender || 'm'
          };
        });
        setDbAnimals(fetchedAnimals);

        // Preload images
        const promises = fetchedAnimals.map((item) => {
          if (!item.image) return Promise.resolve();
          return new Promise((resolve) => {
            const img = new Image();
            img.src = item.image!;
            img.onload = resolve;
            img.onerror = resolve; 
          });
        });
        await Promise.all(promises);
      } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnimals();
  }, []);

  // 2. Generate Current Items based on ContentType
  useEffect(() => {
    let newItems: GameItem[] = [];
    const isAlt = displayStyle === 'alternate';

    if (contentType === ContentType.NUMBERS) {
      newItems = Array.from({length: 10}, (_, i) => {
        const num = i + 1;
        return {
          id: `num-${num}`,
          text: num.toString(),
          spokenText: num.toString(), 
          color: COLORS[i % COLORS.length]
        };
      });
    } 
    else if (contentType === ContentType.ANIMALS) {
        // Shuffle animals only when content type changes effectively
        const shuffled = [...dbAnimals].sort(() => Math.random() - 0.5);
        newItems = shuffled.slice(0, 15);
    }
    else {
      let data: string[] = [];
      if (contentType === ContentType.VOWELS) data = ['A', 'E', 'I', 'O', 'U'];
      else if (contentType === ContentType.ALPHABET) data = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

      newItems = data.map((char, i) => {
        return {
          id: `${contentType}-${i}`,
          text: isAlt ? char.toLowerCase() : char,
          spokenText: char, 
          color: COLORS[i % COLORS.length]
        };
      });
    }
    setItems(newItems);
  }, [contentType, displayStyle, dbAnimals]);

  return { items, dbAnimals, isLoading };
};
