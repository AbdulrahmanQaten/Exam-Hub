-- ==========================================
-- Fix Grading Logic in submit_quiz_result
-- ==========================================

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
  v_question JSONB;
  v_score INTEGER := 0;
  v_total INTEGER := 0;
  v_result_id UUID;
  v_started_at TIMESTAMP WITH TIME ZONE;
  v_server_time_taken INTEGER;
  v_q_id TEXT;
  v_correct_id TEXT;
  v_student_answer TEXT;
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
    v_server_time_taken := p_client_time_taken;
  END IF;

  -- 3. Calculate score
  v_questions := v_quiz.questions;
  v_total := jsonb_array_length(v_questions);

  FOR v_question IN SELECT * FROM jsonb_array_elements(v_questions) LOOP
    v_q_id := v_question->>'id';
    v_correct_id := v_question->>'correctOptionId';
    v_student_answer := p_answers->>v_q_id;

    IF v_student_answer IS NOT NULL AND v_student_answer = v_correct_id THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- 4. Insert result
  INSERT INTO public.student_results (
    quiz_id, student_name, student_id, answers, score, total_questions, time_taken
  ) VALUES (
    p_quiz_id, p_student_name, p_student_id, p_answers, v_score, v_total, v_server_time_taken
  ) RETURNING id INTO v_result_id;

  -- 5. Cleanup active_students
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
