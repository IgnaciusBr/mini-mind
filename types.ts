
export enum ContentType {
    NUMBERS = 'NUMEROS',
    ALPHABET = 'ALFABETO',
    VOWELS = 'VOGAIS',
    ANIMALS = 'ANIMAIS'
  }
  
  export enum GameMode {
    EXPLORE = 'EXPLORAR',
    FLASHCARD = 'FLASHCARD',
    QUIZ = 'QUIZ',
    MEMORY = 'MEMORIA'
  }
  
  export interface GameItem {
    id: string;
    text: string;
    color: string;
    spokenText?: string;
    image?: string; 
    gender?: string;
  }

  export interface UserProfile {
    uid: string;
    name: string;
    age: number;
    email: string;
    createdAt: number;
  }

  export interface MemoryResult {
    id: string;
    date: number; 
    difficulty: number; 
    timeSeconds: number;
    errors: number;
  }

  export type QuizHistory = Record<ContentType, { correct: number, wrong: number }>;
  
  export const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#F1C40F'
  ];
  
  export const PRONUNCIATION_MAP: Record<string, string> = {
    'A': 'Á', 'E': 'Ê', 'I': 'Í', 'O': 'Ó', 'U': 'Ú',
    'Y': 'ípsilon', 'W': 'dábliu', 'K': 'cá', 'H': 'agá',
    'X': 'xis', 'Z': 'zê'
  };

  export const ANIMAL_GENDER_MAP: Record<string, string> = {
    'ARANHA': 'a', 'CORUJA': 'a', 'FOCA': 'a', 'GIRAFA': 'a',
    'OVELHA': 'a', 'PREGUIÇA': 'a', 'RAPOSA': 'a', 'VACA': 'a', 
    'ZEBRA': 'a', 'BALEIA': 'a', 'JOANINHA': 'a', 'ÁGUIA': 'a',
    'GALINHA': 'a', 'FÊNIX': 'a'
  };
