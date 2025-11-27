
export enum Subject {
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  MATHS = 'Mathematics',
}

export enum QuestionType {
  MCQ = 'MCQ', // Multiple Choice
  NUMERICAL = 'NUMERICAL' // Integer type
}

export enum QuestionStatus {
  NOT_VISITED = 'not_visited',
  NOT_ANSWERED = 'not_answered',
  ANSWERED = 'answered',
  MARKED_FOR_REVIEW = 'marked',
  ANSWERED_AND_MARKED = 'answered_marked'
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';

export interface Question {
  id: string;
  text: string;
  options?: string[]; // Only for MCQ
  correctAnswer: string; // Option index (0-3) or numerical value string
  type: QuestionType;
  subject: Subject;
  chapter: string;
  year: string; // e.g., "2023 Shift 1"
  explanation: string;
  diagramSvg?: string; // Optional field for SVG code
}

export interface TestConfig {
  subjects: Subject[];
  chapters: string[]; // empty means full syllabus
  questionCount: number;
  durationMinutes: number;
  difficulty: Difficulty;
}

export interface UserResponse {
  questionId: string;
  selectedOption: string | null; // index "0"-"3" or typed numerical value
  status: QuestionStatus;
  timeSpentSeconds: number;
}

export interface TestResult {
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  accuracy: number;
  responses: UserResponse[];
}

export interface TestHistoryItem {
  id: string;
  date: string;
  score: number;
  maxScore: number;
  accuracy: number;
  topics: string; // e.g., "Full Syllabus" or "5 Chapters"
  config: TestConfig;
}
