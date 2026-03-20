import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, Save, ArrowRight, Clock, Shuffle, CheckCircle2, XCircle, Upload, FileSpreadsheet, Users, Library, Download, Image as ImageIcon, Loader2, X,
} from "lucide-react";
import {
  createQuiz, updateQuiz, getQuizById, generateQuestionId, generateOptionId, uploadQuestionImage,
  type QuizQuestion, type QuizSettings, type StudentRosterEntry,
} from "@/lib/quizStore";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ExcelColumnSelector } from "@/components/ExcelColumnSelector";
import { BankImportDialog } from "@/components/BankImportDialog";
import { BankQuestion } from "@/lib/bankStore";

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const isEditing = !!quizId;

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settings, setSettings] = useState<QuizSettings>({
    timerEnabled: false,
    timerMinutes: 10,
    shuffleQuestions: false,
    shuffleOptions: false,
    showFeedback: false,
  });
  const [roster, setRoster] = useState<StudentRosterEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);
  
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (quizId) {
      getQuizById(quizId).then((quiz) => {
        if (quiz) {
          setTitle(quiz.title);
          setQuestions(quiz.questions);
          setSettings(quiz.settings);
          setRoster(quiz.roster || []);
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
    setIsUploadingImage(prev => ({ ...prev, [qIndex]: true }));
    try {
      const url = await uploadQuestionImage(file);
      updateQuestion(qIndex, { imageUrl: url });
      toast.success("تم إرفاق الصورة بنجاح");
    } catch (err) {
      toast.error("فشل رفع الصورة (تأكد من إعدادات Storage)");
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
          await updateQuiz({ ...existing, title, questions, settings, roster: roster.length > 0 ? roster : undefined });
          toast.success("تم تعديل الاختبار بنجاح");
        }
      } else {
        const quiz = await createQuiz(title, questions, settings, roster.length > 0 ? roster : undefined);
        toast.success("تم إنشاء الاختبار بنجاح! الرمز: " + quiz.code);
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

      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="rounded-full"><ArrowRight className="h-5 w-5" /></Button>
            <h1 className="text-2xl font-bold">{isEditing ? "تعديل الاختبار" : "إنشاء اختبار جديد"}</h1>
          </div>
          <Input placeholder="عنوان الاختبار" value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-bold h-14 rounded-xl border-2 focus:border-primary" />
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <Card key={q.id} className="p-5 animate-fade-in">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">{qIndex + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground rounded-full bg-muted px-2 py-0.5">{q.type === "mcq" ? "اختيار من متعدد" : "صح أو خطأ"}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <Input placeholder="نص السؤال" value={q.text} onChange={(e) => updateQuestion(qIndex, { text: e.target.value })} className="text-base font-medium rounded-lg flex-1" />
                      <div className="relative">
                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files?.[0]) handleQuestionImageUpload(qIndex, e.target.files[0]); e.target.value = ''; }} disabled={isUploadingImage[qIndex]} title="إرفاق صورة للسؤال" />
                        <Button variant="outline" type="button" className="shrink-0 h-10 w-10 p-0" disabled={isUploadingImage[qIndex]}>
                          {isUploadingImage[qIndex] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </div>
                    {q.imageUrl && (
                      <div className="mt-3 relative inline-block group">
                        <img src={q.imageUrl} alt="مرفق السؤال" className="max-h-32 rounded-lg object-contain border bg-muted/30" />
                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" onClick={() => updateQuestion(qIndex, { imageUrl: undefined })}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)} tabIndex={-1} className="text-destructive hover:text-destructive shrink-0"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mr-2 sm:mr-11 space-y-3">
                  {q.options.map((opt, oIndex) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button type="button" tabIndex={-1} onClick={() => updateQuestion(qIndex, { correctOptionId: opt.id })} className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${q.correctOptionId === opt.id ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        {q.correctOptionId === opt.id ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">{oIndex + 1}</span>}
                      </button>
                      {q.type === "mcq" ? (
                        <Input placeholder={`الخيار ${oIndex + 1}`} value={opt.text} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} className="rounded-lg" />
                      ) : (
                        <div className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm">{opt.text}</div>
                      )}
                      {q.type === "mcq" && q.options.length > 2 && (
                        <Button variant="ghost" size="icon" tabIndex={-1} onClick={() => removeOption(qIndex, oIndex)} className="h-8 w-8 shrink-0 text-muted-foreground"><XCircle className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                  {q.type === "mcq" && q.options.length < 6 && (
                    <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="gap-1.5 text-muted-foreground"><Plus className="h-3.5 w-3.5" /> إضافة خيار</Button>
                  )}
                </div>
              </Card>
            ))}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Button variant="outline" onClick={addMCQ} className="flex-1 gap-2 rounded-xl h-14 border-dashed border-2"><Plus className="h-5 w-5" /> <span className="hidden sm:inline">اختيار من متعدد</span><span className="sm:hidden">مُتعدد</span></Button>
              <Button variant="outline" onClick={addTrueFalse} className="flex-1 gap-2 rounded-xl h-14 border-dashed border-2"><Plus className="h-5 w-5" /> <span className="hidden sm:inline">صح أو خطأ</span><span className="sm:hidden">صح/خطأ</span></Button>
              <Button variant="outline" onClick={() => setBankImportOpen(true)} className="col-span-2 lg:col-span-1 flex-1 gap-2 rounded-xl h-14 border-dashed border-2 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary">
                <Library className="h-5 w-5" /> استيراد
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-5 sticky top-20">
              <h3 className="text-lg font-bold mb-4">إعدادات الاختبار</h3>
              <div className="space-y-5">
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
                <p className="text-xs text-muted-foreground mb-3">ارفع ملف Excel يحتوي على أسماء وأرقام الطلاب</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleRosterUpload} className="hidden" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2 rounded-lg">
                    <Upload className="h-4 w-4" /> رفع القائمة
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="flex-1 gap-2 rounded-lg" title="تحميل قالب أكسل فارغ جاهز للتعبئة">
                    <Download className="h-4 w-4" /> تحميل قالب
                  </Button>
                </div>
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
