-- Migration: Secure Database Tables (active_students & student_results)
-- Description: Enables RLS on active_students and restricts access to authenticated teachers/admins.
-- Also secures student_results by removing public INSERT access.

-- ==========================================
-- 1. Secure active_students
-- ==========================================

-- Enable RLS on active_students
ALTER TABLE public.active_students ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can read active students" ON public.active_students;
DROP POLICY IF EXISTS "Anyone can manage active students" ON public.active_students;
DROP POLICY IF EXISTS "Anyone can delete active students" ON public.active_students;
DROP POLICY IF EXISTS "Teacher or Admin can delete active students" ON public.active_students;
DROP POLICY IF EXISTS "Teacher or Admin can read active students" ON public.active_students;

-- Create secure SELECT policy
-- Only the teacher who owns the quiz or an admin can see active students for that quiz.
CREATE POLICY "Teacher or Admin can read active students" ON public.active_students 
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = active_students.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    )) OR 
    (auth.jwt() ->> 'email' = 'admin@examhub.com')
  );

-- Create secure DELETE policy
-- Only the teacher who owns the quiz or an admin can remove active students (e.g., clearing a session).
CREATE POLICY "Teacher or Admin can delete active students" ON public.active_students 
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = active_students.quiz_id AND (settings->>'teacher_id')::uuid = auth.uid()
    )) OR 
    (auth.jwt() ->> 'email' = 'admin@examhub.com')
  );

-- ==========================================
-- 2. Secure student_results
-- ==========================================

-- Ensure RLS is enabled (should be, but reinforcing)
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Drop the overly permissive INSERT policy
-- Results should only be submitted via the 'submit_quiz_result' RPC which is SECURITY DEFINER.
DROP POLICY IF EXISTS "Anyone can create results" ON public.student_results;

-- Note: SELECT and DELETE policies for student_results are already secured 
-- to teacher/admin in previous migrations.
