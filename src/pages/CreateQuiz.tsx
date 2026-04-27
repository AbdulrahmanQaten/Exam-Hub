import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, Save, ArrowRight, Clock, Shuffle, CheckCircle2, XCircle, Upload, FileSpreadsheet, Users, Library, Download, Image as ImageIcon, Loader2, X, GripVertical, Search, ShieldCheck, Globe
} from "lucide-react";
import {
  createQuiz, updateQuiz, getQuizById, generateQuestionId, generateOptionId, uploadQuestionImage, lockQuizToCurrentIP,
  type QuizQuestion, type QuizSettings, type StudentRosterEntry,
} from "@/lib/quizStore";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ExcelColumnSelector } from "@/components/ExcelColumnSelector";
import { BankImportDialog } from "@/components/BankImportDialog";
import { BankQuestion } from "@/lib/bankStore";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuestionCardProps {
  q: QuizQuestion;
  qIndex: number;
  user: any;
  isUploadingImage: boolean;
  updateQuestion: (index: number, updates: Partial<QuizQuestion>) => void;
  removeQuestion: (index: number) => void;
  updateOption: (qIndex: number, oIndex: number, text: string) => void;
  addOption: (qIndex: number) => void;
  removeOption: (qIndex: number, oIndex: number) => void;
  handleQuestionImageUpload: (qIndex: number, file: File) => void;
}

