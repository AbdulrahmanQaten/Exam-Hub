import { supabase } from "@/integrations/supabase/client";

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
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  completedAt: string;
  timeTaken: number;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Map DB row to Quiz interface
function mapRowToQuiz(row: any): Quiz {
  return {
    id: row.id,
    title: row.title,
    code: row.code,
    questions: row.questions as QuizQuestion[],
    settings: row.settings as QuizSettings,
    createdAt: row.created_at,
    isActive: row.is_active,
    roster: row.roster as StudentRosterEntry[] | undefined,
  };
}

function mapRowToResult(row: any): StudentResult {
  return {
    id: row.id,
    quizId: row.quiz_id,
    studentName: row.student_name,
    studentId: row.student_id || undefined,
    answers: row.answers as Record<string, string>,
    score: row.score,
    totalQuestions: row.total_questions,
    completedAt: row.completed_at,
    timeTaken: row.time_taken,
  };
}

function mapRowToActive(row: any): ActiveStudent {
  return {
    quizId: row.quiz_id,
    studentName: row.student_name,
    studentId: row.student_id || undefined,
    startedAt: row.started_at,
  };
}

// ========= ASYNC API =========

export async function getQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRowToQuiz);
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRowToQuiz(data) : undefined;
}

export async function getQuizByCode(code: string): Promise<Quiz | undefined> {
  const { data, error } = await supabase.from("quizzes").select("*").eq("code", code).eq("is_active", true).maybeSingle();
  if (error) throw error;
  return data ? mapRowToQuiz(data) : undefined;
}

export async function createQuiz(title: string, questions: QuizQuestion[], settings: QuizSettings, roster?: StudentRosterEntry[]): Promise<Quiz> {
  const row = {
    title,
    code: generateCode(),
    questions: questions as any,
    settings: settings as any,
    roster: roster ? (roster as any) : null,
    is_active: true,
  };
  const { data, error } = await supabase.from("quizzes").insert(row).select().single();
  if (error) throw error;
  return mapRowToQuiz(data);
}

export async function updateQuiz(quiz: Quiz): Promise<void> {
  const { error } = await supabase.from("quizzes").update({
    title: quiz.title,
    questions: quiz.questions as any,
    settings: quiz.settings as any,
    roster: quiz.roster ? (quiz.roster as any) : null,
    is_active: quiz.isActive,
  }).eq("id", quiz.id);
  if (error) throw error;
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) throw error;
}

// Results
export async function getResultsForQuiz(quizId: string): Promise<StudentResult[]> {
  const { data, error } = await supabase.from("student_results").select("*").eq("quiz_id", quizId);
  if (error) throw error;
  return (data || []).map(mapRowToResult);
}

export async function submitResult(quizId: string, studentName: string, answers: Record<string, string>, timeTaken: number, studentId?: string): Promise<StudentResult> {
  const quiz = await getQuizById(quizId);
  if (!quiz) throw new Error("Quiz not found");

  let score = 0;
  quiz.questions.forEach((q) => {
    if (answers[q.id] === q.correctOptionId) score++;
  });

  const row = {
    quiz_id: quizId,
    student_name: studentName,
    student_id: studentId || null,
    answers: answers as any,
    score,
    total_questions: quiz.questions.length,
    time_taken: timeTaken,
  };
  const { data, error } = await supabase.from("student_results").insert(row).select().single();
  if (error) throw error;

  // Remove from active students
  await removeActiveStudent(quizId, studentName);

  return mapRowToResult(data);
}

// Active students
export async function getActiveStudentsForQuiz(quizId: string): Promise<ActiveStudent[]> {
  const { data, error } = await supabase.from("active_students").select("*").eq("quiz_id", quizId);
  if (error) throw error;
  return (data || []).map(mapRowToActive);
}

export async function addActiveStudent(quizId: string, studentName: string, studentId?: string): Promise<void> {
  const { error } = await supabase.from("active_students").insert({
    quiz_id: quizId,
    student_name: studentName,
    student_id: studentId || null,
  });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeActiveStudent(quizId: string, studentName: string): Promise<void> {
  const { error } = await supabase.from("active_students").delete().eq("quiz_id", quizId).eq("student_name", studentName);
  if (error) throw error;
}

// Utilities
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
