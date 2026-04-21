import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Eye, Copy, Share2, Users, Clock, Shuffle, Check,
  BarChart3, ClipboardList, ToggleRight, ToggleLeft, Pencil, FileSpreadsheet, Loader2, Search, Printer, CopyPlus,
} from "lucide-react";
import { getQuizzes, deleteQuiz, updateQuiz, duplicateQuiz, getResultsForQuiz, getActiveStudentsForQuiz, removeActiveStudent, type Quiz, type StudentResult, type ActiveStudent } from "@/lib/quizStore";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

type FilterStatus = "all" | "active" | "inactive";
type FilterType = "all" | "roster" | "noroster";

interface QuizWithStats extends Quiz {
  results: StudentResult[];
  activeStudents: ActiveStudent[];
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle("لوحة تحكم المعلم");
  const [quizzesWithStats, setQuizzesWithStats] = useState<QuizWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [clearTarget, setClearTarget] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const quizzes = await getQuizzes();
      const withStats = await Promise.all(
        quizzes.map(async (q) => ({
          ...q,
          results: await getResultsForQuiz(q.id),
          activeStudents: await getActiveStudentsForQuiz(q.id),
        }))
      );
      setQuizzesWithStats(withStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const filteredQuizzes = useMemo(() => {
    return quizzesWithStats.filter((q) => {
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase()) && !q.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus === "active" && !q.isActive) return false;
      if (filterStatus === "inactive" && q.isActive) return false;
      if (filterType === "roster" && (!q.roster || q.roster.length === 0)) return false;
      if (filterType === "noroster" && q.roster && q.roster.length > 0) return false;
      return true;
    });
  }, [quizzesWithStats, searchQuery, filterStatus, filterType]);

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteQuiz(deleteTarget);
      setDeleteTarget(null);
      loadData();
      toast.success("تم حذف الاختبار");
    }
  };

  const toggleActive = async (quiz: QuizWithStats) => {
    await updateQuiz({ ...quiz, isActive: !quiz.isActive });
    loadData();
    toast.success(quiz.isActive ? "تم إيقاف الاختبار" : "تم تفعيل الاختبار");
  };

  const handleDuplicate = async (quizId: string) => {
    try {
      toast.info("جاري نسخ الاختبار...");
      await duplicateQuiz(quizId);
      loadData();
      toast.success("تم أخذ نسخة من الاختبار بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء استنساخ الاختبار");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success("تم نسخ الرمز")).catch(() => {
      const t = document.createElement("textarea"); t.value = code; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); toast.success("تم نسخ الرمز");
    });
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/quiz/${code}`;
    navigator.clipboard.writeText(link).then(() => toast.success("تم نسخ الرابط")).catch(() => {
      const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); toast.success("تم نسخ الرابط");
    });
  };

  const handleClearActiveStudents = async (quizId: string) => {
    const quiz = quizzesWithStats.find(q => q.id === quizId);
    if (!quiz || quiz.activeStudents.length === 0) return;
    
    try {
      toast.info("جاري إخلاء الطلاب المعلقين...");
      await Promise.all(quiz.activeStudents.map(s => removeActiveStudent(quizId, s.studentName)));
      loadData();
      toast.success("تم إخلاء الطلاب المعلقين بنجاح");
      setClearTarget(null);
    } catch {
      toast.error("حدث خطأ أثناء إخلاء الطلاب");
    }
  };

  const totalStudents = quizzesWithStats.reduce((sum, q) => sum + q.results.length, 0);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الاختبار؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الاختبار ونتائج جميع الطلاب المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clearTarget} onOpenChange={(open) => !open && setClearTarget(null)}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle>إخلاء الطلاب المعلقين</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في إخلاء هؤلاء الطلاب من قائمة (يختبرون الآن)؟ لن تضيع أية نتائج محفوظة أو إجابات تم إرسالها مسبقاً، سيتم فقط إخراجهم من الشاشة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearTarget && handleClearActiveStudents(clearTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              إخلاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">لوحة تحكم المعلم</h1>
              <p className="text-muted-foreground">إدارة الاختبارات ومتابعة النتائج</p>
            </div>
            <Button onClick={() => navigate("/teacher/create")} className="gap-2 rounded-xl">
              <Plus className="h-5 w-5" />
              اختبار جديد
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={<ClipboardList />} label="الاختبارات" value={quizzesWithStats.length} />
            <StatCard icon={<Check />} label="نشطة" value={quizzesWithStats.filter((q) => q.isActive).length} color="success" />
            <StatCard icon={<Users />} label="إجمالي الطلاب" value={totalStudents} color="secondary" />
            <StatCard
              icon={<BarChart3 />}
              label="متوسط الأسئلة"
              value={quizzesWithStats.length ? Math.round(quizzesWithStats.reduce((s, q) => s + q.questions.length, 0) / quizzesWithStats.length) : 0}
              color="accent"
            />
          </div>
        </div>
      </div>

      <div className="container py-8">
        {quizzesWithStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">لا توجد اختبارات بعد</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإنشاء اختبارك الأول</p>
            <Button onClick={() => navigate("/teacher/create")} className="gap-2 rounded-xl">
              <Plus className="h-5 w-5" />
              إنشاء اختبار
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث بالعنوان أو الرمز..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 rounded-xl" />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">متوقف</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger className="w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="roster">بقائمة طلاب</SelectItem>
                  <SelectItem value="noroster">بدون قائمة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">لا توجد اختبارات تطابق معايير البحث</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="overflow-hidden transition-all hover:shadow-lg animate-fade-in">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold line-clamp-1">{quiz.title}</h3>
                          <p className="text-sm text-muted-foreground">{quiz.questions.length} سؤال · {quiz.results.length} طالب أنهى</p>
                        </div>
                        <Badge variant={quiz.isActive ? "default" : "secondary"}>{quiz.isActive ? "نشط" : "متوقف"}</Badge>
                      </div>

                      {quiz.activeStudents.length > 0 && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                          <span className="text-sm font-medium text-primary line-clamp-1">{quiz.activeStudents.length} يختبرون الآن</span>
                          <div className="flex gap-1 mr-auto flex-wrap justify-end">
                            {quiz.activeStudents.slice(0, 2).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs py-0 truncate max-w-[80px]">{s.studentName}</Badge>
                            ))}
                            {quiz.activeStudents.length > 2 && (
                              <Badge variant="outline" className="text-xs py-0">+{quiz.activeStudents.length - 2}</Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setClearTarget(quiz.id)} className="h-5 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive ml-1">إخلاء</Button>
                          </div>
                        </div>
                      )}

                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted p-3">
                        <span className="text-sm text-muted-foreground">رمز الاختبار:</span>
                        <span className="font-mono text-lg font-bold tracking-widest flex-1">{quiz.code}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyCode(quiz.code)} className="h-8 w-8"><Copy className="h-4 w-4" /></Button>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {quiz.settings.timerEnabled && (<Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {quiz.settings.timerMinutes} دقيقة</Badge>)}
                        {quiz.settings.shuffleQuestions && (<Badge variant="outline" className="gap-1"><Shuffle className="h-3 w-3" /> أسئلة عشوائية</Badge>)}
                        {quiz.settings.shuffleOptions && (<Badge variant="outline" className="gap-1"><Shuffle className="h-3 w-3" /> إجابات عشوائية</Badge>)}
                        {quiz.roster && quiz.roster.length > 0 && (<Badge variant="outline" className="gap-1"><FileSpreadsheet className="h-3 w-3" /> {quiz.roster.length} طالب مسجل</Badge>)}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLink(quiz.code)} className="gap-1.5 rounded-lg"><Share2 className="h-3.5 w-3.5" /> نسخ الرابط</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/results/${quiz.id}`)} className="gap-1.5 rounded-lg"><Eye className="h-3.5 w-3.5" /> النتائج</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/edit/${quiz.id}`)} className="gap-1.5 rounded-lg"><Pencil className="h-3.5 w-3.5" /> تعديل</Button>
                        <Button variant="outline" size="sm" onClick={() => handleDuplicate(quiz.id)} className="gap-1.5 rounded-lg"><CopyPlus className="h-3.5 w-3.5" /> استنساخ</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(quiz)} className="gap-1.5 rounded-lg">
                          {quiz.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          {quiz.isActive ? "إيقاف" : "تفعيل"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(quiz.id)} className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "primary" }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  const bgMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent text-accent-foreground",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bgMap[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
