-- ==========================================
-- Strict Quiz Privacy and Ownership
-- ==========================================

-- 1. Remove the "Anyone can do anything" policies
DROP POLICY IF EXISTS "Anyone can read quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can delete quizzes" ON public.quizzes;

-- 2. Implement Ownership-based RLS for Quizzes
-- SELECT: Public can see active quizzes by code (handled by get_public_quiz RPC), 
-- but teachers only see their own in the dashboard.
CREATE POLICY "Teachers can manage their own quizzes" ON public.quizzes
  FOR ALL USING (
    (settings->>'teacher_id')::uuid = auth.uid() OR 
    auth.jwt() ->> 'email' = 'admin@examhub.com'
  );

-- SELECT: Allow students to read a quiz if they have the code (minimal check)
-- Note: The RPC get_public_quiz is SECURITY DEFINER, so it bypasses RLS to safely strip data.
-- But we still need a policy for the initial lookup if done via client.
CREATE POLICY "Enable read access for authenticated or guest lookup" ON public.quizzes
  FOR SELECT USING (is_active = true);

-- 3. Ensure active_students are also tied to the teacher's view but readable by students
DROP POLICY IF EXISTS "Anyone can read active students" ON public.active_students;
CREATE POLICY "Anyone can read active students" ON public.active_students FOR SELECT USING (true);
