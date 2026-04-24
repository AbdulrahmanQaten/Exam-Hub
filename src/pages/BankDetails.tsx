import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  BankUnit, BankQuestion, getBankUnits, createBankUnit, deleteBankUnit,
  getBankQuestions, createBankQuestion, deleteBankQuestion, QuestionBank, getBanks, updateBank
} from "@/lib/bankStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, ArrowRight, Folder, FileQuestion, BookOpen, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function BankDetails() {
  const { bankId } = useParams<{ bankId: string }>();
  usePageTitle("تفاصيل بنك الأسئلة");
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [qType, setQType] = useState<"mcq" | "truefalse">("mcq");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<any[]>([]);
  const [qCorrectId, setQCorrectId] = useState("");

  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
    else if (user && bankId) loadData();
  }, [user, isLoading, bankId, navigate]);

  const loadData = async () => {
    try {
      const { data: bData, error: bError } = await supabase.from("question_banks").select("*").eq("id", bankId).single();
      if (bError || !bData) { navigate("/banks"); return; }
      setBank(bData as any);
      
      const [uData, qData] = await Promise.all([
        getBankUnits(bankId!),
        getBankQuestions(bankId!)
      ]);
      setUnits(uData);
      setQuestions(qData);
    } catch {
      toast.error("حدث خطأ في جلب بيانات البنك");
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) return;
    try {
      const u = await createBankUnit(bankId!, newUnitName);
      setUnits([...units, u]);
      setNewUnitName("");
      setIsAddUnitOpen(false);
      toast.success("تمت إضافة الوحدة");
    } catch {
      toast.error("خطأ في إضافة الوحدة");
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitId) return;
    try {
      await deleteBankUnit(deleteUnitId);
      setUnits(units.filter(u => u.id !== deleteUnitId));
      setQuestions(questions.filter(q => q.unit_id !== deleteUnitId));
      if (selectedUnit === deleteUnitId) setSelectedUnit(null);
      toast.success("تم الحذف");
      setDeleteUnitId(null);
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const openAddQuestion = (type: "mcq" | "truefalse") => {
    setQType(type);
    setQText("");
    const genId = () => Math.random().toString(36).substring(2, 8);
    if (type === "mcq") {
      setQOptions([{id: genId(), text:""}, {id: genId(), text:""}, {id: genId(), text:""}, {id: genId(), text:""}]);
    } else {
      setQOptions([{id: genId(), text:"صح"}, {id: genId(), text:"خطأ"}]);
    }
    setQCorrectId("");
    setIsAddQuestionOpen(true);
  };

  const handleAddQuestion = async () => {
    if (!qText.trim()) { toast.error("أدخل نص السؤال"); return; }
    if (qType === "mcq" && qOptions.some(o => !o.text.trim())) { toast.error("أكمل جميع الخيارات"); return; }
    if (!qCorrectId) { toast.error("اختر الإجابة الصحيحة"); return; }

    try {
      const q = await createBankQuestion(bankId!, selectedUnit, qType, qText, qOptions, qCorrectId);
      setQuestions([q, ...questions]);
      setIsAddQuestionOpen(false);
      toast.success("تم الحفظ");
    } catch {
      toast.error("خطأ في إضافة السؤال");
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId) return;
    try {
      await deleteBankQuestion(deleteQuestionId);
      setQuestions(questions.filter(q => q.id !== deleteQuestionId));
      setDeleteQuestionId(null);
    } catch {
      toast.error("خطأ");
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["نوع السؤال", "نص السؤال", "الوحدة/الفصل", "الخيار 1", "الخيار 2", "الخيار 3", "الخيار 4", "رقم الإجابة الصحيحة"],
      ["mcq", "ما هي عاصمة السعودية؟", "الجغرافيا", "الرياض", "جدة", "الدمام", "مكة", "1"],
      ["truefalse", "الأرض كروية الشكل؟", "العلوم", "صح", "خطأ", "", "", "1"],
      ["mcq", "2 + 2 = ?", "الرياضيات", "3", "4", "5", "6", "2"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
    XLSX.writeFile(wb, `قالب_بنك_${bank?.title}.xlsx`);
    toast.success("تم تحميل القالب");
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
        
        if (rows.length === 0) { toast.error("الملف فارغ"); return; }
        
        await processImportedQuestions(rows);
      } catch (err) {
        toast.error("حدث خطأ أثناء الاستيراد");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processImportedQuestions = async (rows: any[]) => {
      let currentUnits = [...units];
      let importedCount = 0;

      for (const row of rows) {
        const type = String(row["نوع السؤال"] || "mcq").toLowerCase().includes("صح") ? "truefalse" : "mcq";
        const text = String(row["نص السؤال"] || "").trim();
        const unitName = String(row["الوحدة/الفصل"] || "").trim();
        
        if (!text) continue;

        let unitId = selectedUnit;
        if (unitName) {
          let unit = currentUnits.find(u => u.name === unitName);
          if (!unit) {
            unit = await createBankUnit(bankId!, unitName);
            currentUnits.push(unit);
            setUnits([...currentUnits]);
          }
          unitId = unit.id;
        }

        const genId = () => Math.random().toString(36).substring(2, 8);
        let options: any[] = [];
        let correctId = "";

        if (type === "mcq") {
          const optTexts = [
            String(row["الخيار 1"] || "").trim(),
            String(row["الخيار 2"] || "").trim(),
            String(row["الخيار 3"] || "").trim(),
            String(row["الخيار 4"] || "").trim(),
          ].filter(t => t);
          options = optTexts.map(t => ({ id: genId(), text: t }));
          const correctNum = parseInt(row["رقم الإجابة الصحيحة"]) || 1;
          if (options[correctNum - 1]) correctId = options[correctNum - 1].id;
          else if (options.length > 0) correctId = options[0].id;
        } else {
          const trueId = genId(); const falseId = genId();
          options = [{ id: trueId, text: "صح" }, { id: falseId, text: "خطأ" }];
          const correctVal = String(row["رقم الإجابة الصحيحة"] || "1");
          correctId = (correctVal === "1" || correctVal.includes("صح")) ? trueId : falseId;
        }

        if (correctId) {
          await createBankQuestion(bankId!, unitId, type, text, options, correctId);
          importedCount++;
        }
      }
      toast.success(`تم استيراد ${importedCount} سؤال بنجاح`);
      loadData();
  };

  const displayedQuestions = selectedUnit 
    ? questions.filter(q => q.unit_id === selectedUnit)
    : questions;

  if (!bank) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="container py-6" dir="rtl">
      {/* Unit Delete Dialog */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={(open) => !open && setDeleteUnitId(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف هذه الوحدة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الوحدة وجميع الأسئلة التي بداخلها بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Delete Dialog */}
      <AlertDialog open={!!deleteQuestionId} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف هذا السؤال؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف السؤال من البنك نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/banks")} className="rounded-full">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{bank.title}</h1>
          <p className="text-sm text-muted-foreground">{bank.description}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[250px_1fr] gap-6">
        {/* Units Sidebar */}
        <Card className="p-4 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2"><Folder className="h-4 w-4" /> فصول / وحدات</h3>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsAddUnitOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <button
              className={`w-full text-right px-3 py-2 rounded-md text-sm transition-colors ${selectedUnit === null ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`}
              onClick={() => setSelectedUnit(null)}
            >
              جميع الأسئلة ({questions.length})
            </button>
            {units.map(u => (
              <div key={u.id} className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer group ${selectedUnit === u.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"}`} onClick={() => setSelectedUnit(u.id)}>
                <span className="truncate pr-2">{u.name}</span>
                <button className="lg:opacity-0 lg:group-hover:opacity-100 p-1 hover:text-destructive transition-opacity" onClick={(e) => { e.stopPropagation(); setDeleteUnitId(u.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Questions Area */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4 bg-muted/30 p-2 rounded-xl border border-dashed justify-center sm:justify-start">
            <Button variant="outline" size="sm" className="gap-2 bg-background" onClick={() => openAddQuestion("mcq")}>
              <Plus className="h-4 w-4" /> إضافة MCQ
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-background" onClick={() => openAddQuestion("truefalse")}>
              <Plus className="h-4 w-4" /> إضافة صح/خطأ
            </Button>
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
            <Button variant="outline" size="sm" className="gap-2 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              استيراد Excel
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4" /> تحميل قالب
            </Button>
          </div>

          {displayedQuestions.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
              <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">لا توجد أسئلة هنا بعد</p>
            </div>
          ) : (
            displayedQuestions.map((q, i) => (
              <Card key={q.id} className="p-4 group/q">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                    <div>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full mb-1 inline-block">
                        {q.type === "mcq" ? "اختيار متعدد" : "صح/خطأ"}
                      </span>
                      <p className="font-medium text-base">{q.text}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0 lg:opacity-0 lg:group-hover/q:opacity-100 transition-opacity" onClick={() => setDeleteQuestionId(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mr-11 grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt:any) => (
                    <div key={opt.id} className={`px-3 py-1.5 rounded-md text-sm border flex items-center gap-2 ${opt.id === q.correct_option_id ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium" : "bg-muted/30"}`}>
                      <div className={`h-2 w-2 rounded-full ${opt.id === q.correct_option_id ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      {opt.text}
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader className="text-right sm:text-right"><DialogTitle>إضافة وحدة / فصل جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="اسم الوحدة..." value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} />
            <Button className="w-full" onClick={handleAddUnit}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="sm:max-w-[500px] text-right" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>{qType === "mcq" ? "سؤال اختيار من متعدد" : "سؤال صح أو خطأ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input placeholder="نص السؤال هنا..." value={qText} onChange={(e) => setQText(e.target.value)} className="font-medium" />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">الخيارات (اختر الإجابة الصحيحة)</label>
              {qOptions.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button 
                    type="button" 
                    tabIndex={-1}
                    className={`h-8 w-8 shrink-0 rounded-md border flex items-center justify-center transition-colors ${qCorrectId === opt.id ? "bg-success border-success text-success-foreground" : "hover:bg-muted"}`}
                    onClick={() => setQCorrectId(opt.id)}
                  >
                    {qCorrectId === opt.id ? "✓" : i+1}
                  </button>
                  {qType === "mcq" ? (
                    <Input placeholder={`خيار ${i+1}`} value={opt.text} onChange={(e) => {
                      const newOpts = [...qOptions]; newOpts[i].text = e.target.value; setQOptions(newOpts);
                    }} />
                  ) : (
                    <div className="flex-1 bg-muted px-3 py-2 rounded-md text-sm">{opt.text}</div>
                  )}
                </div>
              ))}
            </div>
            
            <Button className="w-full h-11" onClick={handleAddQuestion}>حفظ السؤال في البنك</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
