-- ==============================================================================
-- Advanced Security, Question Banks, and Classroom Management
-- ==============================================================================

-- 1. Secure student_results SELECT policy
DROP POLICY IF EXISTS "Anyone can read results" ON public.student_results;
CREATE POLICY "Teachers can read results of their quizzes" ON public.student_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = student_results.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    ) OR auth.jwt() ->> 'email' = 'admin@examhub.com'
  );

-- 2. Question Banks Tables
CREATE TABLE IF NOT EXISTS public.question_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

-- Enable RLS for Banks
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_questions ENABLE ROW LEVEL SECURITY;

-- Bank Policies
CREATE POLICY "Users can manage their own banks" ON public.question_banks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public banks" ON public.question_banks
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage units of their banks" ON public.bank_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_units.bank_id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can view units of public banks" ON public.bank_units
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_units.bank_id AND is_public = true)
  );

CREATE POLICY "Users can manage questions of their banks" ON public.bank_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_questions.bank_id AND user_id = auth.uid())
  );

CREATE POLICY "Anyone can view questions of public banks" ON public.bank_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_questions.bank_id AND is_public = true)
  );

-- 3. Classroom Management
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  students JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, studentId}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their classes" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);

-- 4. Secure RPCs (Implementation of server-side logic)

-- get_public_quiz: Strips correct answers for students
CREATE OR REPLACE FUNCTION public.get_public_quiz(p_code TEXT)
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
    'is_active', v_quiz.is_active
  );
END;
$$;

-- submit_quiz_result: Validates on server and returns score
CREATE OR REPLACE FUNCTION public.submit_quiz_result(
  p_quiz_id UUID,
  p_student_name TEXT,
  p_student_id TEXT,
  p_answers JSONB,
  p_client_time_taken INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz RECORD;
  v_questions JSONB;
  v_question RECORD;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_result_id UUID;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  v_questions := v_quiz.questions;
  v_total := jsonb_array_length(v_questions);

  -- Calculate score
  FOR v_question IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
    IF (p_answers->>(v_question.value->>'id')) = (v_question.value->>'correctOptionId') THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- Insert result
  INSERT INTO public.student_results (
    quiz_id, student_name, student_id, answers, score, total_questions, time_taken
  ) VALUES (
    p_quiz_id, p_student_name, p_student_id, p_answers, v_score, v_total, p_client_time_taken
  ) RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'id', v_result_id,
    'quiz_id', p_quiz_id,
    'student_name', p_student_name,
    'student_id', p_student_id,
    'score', v_score,
    'total_questions', v_total,
    'time_taken', p_client_time_taken,
    'questions', v_questions -- Include correct answers ONLY in the result return
  );
END;
$$;
