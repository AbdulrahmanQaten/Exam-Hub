-- ==========================================
-- IP Lock and Duplicate Login Prevention
-- ==========================================

-- 1. Add IP Lock support to quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS allowed_ip TEXT;

-- 2. Modify active_students to handle Student IDs correctly and prevent duplicate logins
-- First, ensure the table exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS public.active_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- We add a unique constraint to prevent the same student (by ID or Name) from being in the same quiz twice
  UNIQUE(quiz_id, student_name),
  UNIQUE(quiz_id, student_id)
);

-- 3. Secure add_active_student RPC
CREATE OR REPLACE FUNCTION public.add_active_student(
  p_quiz_id UUID,
  p_student_name TEXT,
  p_student_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if quiz exists and is active
  IF NOT EXISTS (SELECT 1 FROM public.quizzes WHERE id = p_quiz_id AND is_active = true) THEN
    RAISE EXCEPTION 'Quiz not found or inactive';
  END IF;

  -- Attempt to insert. If student_id is provided, it must be unique for this quiz.
  -- If only name is provided (guest mode), name must be unique.
  INSERT INTO public.active_students (quiz_id, student_name, student_id)
  VALUES (p_quiz_id, p_student_name, p_student_id)
  ON CONFLICT (quiz_id, student_name) DO UPDATE SET started_at = now()
  WHERE public.active_students.student_name = p_student_name;
  
  -- Handle the case where student_id is provided but already active (by another name/session)
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'هذا الرقم مسجل دخول حالياً من جهاز آخر';
END;
$$;

-- 4. Secure get_public_quiz with IP check
CREATE OR REPLACE FUNCTION public.get_public_quiz_v2(p_code TEXT, p_client_ip TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz RECORD;
  v_questions JSONB;
  v_stripped_questions JSONB;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Network Lock Check
  IF v_quiz.allowed_ip IS NOT NULL AND v_quiz.allowed_ip <> p_client_ip THEN
    RETURN jsonb_build_object('error', 'network_lock', 'message', 'عذراً! هذا الاختبار متاح فقط من داخل شبكة المعلم الخاصة.');
  END IF;

  v_questions := v_quiz.questions;
  
  -- Strip correctOptionId from questions
  SELECT jsonb_agg(
    (q - 'correctOptionId')
  ) INTO v_stripped_questions
  FROM jsonb_array_elements(v_questions) AS q;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'code', v_quiz.code,
    'settings', v_quiz.settings,
    'questions', v_stripped_questions,
    'roster', v_quiz.roster,
    'created_at', v_quiz.created_at,
    'is_active', v_quiz.is_active,
    'allowed_ip', v_quiz.allowed_ip
  );
END;
$$;
