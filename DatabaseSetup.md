# Supabase Database Setup Script (V2 - Robust)

Please copy and run this script in your **Supabase SQL Editor**. This version is designed to fix existing tables by adding any missing columns (like `is_public`) and safely overwriting policies.

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

-- Ensure RLS is on
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Handle Policies
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

-- IMPORTANT: Fix if table existed without this column
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

-- Ensure columns exist in bank_questions
ALTER TABLE public.bank_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.bank_questions ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.bank_units(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_questions ENABLE ROW LEVEL SECURITY;

-- Question Bank Policies
DROP POLICY IF EXISTS "Users can manage their own banks" ON public.question_banks;
CREATE POLICY "Users can manage their own banks" ON public.question_banks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view public banks" ON public.question_banks;
CREATE POLICY "Anyone can view public banks" ON public.question_banks FOR SELECT USING (is_public = true);

-- Unit Policies
DROP POLICY IF EXISTS "Users manage their units" ON public.bank_units;
CREATE POLICY "Users manage their units" ON public.bank_units 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view units of public banks" ON public.bank_units;
CREATE POLICY "Anyone can view units of public banks" ON public.bank_units
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND is_public = true));

-- Question Policies
DROP POLICY IF EXISTS "Users manage their questions" ON public.bank_questions;
CREATE POLICY "Users manage their questions" ON public.bank_questions 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view questions of public banks" ON public.bank_questions;
CREATE POLICY "Anyone can view questions of public banks" ON public.bank_questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.question_banks WHERE id = bank_id AND is_public = true));
```
