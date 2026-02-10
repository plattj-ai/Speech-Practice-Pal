// types.ts

export enum SessionState {
  IDLE = 'IDLE',
  CHOOSING_DIFFICULTY = 'CHOOSING_DIFFICULTY',
  CHOOSING_PHONEME = 'CHOOSING_PHONEME',
  CHOOSING_DURATION = 'CHOOSING_DURATION',
  PRACTICE = 'PRACTICE',
  REPORT = 'REPORT',
  LOADING = 'LOADING',
  MICROPHONE_DENIED = 'MICROPHONE_DENIED',
}

export enum SentenceType {
  CONVERSATIONAL = 'conversational',
  TONGUE_TWISTER = 'tongueTwister',
}

export enum PhonemeType {
  R = 'R',
  S_Z = 'S/Z',
  SH = 'Sh',
  CH = 'Ch',
  J = 'J',
  L = 'L',
  TH = 'TH'
}

export type DifficultyLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export interface DetailedError {
  word: string;
  errorType?: string; 
  phonemeIssue: string; 
  suggestion: string;
}

export interface AnalysisResult {
  detailedErrors: DetailedError[];
  overallDifficultPhonemes: string[]; 
  overallFeedback: string; 
  spokenTranscript: string; 
}

export interface ErrorDetail {
  timestamp: number;
  expectedSentence: string;
  spokenSentence: string;
  errors: DetailedError[]; 
  attempts: number;
}

export interface ReportData {
  totalSentencesInSession: number; 
  totalSentencesRead: number; 
  totalSentencesSkipped: number;
  totalErrors: number; 
  errorHistory: ErrorDetail[];
  difficultSoundsAnalysis: string; 
  qualitativeAnalysis: string;
  sentenceType: SentenceType; 
  targetPhonemes: string[];
  difficultyLevel: DifficultyLevel;
}

export interface AudioBlob {
  data: string; 
  mimeType: string; 
}

export enum AiVoice {
  ZEPHYR = 'Zephyr',
  KORE = 'Kore',
  PUCK = 'Puck',
  CHARON = 'Charon',
  FENRIR = 'Fenrir',
}

export interface PhonemeInfo {
  phoneme: string; 
  start_offset: string; 
  end_offset: string;   
  accuracy_score: number; 
}

export interface WordInfo {
  word: string; 
  start_time: string; 
  end_time: string;   
  pronunciation_assessment: {
    accuracy_score: number; 
    fluency_score: number;  
    completeness_score: number; 
    rhythm_score: number; 
  };
  phonemes?: PhonemeInfo[];
  error_type?: string[]; 
}

export interface RecognitionResult {
  alternatives: {
    transcript: string; 
    confidence: number; 
    words: WordInfo[];   
  }[];
  language_code: string;
}

export interface PronunciationAssessmentResult {
  results: RecognitionResult[];
}