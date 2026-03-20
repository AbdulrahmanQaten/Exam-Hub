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

export async function uploadQuestionImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('quiz-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('quiz-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
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
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  
  // تصفية أمنية قوية: عرض الاختبارات التي أنشأها هذا المعلم فقط!
  const myQuizzes = (data || []).filter((row: any) => {
    return row.settings && row.settings.teacher_id === user?.id;
  });
  
  return myQuizzes.map(mapRowToQuiz);
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
  const { data: { user } } = await supabase.auth.getUser();
  
  const row = {
    title,
    code: generateCode(),
    questions: questions as any,
    settings: { ...(settings as any), teacher_id: user?.id },
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

export async function duplicateQuiz(quizId: string): Promise<Quiz> {
  const existing = await getQuizById(quizId);
  if (!existing) throw new Error("Quiz not found");
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // ننسخ البيانات بدقة، ونولد كوداً جديداً، ونجعله غير نشط حتى يقوم المعلم بمراجعته.
  const row = {
    title: `نسخة من ${existing.title}`,
    code: generateCode(),
    questions: existing.questions as any,
    settings: { ...(existing.settings as any), teacher_id: user?.id },
    roster: existing.roster ? (existing.roster as any) : null,
    is_active: false,
  };
  const { data, error } = await supabase.from("quizzes").insert(row).select().single();
  if (error) throw error;
  return mapRowToQuiz(data);
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
  
  const activeList = (data || []).map(mapRowToActive);
  if (activeList.length === 0) return [];

  // جلب إعدادات الاختبار للتحقق من المهلة الزمنية
  const quiz = await getQuizById(quizId);
  if (!quiz) return activeList;

  const now = new Date();
  
  return activeList.filter(student => {
    const startTime = new Date(student.startedAt);
    const diffMinutes = (now.getTime() - startTime.getTime()) / 60000;
    
    if (quiz.settings.timerEnabled) {
      // إعطاء مهلة إضافية دقيقتين للمزامنة بعد انتهاء الوقت
      if (diffMinutes > quiz.settings.timerMinutes + 2) {
         // تنظيف الطالب من قاعدة البيانات في الخلفية
         removeActiveStudent(quizId, student.studentName).catch(console.error);
         return false; 
      }
    } else {
      // إذا لم يكن هناك مؤقت، يعتبر منتهي الصلاحية بعد 4 ساعات
      if (diffMinutes > 240) {
         removeActiveStudent(quizId, student.studentName).catch(console.error);
         return false;
      }
    }
    return true;
  });
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