function QuestionCard({
  q, qIndex, user, isUploadingImage, updateQuestion, removeQuestion,
  updateOption, addOption, removeOption, handleQuestionImageUpload
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-3 sm:p-5 animate-fade-in relative group/card border-2 hover:border-primary/20 transition-all">
      <div className="flex items-start gap-2 sm:gap-3 mb-4">
        <div 
          {...attributes} 
          {...listeners} 
          className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-grab active:cursor-grabbing"
          title="سحب لترتيب الأسئلة"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground rounded-full bg-muted px-2 py-0.5 whitespace-nowrap">
              {q.type === "mcq" ? "اختيار من متعدد" : "صح أو خطأ"}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-primary">السؤال {qIndex + 1}</span>
          </div>
          <div className="flex gap-2 items-start">
            <Input 
              placeholder="نص السؤال" 
              value={q.text} 
              onChange={(e) => updateQuestion(qIndex, { text: e.target.value })} 
              className="text-sm sm:text-base font-medium rounded-lg flex-1" 
            />
            <div className="relative">
              {!user ? (
                <Button variant="outline" type="button" className="shrink-0 h-10 w-10 p-0" title="ميزة إرفاق الصور متاحة للمسجلين فقط" onClick={() => toast.info("عذراً! ميزة إرفاق الصور متاحة فقط للمعلمين المسجلين في المنصة.")}>
                  <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                </Button>
              ) : (
                <>
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.[0]) handleQuestionImageUpload(qIndex, e.target.files[0]); e.target.value = ''; }} disabled={isUploadingImage} title="إرفاق صورة للسؤال" />
                  <Button variant="outline" type="button" className="shrink-0 h-10 w-10 p-0" disabled={isUploadingImage}>
                    {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </>
              )}
            </div>
          </div>
          {q.imageUrl && (
            <div className="mt-3 relative inline-block group">
              <img src={q.imageUrl} alt="مرفق السؤال" className="max-h-32 rounded-lg object-contain border bg-muted/30" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" onClick={() => updateQuestion(qIndex, { imageUrl: undefined })}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} tabIndex={-1} className="text-destructive hover:text-destructive shrink-0 h-8 w-8 sm:h-10 sm:w-10"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mr-0 sm:mr-11 space-y-3">
        {q.options.map((opt, oIndex) => (
          <div key={opt.id} className="flex items-center gap-2">
            <button type="button" tabIndex={-1} onClick={() => updateQuestion(qIndex, { correctOptionId: opt.id })} className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${q.correctOptionId === opt.id ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {q.correctOptionId === opt.id ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">{oIndex + 1}</span>}
            </button>
            {q.type === "mcq" ? (
              <Input placeholder={`الخيار ${oIndex + 1}`} value={opt.text} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} className="rounded-lg h-9 text-sm" />
            ) : (
              <div className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-xs sm:text-sm">{opt.text}</div>
            )}
            {q.type === "mcq" && q.options.length > 2 && (
              <Button variant="ghost" size="icon" tabIndex={-1} onClick={() => removeOption(qIndex, oIndex)} className="h-8 w-8 shrink-0 text-muted-foreground"><XCircle className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
        {q.type === "mcq" && q.options.length < 6 && (
          <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="gap-1.5 text-muted-foreground h-8 text-xs"><Plus className="h-3.5 w-3.5" /> إضافة خيار</Button>
        )}
      </div>
    </Card>
  );
}

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quizId } = useParams<{ quizId: string }>();
  const isEditing = !!quizId;
  usePageTitle(isEditing ? "تعديل الاختبار" : "إنشاء اختبار جديد");

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({
    timerEnabled: false,
    timerMinutes: 10,
    shuffleQuestions: false,
    shuffleOptions: false,
    showFeedback: false,
  });
  const [allowedIP, setAllowedIP] = useState<string | null>(null);
  const [roster, setRoster] = useState<StudentRosterEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionsFileInputRef = useRef<HTMLInputElement>(null);

  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);
  
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [classImportOpen, setClassImportOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<number, boolean>>({});

  const sensors = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const sensorsList = useSensors(
    sensors,
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (quizId) {
      getQuizById(quizId).then((quiz) => {
        if (quiz) {
          setTitle(quiz.title);
          setQuestions(quiz.questions);
          setSettings(quiz.settings);
          setRoster(quiz.roster || []);
          setAllowedIP(quiz.allowed_ip || null);
        } else {
          navigate("/teacher");
        }
      });
    }
  }, [quizId, navigate]);

  const addMCQ = () => {
    setQuestions([...questions, {
      id: generateQuestionId(), type: "mcq", text: "",
      options: [{ id: generateOptionId(), text: "" }, { id: generateOptionId(), text: "" }, { id: generateOptionId(), text: "" }, { id: generateOptionId(), text: "" }],
      correctOptionId: "",
    }]);
  };

  const addTrueFalse = () => {
    const trueId = generateOptionId();
    const falseId = generateOptionId();
    setQuestions([...questions, {
      id: generateQuestionId(), type: "truefalse", text: "",
      options: [{ id: trueId, text: "صح" }, { id: falseId, text: "خطأ" }],
      correctOptionId: trueId,
    }]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions]; updated[index] = { ...updated[index], ...updates }; setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const updated = [...questions]; updated[qIndex].options[oIndex] = { ...updated[qIndex].options[oIndex], text }; setQuestions(updated);
  };

  const removeQuestion = (index: number) => setQuestions(questions.filter((_, i) => i !== index));

  const addOption = (qIndex: number) => {
    const updated = [...questions]; updated[qIndex].options.push({ id: generateOptionId(), text: "" }); setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    if (updated[qIndex].options.length <= 2) return;
    const removedId = updated[qIndex].options[oIndex].id;
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    if (updated[qIndex].correctOptionId === removedId) updated[qIndex].correctOptionId = "";
    setQuestions(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.id === active.id);
        const newIndex = items.findIndex((q) => q.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleImportBankQuestions = (imported: BankQuestion[]) => {
    const newQuestions: QuizQuestion[] = imported.map(q => ({
      id: generateQuestionId(),
      type: q.type,
      text: q.text,
      imageUrl: (q as any).image_url,
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text
      })),
      correctOptionId: q.correct_option_id
    }));
    setQuestions([...questions, ...newQuestions]);
  };

  const handleQuestionImageUpload = async (qIndex: number, file: File) => {
    if (!user) {
      toast.info("عذراً! ميزة رفع الصور متاحة فقط للمعلمين المسجلين. قم بإنشاء حساب مجاني لتفعيلها.");
      return;
    }
    setIsUploadingImage(prev => ({ ...prev, [qIndex]: true }));
    try {
      const url = await uploadQuestionImage(file);
      updateQuestion(qIndex, { imageUrl: url });
      toast.success("تم إرفاق الصورة بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء الرفع! يرجى التأكد من إعداد سياسات الحماية (Policies) للسلة في Supabase لتسمح بالرفع للمسجلين.");
    } finally {
      setIsUploadingImage(prev => ({ ...prev, [qIndex]: false }));
    }
  };

  const handleRosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        if (rows.length === 0) { toast.error("الملف فارغ"); return; }
        const keys = Object.keys(rows[0]);
        if (keys.length < 2) { toast.error("يجب أن يحتوي الملف على عمودين على الأقل"); return; }
        if (keys.length === 2) {
          const entries: StudentRosterEntry[] = rows.map((row) => ({ name: String(row[keys[0]] || "").trim(), studentId: String(row[keys[1]] || "").trim() })).filter(e => e.name && e.studentId);
          setRoster(entries); toast.success(`تم استيراد ${entries.length} طالب بنجاح`);
        } else {
          setExcelColumns(keys); setExcelRows(rows); setColumnSelectorOpen(true);
        }
      } catch { toast.error("حدث خطأ في قراءة الملف"); }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleQuestionsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.info("ميزة استيراد الأسئلة من ملف Excel متاحة فقط للمعلمين المسجلين.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        
        if (rows.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        const newQuestions: QuizQuestion[] = [];
        rows.forEach((row, index) => {
          const type = String(row["نوع السؤال"] || "mcq").toLowerCase().includes("صح") ? "truefalse" : "mcq";
          const text = String(row["نص السؤال"] || "").trim();
          
          if (!text) return;

          const questionId = generateQuestionId();
          let options: { id: string, text: string }[] = [];
          let correctOptionId = "";

          if (type === "mcq") {
            const optTexts = [
              String(row["الخيار 1"] || "").trim(),
              String(row["الخيار 2"] || "").trim(),
              String(row["الخيار 3"] || "").trim(),
              String(row["الخيار 4"] || "").trim(),
            ].filter(t => t);

            options = optTexts.map(t => ({ id: generateOptionId(), text: t }));
            const correctNum = parseInt(row["رقم الإجابة الصحيحة"]) || 1;
            if (options[correctNum - 1]) {
              correctOptionId = options[correctNum - 1].id;
            } else if (options.length > 0) {
              correctOptionId = options[0].id;
            }
          } else {
            const trueId = generateOptionId();
            const falseId = generateOptionId();
            options = [
              { id: trueId, text: "صح" },
              { id: falseId, text: "خطأ" }
            ];
            const correctVal = String(row["رقم الإجابة الصحيحة"] || "1");
            correctOptionId = (correctVal === "1" || correctVal.includes("صح")) ? trueId : falseId;
          }

          newQuestions.push({
            id: questionId,
            type,
            text,
            options,
            correctOptionId
          });
        });

        if (newQuestions.length > 0) {
          setQuestions([...questions, ...newQuestions]);
          toast.success(`تم استيراد ${newQuestions.length} سؤال بنجاح`);
        } else {
          toast.error("لم يتم العثور على أسئلة صالحة في الملف");
        }
      } catch (err) {
        toast.error("حدث خطأ في قراءة ملف الأسئلة");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    if (questionsFileInputRef.current) questionsFileInputRef.current.value = "";
  };

  const handleDownloadQuestionsTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["نوع السؤال", "نص السؤال", "الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4", "رقم الإجابة الصحيحة"],
      ["mcq", "ما هي عاصمة السعودية؟", "الرياض", "جدة", "الدمام", "مكة", "1"],
      ["truefalse", "الأرض كروية الشكل؟", "صح", "خطأ", "", "", "1"],
      ["mcq", "2 + 2 = ?", "3", "4", "5", "6", "2"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
    XLSX.writeFile(wb, "قالب_أسئلة_المنصة.xlsx");
    toast.success("تم بدء تحميل قالب الأسئلة");
  };

  const handleColumnConfirm = (entries: StudentRosterEntry[]) => {
    setRoster(entries); toast.success(`تم استيراد ${entries.length} طالب بنجاح`);
  };

  const handleDownloadTemplate = () => {
    // إنشاء ملف جديد
    const wb = XLSX.utils.book_new();
    // إنشاء بيانات القالب (عناوين + مثال)
    const wsData = [
      ["اسم الطالب", "رقم الجامعي / الهوية"],
      ["عبد الله محمد", "1234567"]
    ];
    // تحويل المصفوفة إلى شيت العرض
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // تنسيق عرض الأعمدة للتوضيح
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }];
    // إدراج وحفظ الملف
    XLSX.utils.book_append_sheet(wb, ws, "الطلاب");
    XLSX.writeFile(wb, "قالب_طلاب_المنصة.xlsx");
    toast.success("تم بدء تحميل القالب");
  };

  const handleToggleIPLock = async (checked: boolean) => {
    if (checked) {
      if (!isEditing) {
        toast.info("يرجى حفظ الاختبار أولاً لتتمكن من قفل الشبكة، أو سيتم قفلها تلقائياً عند النشر.");
        setAllowedIP("DETECT_ON_SAVE");
        return;
      }
      try {
        const detectedIP = await lockQuizToCurrentIP(quizId!);
        setAllowedIP(detectedIP);
        toast.success("تم تفعيل قفل الشبكة. سيتمكن فقط الطلاب المتصلون بنفس شبكتك الحالية (" + detectedIP + ") من الدخول.");
      } catch (err) {
        toast.error("حدث خطأ أثناء اكتشاف الشبكة.");
      }
    } else {
      setAllowedIP(null);
      toast.info("تم إيقاف قفل الشبكة. يمكن للطلاب من أي مكان الدخول.");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("يرجى إدخال عنوان الاختبار"); return; }
    if (questions.length === 0) { toast.error("يرجى إضافة سؤال واحد على الأقل"); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { toast.error(`يرجى كتابة نص السؤال ${i + 1}`); return; }
      if (!q.correctOptionId) { toast.error(`يرجى تحديد الإجابة الصحيحة للسؤال ${i + 1}`); return; }
      for (const opt of q.options) { if (!opt.text.trim()) { toast.error(`يرجى كتابة جميع الخيارات في السؤال ${i + 1}`); return; } }
    }

    setSaving(true);
    try {
      if (isEditing) {
        const existing = await getQuizById(quizId!);
        if (existing) {
          await updateQuiz({ ...existing, title, questions, settings, roster: roster.length > 0 ? roster : undefined, allowed_ip: allowedIP });
          toast.success("تم تعديل الاختبار بنجاح");
        }
      } else {
        const quiz = await createQuiz(title, questions, settings, roster.length > 0 ? roster : undefined, allowedIP === "DETECT_ON_SAVE" ? "PENDING" : allowedIP);
        
        if (allowedIP === "DETECT_ON_SAVE") {
           const detected = await lockQuizToCurrentIP(quiz.id);
           toast.success("تم إنشاء الاختبار وتفعيل قفل الشبكة: " + detected);
        } else {
           toast.success("تم إنشاء الاختبار بنجاح! الرمز: " + quiz.code);
        }
      }
      navigate("/teacher");
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <ExcelColumnSelector open={columnSelectorOpen} onClose={() => setColumnSelectorOpen(false)} columns={excelColumns} rows={excelRows} onConfirm={handleColumnConfirm} />
      <BankImportDialog open={bankImportOpen} onClose={() => setBankImportOpen(false)} onImport={handleImportBankQuestions} />
      <ClassImportDialog open={classImportOpen} onClose={() => setClassImportOpen(false)} onImport={(students) => { setRoster(students); toast.success(`تم استيراد ${students.length} طالب من الفصل`); }} />

      <div className="border-b bg-card">
        <div className="container py-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="rounded-full"><ArrowRight className="h-5 w-5" /></Button>
            <h1 className="text-2xl font-bold">{isEditing ? "تعديل الاختبار" : "إنشاء اختبار جديد"}</h1>
          </div>
          <Input placeholder="عنوان الاختبار" value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold h-14 rounded-xl border-2 focus:border-primary" />
        </div>
      </div>

      <div className="container py-4 sm:py-8 px-2 sm:px-4">
        <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            <DndContext 
              sensors={sensorsList}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((q, qIndex) => (
                  <QuestionCard 
                    key={q.id}
                    q={q}
                    qIndex={qIndex}
                    user={user}
                    isUploadingImage={!!isUploadingImage[qIndex]}
                    updateQuestion={updateQuestion}
                    removeQuestion={removeQuestion}
                    updateOption={updateOption}
                    addOption={addOption}
                    removeOption={removeOption}
                    handleQuestionImageUpload={handleQuestionImageUpload}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-start mt-8 pt-6 border-t border-dashed">
              <Button variant="outline" onClick={addMCQ} className="gap-2 rounded-xl h-14 border-dashed border-2 flex flex-col sm:flex-row items-center justify-center p-2 text-center">
                <Plus className="h-5 w-5 shrink-0" /> 
                <span className="text-[10px] sm:text-sm font-bold">اختيار من متعدد</span>
              </Button>
              <Button variant="outline" onClick={addTrueFalse} className="gap-2 rounded-xl h-14 border-dashed border-2 flex flex-col sm:flex-row items-center justify-center p-2 text-center">
                <Plus className="h-5 w-5 shrink-0" /> 
                <span className="text-[10px] sm:text-sm font-bold">صح أو خطأ</span>
              </Button>
              <Button variant="outline" onClick={() => setBankImportOpen(true)} className="gap-2 rounded-xl h-14 border-dashed border-2 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-bold flex flex-col sm:flex-row items-center justify-center p-2 text-center">
                <Library className="h-5 w-5 shrink-0" /> 
                <span className="text-[10px] sm:text-sm">استيراد من البنك</span>
              </Button>
              
              <div className="space-y-2">
                <input ref={questionsFileInputRef} type="file" accept=".xlsx,.xls" onChange={handleQuestionsUpload} className="hidden" />
                <Button 
                  variant="outline" 
                  onClick={() => questionsFileInputRef.current?.click()} 
                  className="w-full gap-2 rounded-xl h-14 border-dashed border-2 bg-success/5 hover:bg-primary/10 border-success/30 text-success font-bold flex flex-col sm:flex-row items-center justify-center p-2 text-center"
                >
                  <FileSpreadsheet className="h-5 w-5 shrink-0" /> 
                  <span className="text-[10px] sm:text-sm">استيراد من Excel</span>
                </Button>
                
                {user ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDownloadQuestionsTemplate} 
                    className="w-full h-9 text-[10px] sm:text-[11px] text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg gap-1 sm:gap-2 border border-transparent hover:border-success/20 transition-all font-medium whitespace-normal sm:whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" /> تحميل قالب Excel
                  </Button>
                ) : (
                  <div className="text-center px-2 py-1 bg-muted rounded-md border border-dashed border-muted-foreground/30">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">سجل الدخول لتفعيل الاستيراد</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-5 sticky top-20">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">إعدادات الاختبار</h3>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`h-4 w-4 ${allowedIP ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label className="cursor-pointer" htmlFor="ip-lock">قفل الشبكة (IP Lock)</Label>
                    </div>
                    <Switch id="ip-lock" checked={!!allowedIP} onCheckedChange={handleToggleIPLock} />
                  </div>
                  {allowedIP && (
                    <div className="bg-primary/5 p-2 rounded-lg border border-primary/20 animate-in slide-in-from-top-1">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {allowedIP === "DETECT_ON_SAVE" ? (
                           <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> سيتم اكتشاف شبكتك عند الحفظ...</span>
                        ) : (
                          <>
                            مفعل حالياً للشبكة: <code className="bg-primary/10 px-1 rounded font-bold text-primary">{allowedIP}</code>
                            <br />سيمنع الطلاب من خارج شبكتك الحالية من الدخول.
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><Label>مؤقت زمني</Label></div>
                  <Switch checked={settings.timerEnabled} onCheckedChange={(checked) => setSettings({ ...settings, timerEnabled: checked })} />
                </div>
                {settings.timerEnabled && (
                  <div className="flex items-center gap-2 mr-6">
                    <Input type="number" min={1} max={180} value={settings.timerMinutes} onChange={(e) => setSettings({ ...settings, timerMinutes: parseInt(e.target.value) || 1 })} className="w-20 rounded-lg text-center" />
                    <span className="text-sm text-muted-foreground">دقيقة</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Shuffle className="h-4 w-4 text-muted-foreground" /><Label>ترتيب عشوائي للأسئلة</Label></div>
                  <Switch checked={settings.shuffleQuestions} onCheckedChange={(checked) => setSettings({ ...settings, shuffleQuestions: checked })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Shuffle className="h-4 w-4 text-muted-foreground" /><Label>ترتيب عشوائي للإجابات</Label></div>
                  <Switch checked={settings.shuffleOptions} onCheckedChange={(checked) => setSettings({ ...settings, shuffleOptions: checked })} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /><Label>إظهار الإجابات للطالب للتغذية الراجعة</Label></div>
                  <Switch checked={settings.showFeedback || false} onCheckedChange={(checked) => setSettings({ ...settings, showFeedback: checked })} />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> قائمة الطلاب (اختياري)</h4>
                <p className="text-xs text-muted-foreground mb-3">ارفع ملف Excel أو اختر من فصولك الجاهزة</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleRosterUpload} className="hidden" />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2 rounded-lg">
                    <Upload className="h-4 w-4" /> رفع Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setClassImportOpen(true)} className="flex-1 gap-2 rounded-lg bg-primary/5 text-primary border-primary/20">
                    <Users className="h-4 w-4" /> من فصولي
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="w-full mt-2 h-8 text-[10px] text-muted-foreground gap-1.5" title="تحميل قالب أكسل فارغ جاهز للتعبئة">
                  <Download className="h-3.5 w-3.5" /> تحميل قالب Excel
                </Button>
                
                {roster.length > 0 && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5 text-success" /> {roster.length} طالب</span>
                      <Button variant="ghost" size="sm" onClick={() => setRoster([])} className="h-6 text-xs text-destructive hover:text-destructive">إزالة</Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {roster.slice(0, 5).map((s, i) => (<div key={i} className="text-xs text-muted-foreground flex justify-between"><span>{s.name}</span><span className="font-mono">{s.studentId}</span></div>))}
                      {roster.length > 5 && (<div className="text-xs text-muted-foreground text-center">... و{roster.length - 5} آخرين</div>)}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-1">عدد الأسئلة: <strong className="text-foreground">{questions.length}</strong></div>
              </div>

              <Button onClick={handleSave} className="w-full mt-4 gap-2 rounded-xl h-12" disabled={questions.length === 0 || saving}>
                <Save className="h-5 w-5" />
                {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء الاختبار"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassImportDialog({ open, onClose, onImport }: { open: boolean, onClose: () => void, onImport: (students: StudentRosterEntry[]) => void }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      supabase.from("classes").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false })
        .then(({ data }) => { setClasses(data || []); setLoading(false); });
    }
  }, [open, user]);

  const filtered = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && c.students?.length > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-right" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>استيراد قائمة طلاب من فصولي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث عن فصل..." className="pr-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div> :
             filtered.length === 0 ? <p className="text-center py-4 text-muted-foreground text-sm">لا توجد فصول تحتوي على طلاب</p> :
             filtered.map(c => (
               <button key={c.id} onClick={() => { onImport(c.students); onClose(); }} className="w-full flex items-center justify-between p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-right">
                 <div className="font-bold">{c.name}</div>
                 <div className="text-xs bg-muted px-2 py-1 rounded-md">{c.students.length} طالب</div>
               </button>
             ))
            }
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
