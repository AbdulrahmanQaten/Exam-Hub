import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getBanks, getBankUnits, getBankQuestions, QuestionBank, BankUnit, BankQuestion } from "@/lib/bankStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Settings2, Hash, Percent } from "lucide-react";

export function BankImportDialog({
  open,
  onClose,
  onImport
}: {
  open: boolean;
  onClose: () => void;
  onImport: (questions: BankQuestion[]) => void;
}) {
  const { user } = useAuth();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [units, setUnits] = useState<BankUnit[]>([]);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [importMode, setImportMode] = useState<"all" | "single" | "advanced">("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  
  const [importCount, setImportCount] = useState<number>(5);
  const [isRandom, setIsRandom] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      getBanks(user.id).then(setBanks).catch(console.error);
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedBankId) {
      setLoading(true);
      Promise.all([
        getBankUnits(selectedBankId),
        getBankQuestions(selectedBankId)
      ]).then(([uData, qData]) => {
        setUnits(uData);
        setQuestions(qData);
        // Reset counts
        const initialCounts: Record<string, number> = {};
        uData.forEach(u => initialCounts[u.id] = 0);
        setUnitCounts(initialCounts);
        setLoading(false);
      }).catch(() => {
        toast.error("خطأ في جلب بيانات البنك");
        setLoading(false);
      });
    } else {
      setUnits([]);
      setQuestions([]);
    }
  }, [selectedBankId]);

  const getUnitQuestionCount = (unitId: string) => questions.filter(q => q.unit_id === unitId).length;

  const handleImport = () => {
    if (questions.length === 0) {
      toast.error("لا توجد أسئلة في هذا البنك");
      return;
    }

    let selectedQuestions: BankQuestion[] = [];
    
    if (importMode === "all" || importMode === "single") {
      let pool = [...questions];
      if (importMode === "single" && selectedUnitId) {
        pool = pool.filter(q => q.unit_id === selectedUnitId);
      }
      
      if (pool.length === 0) {
        toast.error("لا توجد أسئلة متاحة في الوحدة المحددة");
        return;
      }

      if (isRandom) {
        // Shuffle the pool
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
      }
      
      selectedQuestions = pool.slice(0, importCount);
      
    } else if (importMode === "advanced") {
      for (const unit of units) {
        const desiredCount = unitCounts[unit.id] || 0;
        if (desiredCount > 0) {
          let pool = questions.filter(q => q.unit_id === unit.id);
          if (isRandom) {
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [pool[i], pool[j]] = [pool[j], pool[i]];
            }
          }
          selectedQuestions.push(...pool.slice(0, desiredCount));
        }
      }
    }

    if (selectedQuestions.length === 0) {
      toast.error("يرجى تحديد أسئلة لسحبها");
      return;
    }

    onImport(selectedQuestions);
    onClose();
    toast.success(`تم استيراد ${selectedQuestions.length} سؤال بنجاح`);
    
    // Reset defaults
    setSelectedBankId("");
    setImportMode("all");
    setSelectedUnitId("");
  };

  const setProportionalCounts = (totalTarget: number) => {
    const totalAvailable = questions.length;
    if (totalAvailable === 0) return;
    const newCounts = { ...unitCounts };
    let assigned = 0;
    
    // First pass
    for (const u of units) {
      const available = getUnitQuestionCount(u.id);
      const proportion = Math.floor((available / totalAvailable) * totalTarget);
      const toAssign = Math.min(proportion, available);
      newCounts[u.id] = toAssign;
      assigned += toAssign;
    }
    
    // Fill remaining if targeted hasn't been reached due to Math.floor
    if (assigned < totalTarget) {
      for (const u of units) {
        if (assigned >= totalTarget) break;
        const available = getUnitQuestionCount(u.id);
        if (newCounts[u.id] < available) {
          newCounts[u.id]++;
          assigned++;
        }
      }
    }
    setUnitCounts(newCounts);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px] text-right" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>الاستيراد من بنك الأسئلة</DialogTitle>
        </DialogHeader>
        
        {!user ? (
          <div className="py-6 text-center text-muted-foreground">
            هذه الميزة متاحة فقط للمستخدمين المسجلين.
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اختر البنك</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
              >
                <option value="">-- اختر البنك --</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            {selectedBankId && (
              <>
                {loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="block mb-2 font-bold">طريقة التوزيع السحب</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant={importMode === "all" ? "default" : "outline"} 
                          className="text-xs px-1 h-14 whitespace-normal" 
                          onClick={() => setImportMode("all")}
                        >
                          من كامل البنك
                        </Button>
                        <Button 
                          variant={importMode === "single" ? "default" : "outline"} 
                          className="text-xs px-1 h-14 whitespace-normal" 
                          onClick={() => setImportMode("single")}
                        >
                          من وحدة محددة
                        </Button>
                        <Button 
                          variant={importMode === "advanced" ? "default" : "outline"} 
                          className="text-xs px-1 h-14 whitespace-normal" 
                          disabled={units.length === 0}
                          onClick={() => setImportMode("advanced")}
                        >
                          تحديد مخصص لكل وحدة
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-[150px] space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed text-right mt-2">
                      {importMode === "all" && (
                        <div className="space-y-2">
                          <Label>إجمالي عدد الأسئلة المطلوب سحبها</Label>
                          <div className="flex gap-2 items-center">
                            <Input 
                              type="number" 
                              min={1} 
                              max={questions.length}
                              value={importCount} 
                              onChange={(e) => setImportCount(parseInt(e.target.value) || 1)} 
                              className="text-left"
                              dir="ltr"
                            />
                            <span className="text-sm text-muted-foreground shrink-0 w-24">من أصل {questions.length}</span>
                          </div>
                        </div>
                      )}

                      {importMode === "single" && (
                        <>
                          <div className="space-y-2">
                            <Label>الوحدة المستهدفة</Label>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
                              value={selectedUnitId}
                              onChange={(e) => setSelectedUnitId(e.target.value)}
                            >
                              <option value="">-- اختر الوحدة --</option>
                              {units.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({getUnitQuestionCount(u.id)} سؤال)</option>
                              ))}
                            </select>
                          </div>
                          {selectedUnitId && (
                            <div className="space-y-2">
                              <Label>عدد الأسئلة المطلوب</Label>
                              <div className="flex gap-2 items-center">
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={getUnitQuestionCount(selectedUnitId)}
                                  value={importCount} 
                                  onChange={(e) => setImportCount(parseInt(e.target.value) || 1)} 
                                  className="text-left"
                                  dir="ltr"
                                />
                                <span className="text-sm text-muted-foreground shrink-0 w-24">من أصل {getUnitQuestionCount(selectedUnitId)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {importMode === "advanced" && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm bg-background p-2 rounded-lg border">
                            <span className="font-semibold text-primary flex items-center gap-1"><Settings2 className="h-4 w-4" /> توزيع سريع</span>
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setProportionalCounts(10)}>10 كنسبة مئوية</Button>
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => {
                                const resetCounts: Record<string, number> = {};
                                units.forEach(u => resetCounts[u.id] = 0);
                                setUnitCounts(resetCounts);
                              }}>تصفير</Button>
                            </div>
                          </div>
                          
                          <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                            {units.map(u => {
                              const available = getUnitQuestionCount(u.id);
                              return (
                                <div key={u.id} className="flex justify-between items-center p-3 bg-background rounded-lg border">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{u.name}</span>
                                    <span className="text-xs text-muted-foreground">متوفر: {available}</span>
                                  </div>
                                  <div className="w-24">
                                    <Input 
                                      type="number" 
                                      min={0} 
                                      max={available} 
                                      value={unitCounts[u.id] || 0} 
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setUnitCounts({...unitCounts, [u.id]: val > available ? available : val});
                                      }}
                                      className="h-8 text-center"
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-sm font-bold text-center bg-primary/10 text-primary py-2 rounded-md">
                            إجمالي المسحوب: {Object.values(unitCounts).reduce((a, b) => a + (b || 0), 0)} أسئلة
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-4">
                      <Label className="cursor-pointer text-base" onClick={() => setIsRandom(!isRandom)}>سحب عشوائي للأسئلة المحددة؟</Label>
                      <Switch checked={isRandom} onCheckedChange={setIsRandom} />
                    </div>

                    <Button size="lg" className="w-full mt-4 h-12 text-base font-bold" onClick={handleImport}>
                      استيراد الأسئلة الآن
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
