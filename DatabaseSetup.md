# Supabase Database Setup Script (V4 - Final Stable)

Please copy and run this script in your **Supabase SQL Editor**. This version features a simplified, bulletproof session manager that prevents duplicate Student IDs without throwing `ON CONFLICT` errors for guests.

```sql
-- ==========================================
-- 1. CLASSROOM MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  students JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their classes" ON public.classes;
CREATE POLICY "Teachers can manage their classes" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);

-- ==========================================
-- 2. QUESTION BANKS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.bank_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.bank_units(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'truefalse')),
  text TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL,
  correct_option_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.bank_questions ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.bank_units(id) ON DELETE SET NULL;

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own banks" ON public.question_banks;
CREATE POLICY "Users can manage their own banks" ON public.question_banks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view public banks" ON public.question_banks;
CREATE POLICY "Anyone can view public banks" ON public.question_banks FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users manage their units" ON public.bank_units;
CREATE POLICY "Users manage their units" ON public.bank_units 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view units of public banks" ON public.bank_units;
CREATE POLICY "Anyone can view units of public banks" ON public.bank_units
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND is_public = true));

DROP POLICY IF EXISTS "Users manage their questions" ON public.bank_questions;
CREATE POLICY "Users manage their questions" ON public.bank_questions 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view questions of public banks" ON public.bank_questions;
CREATE POLICY "Anyone can view questions of public banks" ON public.bank_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND is_public = true));

-- ==========================================
-- 3. ROBUST SESSION MANAGEMENT (NO ERRORS)
-- ==========================================

-- Clean slate
DROP TABLE IF EXISTS public.active_students;

-- Recreate without troublesome UNIQUE constraints
CREATE TABLE public.active_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id TEXT, -- Nullable for guests
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Smart function that prevents duplicate IDs manually
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
  -- If roster mode (student has an ID)
  IF p_student_id IS NOT NULL THEN
    -- Check if this specific ID is already logged into this quiz
    IF EXISTS (
      SELECT 1 FROM public.active_students 
      WHERE quiz_id = p_quiz_id AND student_id = p_student_id
    ) THEN
      RAISE EXCEPTION 'هذا الرقم مسجل دخول حالياً من جهاز آخر';
    ELSE
      -- Just in case, clean up their old sessions for this quiz
      DELETE FROM public.active_students WHERE quiz_id = p_quiz_id AND student_id = p_student_id;
      
      -- Insert new active session
      INSERT INTO public.active_students (quiz_id, student_name, student_id)
      VALUES (p_quiz_id, p_student_name, p_student_id);
    END IF;

  -- If guest mode (no student ID)
  ELSE
    -- Guests don't get blocked. Just clear any old session with the exact same name for this quiz
    DELETE FROM public.active_students WHERE quiz_id = p_quiz_id AND student_name = p_student_name AND student_id IS NULL;
    
    INSERT INTO public.active_students (quiz_id, student_name, student_id)
    VALUES (p_quiz_id, p_student_name, NULL);
  END IF;
END;
$$;

-- ==========================================
-- 4. SERVER-SIDE IP NETWORK LOCK
-- ==========================================

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS allowed_ip TEXT;

CREATE OR REPLACE FUNCTION public.lock_quiz_to_current_ip(p_quiz_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ip TEXT;
BEGIN
  -- Grab the teacher's real public IP directly on the server
  v_ip := split_part((current_setting('request.headers', true)::json->>'x-forwarded-for'), ',', 1);
  UPDATE public.quizzes SET allowed_ip = v_ip WHERE id = p_quiz_id AND (settings->>'teacher_id')::uuid = auth.uid();
  RETURN v_ip;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_quiz_v3(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz RECORD;
  v_questions JSONB;
  v_stripped_questions JSONB;
  v_client_ip TEXT;
BEGIN
  -- Grab the student's real public IP directly on the server
  v_client_ip := split_part((current_setting('request.headers', true)::json->>'x-forwarded-for'), ',', 1);

  SELECT * INTO v_quiz FROM public.quizzes WHERE code = p_code AND is_active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- IP Lock Check (Strict Server Comparison)
  IF v_quiz.allowed_ip IS NOT NULL AND v_quiz.allowed_ip <> v_client_ip THEN
    RETURN jsonb_build_object('error', 'network_lock', 'message', 'عذراً! هذا الاختبار متاح فقط من داخل شبكة المعلم الخاصة.');
  END IF;

  SELECT jsonb_agg((q - 'correctOptionId')) INTO v_stripped_questions
  FROM jsonb_array_elements(v_quiz.questions) AS q;

  RETURN jsonb_build_object(
    'id', v_quiz.id, 'title', v_quiz.title, 'code', v_quiz.code,
    'settings', v_quiz.settings, 'questions', v_stripped_questions,
    'roster', v_quiz.roster, 'is_active', v_quiz.is_active
  );
END;
$$;

-- Secure Student Check (Allows students to check completion without exposing all data)
CREATE OR REPLACE FUNCTION public.check_student_completed(p_quiz_id UUID, p_student_id TEXT DEFAULT NULL, p_student_name TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_student_id IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM public.student_results WHERE quiz_id = p_quiz_id AND student_id = p_student_id);
  ELSIF p_student_name IS NOT NULL THEN
    RETURN EXISTS (SELECT 1 FROM public.student_results WHERE quiz_id = p_quiz_id AND student_name = p_student_name);
  END IF;
  RETURN FALSE;
END;
$$;
```
