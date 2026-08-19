export type Difficulty = 'easy' | 'medium' | 'hard';
export type Label = 'real' | 'fake';
export type GamePhase = 'loading' | 'watching' | 'revealing';

export interface VideoClip {
  id: string;
  src: string;
  poster?: string;
  label: Label;
  explanation: string;
  cues: string[];
  difficulty: Difficulty;
  technique?: string;
}

export interface RoundResult {
  videoId: string;
  label: Label;
  userAnswer: Label | null;
  correct: boolean;
  timeUsed: number;
  points: number;
}

export interface GameSession {
  results: RoundResult[];
  score: number;
  maxStreak: number;
  totalRounds: number;
}
