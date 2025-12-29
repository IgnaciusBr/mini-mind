
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
    gender?: 'm' | 'f' | string; // Novo campo vindo do Firebase
  }

  // --- Statistics Types ---
  
  export interface MemoryResult {
    id: string;
    date: number; // Timestamp
    difficulty: number; // Number of pairs
    timeSeconds: number;
    errors: number;
  }

  export interface QuizStats {
    correct: number;
    wrong: number;
  }

  export interface UserProfile {
    uid: string;
    childName: string;
    age: string;
    parentEmail: string;
    createdAt: number;
  }

  // Map ContentType to Stats
  export type QuizHistory = Record<ContentType, QuizStats>;
  
  export const COLORS = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#FFC300',
    '#33FFF5', '#8E44AD', '#2ECC71', '#E67E22', '#E74C3C'
  ];
  
  export const PRONUNCIATION_MAP: Record<string, string> = {
    'A': 'Á',
    'E': 'Ê',
    'I': 'Í',
    'O': 'Ó',
    'U': 'Ú',
    'Y': 'ípsilon',
    'W': 'dábliu',
    'K': 'cá',
    'H': 'agá',
    'X': 'xis',
    'Z': 'zê'
  };
