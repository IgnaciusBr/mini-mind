
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
    image?: string; // Optional property for Animal images
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

  // Mapa de Gênero para Animais (Femininos definidos explicitamente)
  // O padrão será 'o' (masculino) se não estiver nesta lista.
  export const ANIMAL_GENDER_MAP: Record<string, string> = {
    'ARANHA': 'a',
    'CORUJA': 'a',
    'FOCA': 'a',
    'GIRAFA': 'a',
    'OVELHA': 'a',
    'PREGUIÇA': 'a',
    'RAPOSA': 'a',
    'VACA': 'a',
    'ZEBRA': 'a'
  };

  export const ANIMAL_URLS = [
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/ARANHA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CACHORRO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CAMELO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CANGURU.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CASTOR.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CAVALO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CISNE.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/COALA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/COELHO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/CORUJA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/ELEFANTE.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/ESQUILO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/FLAMINGO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/FOCA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/GATO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/GIRAFA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/GOLFINHO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/HIPOPÓTAMO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/JABUTI.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/JACARÉ.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/LEÃO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/MACACO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/MORCEGO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/OVELHA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/PANDA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/PINGUIN.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/POLVO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/PORCO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/PREGUIÇA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/RAPOSA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/RINOCERONTE.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/TIGRE.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/TUBARÃO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/URSO.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/VACA.png?raw=true",
    "https://github.com/IgnaciusBr/Vamos_Aprender/blob/main/ZEBRA.png?raw=true"
  ];