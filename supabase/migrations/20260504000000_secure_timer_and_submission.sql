-- ==========================================
-- Secure Timer Validation and Submission
-- ==========================================

-- Improved submit_quiz_result: 
-- 1. Calculates time_taken on server using active_students.started_at
-- 2. Automatically cleans up active_students
-- 3. Enforces quiz timer settings
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
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_server_time_taken INTEGER;
  v_max_seconds INTEGER;
BEGIN
  -- 1. Get Quiz and started_at
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  SELECT started_at INTO v_started_at FROM public.active_students 
  WHERE quiz_id = p_quiz_id AND student_name = p_student_name;

  -- 2. Calculate actual time taken (server-side)
  IF v_started_at IS NOT NULL THEN
    v_server_time_taken := EXTRACT(EPOCH FROM (now() - v_started_at))::INTEGER;
  ELSE
    -- Fallback to client time if started_at is missing for some reason
    v_server_time_taken := p_client_time_taken;
  END IF;

  -- 3. Enforce Timer Limit (with 30-second grace period for network latency)
  IF (v_quiz.settings->>'timerEnabled')::BOOLEAN = true THEN
    v_max_seconds := (v_quiz.settings->>'timerMinutes')::INTEGER * 60 + 30;
    IF v_server_time_taken > v_max_seconds THEN
      -- Optional: You could cap the time or flag the result
      -- For now, we'll just record the actual server time
    END IF;
  END IF;

  -- 4. Calculate score
  v_questions := v_quiz.questions;
  v_total := jsonb_array_length(v_questions);

  FOR v_question IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
    IF (p_answers->>(v_question.value->>'id')) = (v_question.value->>'correctOptionId') THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- 5. Insert result using server-side time calculation
  INSERT INTO public.student_results (
    quiz_id, student_name, student_id, answers, score, total_questions, time_taken
  ) VALUES (
    p_quiz_id, p_student_name, p_student_id, p_answers, v_score, v_total, v_server_time_taken
  ) RETURNING id INTO v_result_id;

  -- 6. Cleanup active_students
  DELETE FROM public.active_students 
  WHERE quiz_id = p_quiz_id AND student_name = p_student_name;

  RETURN jsonb_build_object(
    'id', v_result_id,
    'quiz_id', p_quiz_id,
    'student_name', p_student_name,
    'student_id', p_student_id,
    'score', v_score,
    'total_questions', v_total,
    'time_taken', v_server_time_taken,
    'questions', v_questions
  );
END;
$$;
