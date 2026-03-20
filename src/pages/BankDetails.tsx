import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { 
  BankUnit, BankQuestion, getBankUnits, createBankUnit, deleteBankUnit,
  getBankQuestions, createBankQuestion, deleteBankQuestion, QuestionBank, getBanks,
  moveBankQuestions, deleteMultipleBankQuestions
} from "@/lib/bankStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, ArrowRight, Folder, FileQuestion, Check, X, AlertCircle, FolderInput, CheckSquare } from "lucide-react";
import { toast } from "sonner";

export default function BankDetails() {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  
  // Adding Unit Inline
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  
  // Adding Question Inline
  const [addingQuestionType, setAddingQuestionType] = useState<"mcq" | "truefalse" | null>(null);
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState<any[]>([]);
  const [qCorrectId, setQCorrectId] = useState("");

  // Deletion Dialogs
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<string | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<string | null>(null);

  // Batch Selection
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isDeleteBatchOpen, setIsDeleteBatchOpen] = useState(false);
  const [isMoveBatchOpen, setIsMoveBatchOpen] = useState(false);
  const [targetMoveUnit, setTargetMoveUnit] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
    else if (user && bankId) loadData();
  }, [user, isLoading, bankId, navigate]);

  // Clear selection when changing unit
  useEffect(() => {
    setSelectedQuestions([]);
    setAddingQuestionType(null);
  }, [selectedUnit]);

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
    if (!newUnitName.trim()) {
      setIsAddingUnit(false);
      return;
    }
    try {
      const u = await createBankUnit(bankId!, newUnitName);
      setUnits([...units, u]);
      setNewUnitName("");
      setIsAddingUnit(false);
      toast.success("تمت إضافة الوحدة");
    } catch {
      toast.error("خطأ في إضافة الوحدة");
    }
  };

  const handleDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    try {
      await deleteBankUnit(deleteUnitTarget);
      setUnits(units.filter(u => u.id !== deleteUnitTarget));
      setQuestions(questions.filter(q => q.unit_id !== deleteUnitTarget));
      if (selectedUnit === deleteUnitTarget) setSelectedUnit(null);
      toast.success("تم حذف الوحدة بجميع أسئلتها");
    } catch {
      toast.error("خطأ في الحذف");
    } finally {
      setDeleteUnitTarget(null);
    }
  };

  const openAddQuestion = (type: "mcq" | "truefalse") => {
    setAddingQuestionType(type);
    setQText("");
    const genId = () => Math.random().toString(36).substring(2, 8);
    if (type === "mcq") {
      setQOptions([{id: genId(), text:""}, {id: genId(), text:""}, {id: genId(), text:""}, {id: genId(), text:""}]);
    } else {
      setQOptions([{id: genId(), text:"صح"}, {id: genId(), text:"خطأ"}]);
    }
    setQCorrectId("");
  };

  const handleAddQuestion = async () => {
    if (!qText.trim()) { toast.error("أدخل نص السؤال"); return; }
    if (addingQuestionType === "mcq" && qOptions.some(o => !o.text.trim())) { toast.error("أكمل جميع الخيارات"); return; }
    if (!qCorrectId) { toast.error("اختر الإجابة الصحيحة"); return; }

    try {
      const q = await createBankQuestion(bankId!, selectedUnit, addingQuestionType!, qText, qOptions, qCorrectId);
      setQuestions([q, ...questions]);
      setAddingQuestionType(null);
      toast.success("تم حفظ السؤال بنجاح");
    } catch {
      toast.error("خطأ في إضافة السؤال");
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return;
    try {
      await deleteBankQuestion(deleteQuestionTarget);
      setQuestions(questions.filter(q => q.id !== deleteQuestionTarget));
      toast.success("تم حذف السؤال");
    } catch {
      toast.error("خطأ في الحذف");
    } finally {
      setDeleteQuestionTarget(null);
    }
  };

  const displayedQuestions = selectedUnit 
    ? questions.filter(q => q.unit_id === selectedUnit)
    : questions;

  const toggleSelectAll = () => {
    if (selectedQuestions.length === displayedQuestions.length && displayedQuestions.length > 0) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(displayedQuestions.map(q => q.id));
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    try {
      await deleteMultipleBankQuestions(selectedQuestions);
      setQuestions(questions.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      toast.success("تم حذف الأسئلة المحددة بنجاح");
    } catch {
      toast.error("خطأ في حذف الأسئلة");
    } finally {
      setIsDeleteBatchOpen(false);
    }
  };

  const handleBatchMove = async () => {
    try {
      await moveBankQuestions(selectedQuestions, targetMoveUnit);
      setQuestions(questions.map(q => 
        selectedQuestions.includes(q.id) ? { ...q, unit_id: targetMoveUnit } : q
      ));
      setSelectedQuestions([]);
      toast.success("تم نقل الأسئلة المحددة بنجاح");
    } catch {
      toast.error("خطأ في نقل الأسئلة");
    } finally {
      setIsMoveBatchOpen(false);
    }
  };

  if (!bank) return <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>;

  return (
    <div className="container py-8 max-w-6xl">
      {/* Delete Unit Alert */}
      <AlertDialog open={!!deleteUnitTarget} onOpenChange={(o) => (!o) && setDeleteUnitTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" /> حذف الوحدة الدراسية</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه الوحدة بشكل نهائي مع <b>جميع الأسئلة المتعلقة بها</b>. هذه العملية لا يمكن التراجع عنها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Question Alert */}
      <AlertDialog open={!!deleteQuestionTarget} onOpenChange={(o) => (!o) && setDeleteQuestionTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف السؤال</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا السؤال من بنك الأسئلة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Alert */}
      <AlertDialog open={isDeleteBatchOpen} onOpenChange={setIsDeleteBatchOpen}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>حذف الأسئلة المحددة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف ({selectedQuestions.length}) سؤال؟ لا يمكن التراجع عن هذه العملية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Move Dialog */}
      <Dialog open={isMoveBatchOpen} onOpenChange={setIsMoveBatchOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>نقل الأسئلة المحددة</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">اختر الوحدة التي تريد نقل الأسئلة إليها:</p>
            <div className="space-y-2">
              <button
                className={`w-full text-right px-3 py-3 rounded-lg text-sm transition-all border ${targetMoveUnit === null ? "bg-primary/10 border-primary text-primary font-medium" : "bg-card hover:bg-muted"}`}
                onClick={() => setTargetMoveUnit(null)}
              >
                خارج الوحدات (جميع الأسئلة)
              </button>
              {units.map(u => (
                <button
                  key={u.id}
                  className={`w-full text-right px-3 py-3 rounded-lg text-sm transition-all border ${targetMoveUnit === u.id ? "bg-primary/10 border-primary text-primary font-medium" : "bg-card hover:bg-muted"}`}
                  onClick={() => setTargetMoveUnit(u.id)}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setIsMoveBatchOpen(false)}>إلغاء</Button>
            <Button onClick={handleBatchMove}>تأكيد النقل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3 mb-6 bg-card p-4 rounded-2xl border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/banks")} className="rounded-full shrink-0">
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{bank.title}</h1>
          <p className="text-sm text-muted-foreground">{bank.description}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Units Sidebar */}
        <Card className="p-4 h-fit md:sticky md:top-20 border-border/60 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
            <h3 className="font-bold flex items-center gap-2 text-foreground/80"><Folder className="h-4 w-4" /> فصول / وحدات</h3>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-lg bg-muted hover:bg-muted/80" onClick={() => {setIsAddingUnit(true); setNewUnitName("");}}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <button
              className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all ${selectedUnit === null ? "bg-primary text-primary-foreground font-medium shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              onClick={() => setSelectedUnit(null)}
            >
              جميع الأسئلة <span className="float-left text-xs bg-black/10 px-2 py-0.5 rounded-full">{questions.length}</span>
            </button>
            {units.map(u => (
              <div key={u.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer group ${selectedUnit === u.id ? "bg-primary/10 text-primary font-medium border border-primary/20" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`} onClick={() => setSelectedUnit(u.id)}>
                <span className="truncate pr-1 flex-1">{u.name}</span>
                <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-md ml-2">{questions.filter(q => q.unit_id === u.id).length}</span>
                <button className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all shrink-0" onClick={(e) => { e.stopPropagation(); setDeleteUnitTarget(u.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {isAddingUnit && (
              <div className="mt-2 flex items-center gap-1 bg-muted/30 p-1.5 rounded-lg border border-primary/20 animate-fade-in">
                <Input 
                  autoFocus
                  placeholder="اسم الوحدة..." 
                  value={newUnitName} 
                  onChange={(e) => setNewUnitName(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleAddUnit()}
                  className="h-8 text-sm focus-visible:ring-0 border-0 bg-transparent"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:bg-success/10 hover:text-success shrink-0" onClick={handleAddUnit}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => setIsAddingUnit(false)}><X className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </Card>

        {/* Questions Area */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 bg-card p-3 rounded-2xl border shadow-sm">
            {!addingQuestionType && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button onClick={() => openAddQuestion("mcq")} className="gap-2 shrink-0 rounded-xl" variant="default" size="sm">
                  <Plus className="h-4 w-4" /> سؤال متعدد
                </Button>
                <Button onClick={() => openAddQuestion("truefalse")} className="gap-2 shrink-0 rounded-xl" variant="secondary" size="sm">
                  <Plus className="h-4 w-4" /> صح أو خطأ
                </Button>
              </div>
            )}
            
            {!addingQuestionType && displayedQuestions.length > 0 && (
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="select-all" 
                    checked={selectedQuestions.length === displayedQuestions.length && displayedQuestions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
                    تحديد الكل
                  </label>
                </div>

                {selectedQuestions.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded-md hidden sm:inline-block">
                      {selectedQuestions.length} محدد
                    </span>
                    <Button variant="outline" size="sm" className="h-8 gap-1 border-primary/20 hover:bg-primary/10 hover:text-primary" onClick={() => {
                      setTargetMoveUnit(selectedUnit); // Default to current
                      setIsMoveBatchOpen(true);
                    }}>
                      <FolderInput className="h-3.5 w-3.5" /> <span className="hidden sm:inline">نقل</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 border-destructive/20 hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsDeleteBatchOpen(true)}>
                      <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">حذف</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Inline Edit Form for New Question */}
          {addingQuestionType && (
            <Card className="p-6 border-2 border-primary/20 shadow-md animate-fade-in mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <h3 className="font-bold text-lg">{addingQuestionType === "mcq" ? "إعداد سؤال اختيار من متعدد" : "إعداد سؤال صح أو خطأ"}</h3>
                <Button variant="ghost" size="sm" onClick={() => setAddingQuestionType(null)} className="h-8"><X className="h-4 w-4 ml-1" /> إلغاء</Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">نص السؤال</label>
                  <Input autoFocus placeholder="اكتب سؤالك هنا..." value={qText} onChange={(e) => setQText(e.target.value)} className="h-12 text-base font-medium rounded-xl" />
                </div>
                
                <div className="bg-muted/20 p-4 rounded-xl border border-dashed">
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">الخيارات (حدد الدائرة للإجابة الصحيحة)</label>
                  <div className="space-y-2.5">
                    {qOptions.map((opt, i) => (
                      <div key={opt.id} className={`flex items-center gap-3 p-1 rounded-lg transition-colors ${qCorrectId === opt.id ? "bg-success/5" : ""}`}>
                        <button 
                          type="button"
                          className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${qCorrectId === opt.id ? "bg-success border-success text-success-foreground" : "border-muted-foreground/30 hover:border-success/50"}`}
                          onClick={() => setQCorrectId(opt.id)}
                        >
                          {qCorrectId === opt.id && <div className="h-2 w-2 rounded-full bg-white" />}
                        </button>
                        {addingQuestionType === "mcq" ? (
                          <Input placeholder={`الخيار ${i+1}`} value={opt.text} onChange={(e) => {
                            const newOpts = [...qOptions]; newOpts[i].text = e.target.value; setQOptions(newOpts);
                          }} className={`h-10 rounded-lg ${qCorrectId === opt.id ? "border-success/30 font-medium" : ""}`} />
                        ) : (
                          <div className={`flex-1 px-4 py-2.5 rounded-lg border bg-card text-sm cursor-pointer ${qCorrectId === opt.id ? "border-success/30 font-medium" : ""}`} onClick={() => setQCorrectId(opt.id)}>
                            {opt.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddingQuestionType(null)} className="rounded-xl">الغاء والتراجع</Button>
                  <Button onClick={handleAddQuestion} className="gap-2 rounded-xl"><Check className="h-4 w-4" /> حفظ وإضافة للبنك</Button>
                </div>
              </div>
            </Card>
          )}

          {!addingQuestionType && displayedQuestions.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-dashed shadow-sm">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileQuestion className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">لا توجد أسئلة هنا بعد</p>
              <p className="text-muted-foreground text-sm">ابدأ بإضافة أسئلة لاختباراتك القادمة باستخدام الأزرار بالأعلى</p>
            </div>
          ) : !addingQuestionType && (
            <div className="grid gap-3">
              {displayedQuestions.map((q, i) => (
                <div key={q.id} className="relative group">
                  <div className="absolute right-4 top-6 z-10 transition-transform hover:scale-110">
                    <Checkbox 
                      checked={selectedQuestions.includes(q.id)}
                      onCheckedChange={() => toggleQuestionSelection(q.id)}
                      className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                  <Card 
                    className={`p-5 pl-5 pr-12 border-border/50 hover:border-primary/20 transition-all ${selectedQuestions.includes(q.id) ? "ring-2 ring-primary border-transparent bg-primary/5" : ""}`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest('button')) {
                        toggleQuestionSelection(q.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4 cursor-pointer w-full">
                        <div className="h-10 w-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center font-bold shrink-0">{i+1}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase">
                              {q.type === "mcq" ? "اختيار متعدد" : "صح وخطأ"}
                            </span>
                          </div>
                          <p className="font-medium text-base text-foreground leading-relaxed">{q.text}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/5 hover:bg-destructive/10" onClick={() => setDeleteQuestionTarget(q.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {q.options.map((opt:any) => {
                        const isCorrect = opt.id === q.correct_option_id;
                        return (
                          <div key={opt.id} className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2.5 transition-colors ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium" : "bg-muted/20 border-border/50 text-muted-foreground"}`}>
                            <div className={`h-2 w-2 shrink-0 rounded-full ${isCorrect ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            <span className="truncate">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
