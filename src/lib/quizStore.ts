export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "truefalse";
  text: string;
  options: QuizOption[];
  correctOptionId: string;
}

export interface QuizSettings {
  timerEnabled: boolean;
  timerMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface StudentRosterEntry {
  name: string;
  studentId: string;
}

export interface Quiz {
  id: string;
  title: string;
  code: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt: string;
  isActive: boolean;
  roster?: StudentRosterEntry[];
}

export interface ActiveStudent {
  quizId: string;
  studentName: string;
  studentId?: string;
  startedAt: string;
}

export interface StudentResult {
  id: string;
  quizId: string;
  studentName: string;
  studentId?: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeTaken: number; // seconds
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const QUIZZES_KEY = "quizapp_quizzes";
const RESULTS_KEY = "quizapp_results";
const ACTIVE_KEY = "quizapp_active_students";

export function getQuizzes(): Quiz[] {
  const data = localStorage.getItem(QUIZZES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveQuizzes(quizzes: Quiz[]) {
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function createQuiz(title: string, questions: QuizQuestion[], settings: QuizSettings, roster?: StudentRosterEntry[]): Quiz {
  const quiz: Quiz = {
    id: generateId(),
    title,
    code: generateCode(),
    questions,
    settings,
    createdAt: new Date().toISOString(),
    isActive: true,
    roster,
  };
  const quizzes = getQuizzes();
  quizzes.push(quiz);
  saveQuizzes(quizzes);
  return quiz;
}

export function updateQuiz(quiz: Quiz) {
  const quizzes = getQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx !== -1) {
    quizzes[idx] = quiz;
    saveQuizzes(quizzes);
  }
}

export function deleteQuiz(id: string) {
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  saveQuizzes(quizzes);
  const results = getResults().filter((r) => r.quizId !== id);
  saveResults(results);
  removeActiveStudentsForQuiz(id);
}

export function getQuizByCode(code: string): Quiz | undefined {
  return getQuizzes().find((q) => q.code === code && q.isActive);
}

export function getQuizById(id: string): Quiz | undefined {
  return getQuizzes().find((q) => q.id === id);
}

// Find quiz by student ID across all active quizzes with rosters
export function findQuizByStudentId(studentId: string): { quiz: Quiz; entry: StudentRosterEntry } | undefined {
  const quizzes = getQuizzes().filter(q => q.isActive && q.roster && q.roster.length > 0);
  for (const quiz of quizzes) {
    const entry = quiz.roster!.find(r => r.studentId === studentId);
    if (entry) return { quiz, entry };
  }
  return undefined;
}

export function getResults(): StudentResult[] {
  const data = localStorage.getItem(RESULTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveResults(results: StudentResult[]) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function submitResult(quizId: string, studentName: string, answers: Record<string, string>, timeTaken: number, studentId?: string): StudentResult {
  const quiz = getQuizById(quizId);
  if (!quiz) throw new Error("Quiz not found");

  let score = 0;
  quiz.questions.forEach((q) => {
    if (answers[q.id] === q.correctOptionId) score++;
  });

  const result: StudentResult = {
    id: generateId(),
    quizId,
    studentName,
    studentId,
    answers,
    score,
    totalQuestions: quiz.questions.length,
    completedAt: new Date().toISOString(),
    timeTaken,
  };

  const results = getResults();
  results.push(result);
  saveResults(results);
  
  // Remove from active students
  removeActiveStudent(quizId, studentName);
  
  return result;
}

export function getResultsForQuiz(quizId: string): StudentResult[] {
  return getResults().filter((r) => r.quizId === quizId);
}

// Active students tracking
export function getActiveStudents(): ActiveStudent[] {
  const data = localStorage.getItem(ACTIVE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveActiveStudents(students: ActiveStudent[]) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(students));
}

export function addActiveStudent(quizId: string, studentName: string, studentId?: string) {
  const students = getActiveStudents();
  // Don't add duplicates
  if (!students.find(s => s.quizId === quizId && s.studentName === studentName)) {
    students.push({ quizId, studentName, studentId, startedAt: new Date().toISOString() });
    saveActiveStudents(students);
  }
}

export function removeActiveStudent(quizId: string, studentName: string) {
  const students = getActiveStudents().filter(s => !(s.quizId === quizId && s.studentName === studentName));
  saveActiveStudents(students);
}

export function getActiveStudentsForQuiz(quizId: string): ActiveStudent[] {
  return getActiveStudents().filter(s => s.quizId === quizId);
}

function removeActiveStudentsForQuiz(quizId: string) {
  const students = getActiveStudents().filter(s => s.quizId !== quizId);
  saveActiveStudents(students);
}

export function generateQuestionId(): string {
  return generateId();
}

export function generateOptionId(): string {
  return generateId();
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
