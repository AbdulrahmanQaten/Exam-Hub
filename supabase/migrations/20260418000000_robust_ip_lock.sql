-- ==========================================
-- V2: Server-Side Robust IP Lock
-- ==========================================

-- 1. Function to allow teacher to lock a quiz using server-detected IP
CREATE OR REPLACE FUNCTION public.lock_quiz_to_current_ip(p_quiz_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ip TEXT;
BEGIN
  -- Get the real client IP from request headers (PostgREST handles this)
  v_ip := (current_setting('request.headers', true)::json->>'x-forwarded-for');
  
  -- If multiple IPs in chain, get the first one
  v_ip := split_part(v_ip, ',', 1);

  -- Update the quiz
  UPDATE public.quizzes 
  SET allowed_ip = v_ip 
  WHERE id = p_quiz_id AND (settings->>'teacher_id')::uuid = auth.uid();

  RETURN v_ip;
END;
$$;

-- 2. Updated get_public_quiz that detects student IP automatically on the server
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
  -- Get client IP on the server
  v_client_ip := split_part((current_setting('request.headers', true)::json->>'x-forwarded-for'), ',', 1);

  SELECT * INTO v_quiz FROM public.quizzes WHERE code = p_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Network Lock Check (Server-side comparison)
  IF v_quiz.allowed_ip IS NOT NULL AND v_quiz.allowed_ip <> v_client_ip THEN
    RETURN jsonb_build_object(
      'error', 'network_lock', 
      'message', 'عذراً! هذا الاختبار متاح فقط من داخل شبكة المعلم الخاصة.',
      'debug_info', jsonb_build_object('your_ip', v_client_ip, 'allowed_ip', v_quiz.allowed_ip)
    );
  END IF;

  v_questions := v_quiz.questions;
  
  -- Strip correctOptionId
  SELECT jsonb_agg((q - 'correctOptionId')) INTO v_stripped_questions
  FROM jsonb_array_elements(v_questions) AS q;

  RETURN jsonb_build_object(
    'id', v_quiz.id,
    'title', v_quiz.title,
    'code', v_quiz.code,
    'settings', v_quiz.settings,
    'questions', v_stripped_questions,
    'roster', v_quiz.roster,
    'is_active', v_quiz.is_active
  );
END;
$$;
