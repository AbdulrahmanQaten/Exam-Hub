import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface QuestionBank {
  id: string;
  user_id: string;
  title: string;
  description: string;
  is_public: boolean;
  created_at: string;
}

export interface BankUnit {
  id: string;
  bank_id: string;
  name: string;
  created_at: string;
}

export interface BankQuestion {
  id: string;
  bank_id: string;
  unit_id: string | null;
  type: "mcq" | "truefalse";
  text: string;
  options: any[];
  correct_option_id: string;
  created_at: string;
}

export async function getBanks(userId: string): Promise<QuestionBank[]> {
  const { data, error } = await db
    .from("question_banks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBank(userId: string, title: string, description: string): Promise<QuestionBank> {
  const { data, error } = await db
    .from("question_banks")
    .insert({ user_id: userId, title, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBank(id: string, updates: Partial<Omit<QuestionBank, "id" | "user_id" | "created_at">>): Promise<void> {
  const { error } = await db.from("question_banks").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteBank(id: string): Promise<void> {
  const { error } = await db.from("question_banks").delete().eq("id", id);
  if (error) throw error;
}

export async function getPublicBanks(): Promise<QuestionBank[]> {
  const { data, error } = await db
    .from("question_banks")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBankUnits(bankId: string): Promise<BankUnit[]> {
  const { data, error } = await db
    .from("bank_units")
    .select("*")
    .eq("bank_id", bankId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createBankUnit(bankId: string, name: string): Promise<BankUnit> {
  const { data, error } = await db
    .from("bank_units")
    .insert({ bank_id: bankId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBankUnit(id: string): Promise<void> {
  const { error } = await db.from("bank_units").delete().eq("id", id);
  if (error) throw error;
}

export async function getBankQuestions(bankId: string): Promise<BankQuestion[]> {
  const { data, error } = await db
    .from("bank_questions")
    .select("*")
    .eq("bank_id", bankId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBankQuestion(
  bankId: string,
  unitId: string | null,
  type: "mcq" | "truefalse",
  text: string,
  options: any[],
  correctOptionId: string
): Promise<BankQuestion> {
  const { data, error } = await db
    .from("bank_questions")
    .insert({
      bank_id: bankId,
      unit_id: unitId,
      type,
      text,
      options,
      correct_option_id: correctOptionId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBankQuestion(
  id: string,
  updates: Partial<Omit<BankQuestion, "id" | "bank_id" | "created_at">>
): Promise<void> {
  const { error } = await db.from("bank_questions").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteBankQuestion(id: string): Promise<void> {
  const { error } = await db.from("bank_questions").delete().eq("id", id);
  if (error) throw error;
}
