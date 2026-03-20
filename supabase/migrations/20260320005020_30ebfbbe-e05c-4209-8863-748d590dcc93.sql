-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  roster JSONB DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student results table
CREATE TABLE public.student_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active students table
CREATE TABLE public.active_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_students ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this app)
CREATE POLICY "Anyone can read quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quizzes" ON public.quizzes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quizzes" ON public.quizzes FOR DELETE USING (true);

CREATE POLICY "Anyone can read results" ON public.student_results FOR SELECT USING (true);
CREATE POLICY "Anyone can create results" ON public.student_results FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read active students" ON public.active_students FOR SELECT USING (true);
CREATE POLICY "Anyone can manage active students" ON public.active_students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete active students" ON public.active_students FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE student_results;
ALTER PUBLICATION supabase_realtime ADD TABLE active_students;

-- Index for quick quiz lookup by code
CREATE INDEX idx_quizzes_code ON public.quizzes(code);
CREATE INDEX idx_results_quiz_id ON public.student_results(quiz_id);
CREATE INDEX idx_active_quiz_id ON public.active_students(quiz_id);