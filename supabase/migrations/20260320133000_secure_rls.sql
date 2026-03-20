-- ==============================================================================
-- Security Patch: Fix Dangerous RLS Policies & Secure the Platform
-- ==============================================================================

-- 1. Remove dangerous, fully open policies from quizzes
DROP POLICY IF EXISTS "Anyone can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can delete quizzes" ON public.quizzes;

-- 2. Secure quizzes (Require Auth to insert, restrict Update/Delete to Owner or Admin)
CREATE POLICY "Authenticated users can create quizzes" ON public.quizzes 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.jwt() ->> 'email' = 'admin@examhub.com');

CREATE POLICY "Teacher can update their quizzes" ON public.quizzes 
  FOR UPDATE USING (
    (settings->>'teacher_id')::uuid = auth.uid() OR auth.jwt() ->> 'email' = 'admin@examhub.com'
  );

CREATE POLICY "Teacher can delete their quizzes" ON public.quizzes 
  FOR DELETE USING (
    (settings->>'teacher_id')::uuid = auth.uid() OR auth.jwt() ->> 'email' = 'admin@examhub.com'
  );


-- 3. Secure results (Remove open delete policy, restrict to Quiz Owner or Admin)
DROP POLICY IF EXISTS "Anyone can delete results" ON public.student_results;

CREATE POLICY "Teacher or Admin can delete results" ON public.student_results 
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'admin@examhub.com' OR 
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = student_results.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    )
  );


-- 4. Secure active students (Remove open delete policy, restrict to Quiz Owner or Admin)
DROP POLICY IF EXISTS "Anyone can delete active students" ON public.active_students;

CREATE POLICY "Teacher or Admin can delete active students" ON public.active_students 
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'admin@examhub.com' OR 
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = active_students.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    )
  );

-- Note: SELECT policies remain open because students need to fetch the quiz using a public code 
-- and submit their responses safely.
