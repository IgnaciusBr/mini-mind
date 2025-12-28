
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
    gender?: 'm' | 'f' | string;
  }

  export interface UserProfile {
    uid: string;
    displayName: string;
    age: number;
    email: string;
    photoURL?: string;
  }

  export interface MemoryResult {
    id: string;
    date: number;
    difficulty: number;
    timeSeconds: number;
    errors: number;
  }

  export interface QuizStats {
    correct: number;
    wrong: number;
  }

  export type QuizHistory = Record<string, QuizStats>;
  
  export const COLORS = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#FFC300',
    '#33FFF5', '#8E44AD', '#2ECC71', '#E67E22', '#E74C3C'
  ];
  
  export const PRONUNCIATION_MAP: Record<string, string> = {
    'A': 'Á', 'E': 'Ê', 'I': 'Í', 'O': 'Ó', 'U': 'Ú',
    'Y': 'ípsilon', 'W': 'dábliu', 'K': 'cá', 'H': 'agá',
    'X': 'xis', 'Z': 'zê'
  };
