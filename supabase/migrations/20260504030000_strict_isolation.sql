-- ==========================================
-- Strict Data Isolation Migration
-- ==========================================

-- 1. Reset all policies for quizzes
DROP POLICY IF EXISTS "Anyone can read quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can create quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can update quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can delete quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Teachers can manage their own quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Enable read access for authenticated or guest lookup" ON public.quizzes;

-- 2. Disable standard SELECT for quizzes to prevent broad table leaks
-- Students should only access quiz data via the secure 'get_public_quiz' RPC.
-- Teachers should only see their own rows.

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Only the owner (teacher) can SEE their own quizzes in the dashboard
CREATE POLICY "quizzes_owner_select" ON public.quizzes
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (settings->>'teacher_id')::uuid = auth.uid()
  );

-- Policy: Only the owner (teacher) can UPDATE their own quizzes
CREATE POLICY "quizzes_owner_update" ON public.quizzes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (settings->>'teacher_id')::uuid = auth.uid()
  );

-- Policy: Only the owner (teacher) can DELETE their own quizzes
CREATE POLICY "quizzes_owner_delete" ON public.quizzes
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (settings->>'teacher_id')::uuid = auth.uid()
  );

-- Policy: Authenticated users can INSERT (to create new quizzes)
CREATE POLICY "quizzes_auth_insert" ON public.quizzes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 3. Results Privacy: Teachers only see results for quizzes they own
DROP POLICY IF EXISTS "Teachers can read results of their quizzes" ON public.student_results;
DROP POLICY IF EXISTS "Anyone can read results" ON public.student_results;

CREATE POLICY "student_results_owner_select" ON public.student_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = student_results.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    )
  );
