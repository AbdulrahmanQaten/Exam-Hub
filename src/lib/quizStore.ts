import { supabase } from "@/integrations/supabase/client";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "truefalse";
  text: string;
  imageUrl?: string;
  options: QuizOption[];
  correctOptionId: string;
}

export interface QuizSettings {
  timerEnabled: boolean;
  timerMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback?: boolean;
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
  roster?: StudentRosterEntry[];
  isActive: boolean;
  createdAt: string;
  allowed_ip?: string | null;
}

export interface StudentResult {
  id: string;
  quizId: string;
  studentName: string;
  studentId?: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
  questions?: QuizQuestion[];
}

export interface ActiveStudent {
  quiz_id: string;
  studentName: string;
  studentId?: string;
  startedAt: string;
}

export const generateQuestionId = () => Math.random().toString(36).substring(2, 9);
export const generateOptionId = () => Math.random().toString(36).substring(2, 9);

/**
 * Server-side IP Lock: Detects your IP in the database directly
 */
export async function lockQuizToCurrentIP(quizId: string): Promise<string> {
  const { data, error } = await supabase.rpc("lock_quiz_to_current_ip", {
    p_quiz_id: quizId
  });
  if (error) throw error;
  return data;
}

export async function getServerTime(): Promise<Date> {
  const { data, error } = await supabase.rpc("get_server_time");
  if (error) return new Date();
  return new Date(data);
}

export async function createQuiz(title: string, questions: QuizQuestion[], settings: QuizSettings, roster?: StudentRosterEntry[], allowed_ip?: string | null): Promise<Quiz> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      title,
      code,
      questions,
      settings: { ...settings, teacher_id: user?.id },
      roster,
      allowed_ip
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: data.id,
    title: data.title,
    code: data.code,
    questions: data.questions as any,
    settings: data.settings as any,
    roster: data.roster as any,
    isActive: data.is_active,
    createdAt: data.created_at,
    allowed_ip: data.allowed_ip
  };
}

export async function getQuizzes(): Promise<Quiz[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const local = localStorage.getItem("anonymous_quizzes");
    return local ? JSON.parse(local) : [];
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    code: row.code,
    questions: row.questions,
    settings: row.settings,
    roster: row.roster,
    isActive: row.is_active,
    createdAt: row.created_at,
    allowed_ip: row.allowed_ip
  }));
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    title: data.title,
    code: data.code,
    questions: data.questions as any,
    settings: data.settings as any,
    roster: data.roster as any,
    isActive: data.is_active,
    createdAt: data.created_at,
    allowed_ip: data.allowed_ip
  };
}

export async function getQuizByCode(code: string): Promise<Quiz | null> {
  // Use V3 that detects client IP automatically on server
  const { data, error } = await supabase.rpc("get_public_quiz_v3", { 
    p_code: code.toUpperCase()
  });

  if (error || !data) return null;
  
  if (data.error === 'network_lock') {
    throw new Error(data.message);
  }

  return {
    id: data.id,
    title: data.title,
    code: data.code,
    questions: data.questions as any,
    settings: data.settings as any,
    roster: data.roster as any,
    isActive: data.is_active,
    createdAt: data.created_at
  };
}

export async function updateQuiz(quiz: Quiz): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .update({
      title: quiz.title,
      questions: quiz.questions,
      settings: quiz.settings,
      roster: quiz.roster,
      is_active: quiz.isActive,
      allowed_ip: quiz.allowed_ip
    })
    .eq("id", quiz.id);

  if (error) throw error;
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function duplicateQuiz(quiz: Quiz): Promise<Quiz> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      title: `${quiz.title} (نسخة)`,
      code,
      questions: quiz.questions,
      settings: { ...quiz.settings, teacher_id: user?.id },
      roster: quiz.roster,
      allowed_ip: quiz.allowed_ip
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    code: data.code,
    questions: data.questions as any,
    settings: data.settings as any,
    roster: data.roster as any,
    isActive: data.is_active,
    createdAt: data.created_at,
    allowed_ip: data.allowed_ip
  };
}

export async function submitResult(quizId: string, studentName: string, answers: Record<string, string>, timeTaken: number, studentId?: string): Promise<any> {
  const { data, error } = await supabase.rpc("submit_quiz_result", {
    p_quiz_id: quizId,
    p_student_name: studentName,
    p_student_id: studentId || null,
    p_answers: answers,
    p_client_time_taken: timeTaken
  });

  if (error) throw error;
  return data;
}

export async function checkStudentCompleted(quizId: string, studentId?: string, studentName?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_student_completed", {
    p_quiz_id: quizId,
    p_student_id: studentId || null,
    p_student_name: studentName || null
  });
  if (error) return false;
  return !!data;
}

export async function getResultsForQuiz(quizId: string): Promise<StudentResult[]> {
  const { data, error } = await supabase
    .from("student_results")
    .select("*")
    .eq("quiz_id", quizId)
    .order("completed_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    quizId: row.quiz_id,
    studentName: row.student_name,
    studentId: row.student_id,
    answers: row.answers,
    score: row.score,
    totalQuestions: row.total_questions,
    timeTaken: row.time_taken,
    completedAt: row.completed_at
  }));
}

export async function getActiveStudentsForQuiz(quizId: string): Promise<ActiveStudent[]> {
  const { data, error } = await supabase
    .from("active_students")
    .select("*")
    .eq("quiz_id", quizId);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    quiz_id: row.quiz_id,
    studentName: row.student_name,
    studentId: row.student_id,
    startedAt: row.started_at
  }));
}

export async function addActiveStudent(quizId: string, studentName: string, studentId?: string): Promise<void> {
  const { error } = await supabase.rpc("add_active_student", {
    p_quiz_id: quizId,
    p_student_name: studentName,
    p_student_id: studentId || null
  });

  if (error) {
    throw new Error(error.message || "هذا الرقم مسجل دخول حالياً من جهاز آخر");
  }
}

export async function removeActiveStudent(quizId: string, studentName: string): Promise<void> {
  const { error } = await supabase
    .from("active_students")
    .delete()
    .match({ quiz_id: quizId, student_name: studentName });

  if (error) throw error;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function uploadQuestionImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('quiz-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('quiz-images')
    .getPublicUrl(filePath);

  return publicUrl;
}
