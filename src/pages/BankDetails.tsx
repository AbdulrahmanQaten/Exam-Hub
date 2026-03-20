import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  BankUnit, BankQuestion, getBankUnits, createBankUnit, deleteBankUnit,
  getBankQuestions, createBankQuestion, deleteBankQuestion, QuestionBank, getBanks
} from "@/lib/bankStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, ArrowRight, Folder, FileQuestion, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function BankDetails() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [qType, setQType] = useState<"mcq" | "truefalse">("mcq");
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<any[]>([]);
  const [qCorrectId, setQCorrectId] = useState("");

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
    else if (user && bankId) loadData();
  }, [user, isLoading, bankId, navigate]);

  const loadData = async () => {
    try {
      const allBanks = await getBanks(user!.id);
      const b = allBanks.find(x => x.id === bankId);
      if (!b) { navigate("/banks"); return; }
      setBank(b);
      
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

  const handleDeleteUnit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("سيتم حذف الوحدة وجميع الأسئلة التي بداخلها، متأكد؟")) return;
    try {
      await deleteBankUnit(id);
      setUnits(units.filter(u => u.id !== id));
      setQuestions(questions.filter(q => q.unit_id !== id));
      if (selectedUnit === id) setSelectedUnit(null);
      toast.success("تم الحذف");
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

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("احذف السؤال؟")) return;
    try {
      await deleteBankQuestion(id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch {
      toast.error("خطأ");
    }
  };

  const displayedQuestions = selectedUnit 
    ? questions.filter(q => q.unit_id === selectedUnit)
    : questions;

  if (!bank) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="container py-6">
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
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive" onClick={(e) => handleDeleteUnit(u.id, e)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Questions Area */}
        <div className="space-y-4">
          <div className="flex gap-2 mb-4 bg-muted/30 p-2 rounded-xl border border-dashed justify-center sm:justify-start">
            <Button variant="outline" className="gap-2 shrink-0 bg-background" onClick={() => openAddQuestion("mcq")}>
              <Plus className="h-4 w-4" /> اختيار من متعدد
            </Button>
            <Button variant="outline" className="gap-2 shrink-0 bg-background" onClick={() => openAddQuestion("truefalse")}>
              <Plus className="h-4 w-4" /> صح أو خطأ
            </Button>
          </div>

          {displayedQuestions.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
              <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">لا توجد أسئلة هنا بعد</p>
            </div>
          ) : (
            displayedQuestions.map((q, i) => (
              <Card key={q.id} className="p-4">
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
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0" onClick={() => handleDeleteQuestion(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mr-11 grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt:any) => (
                    <div key={opt.id} className={`px-3 py-1.5 rounded-md text-sm border flex items-center gap-2 ${opt.id === q.correct_option_id ? "bg-success/10 border-success/30 text-success-foreground font-medium" : "bg-muted/30"}`}>
                      <div className={`h-2 w-2 rounded-full ${opt.id === q.correct_option_id ? "bg-success" : "bg-muted-foreground/30"}`} />
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
