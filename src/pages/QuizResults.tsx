import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, Users, BarChart3, Clock, Trophy, RefreshCw, Download,
  TrendingDown, Target, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getQuizById, getResultsForQuiz, getActiveStudentsForQuiz, removeActiveStudent, type Quiz, type StudentResult, type ActiveStudent } from "@/lib/quizStore";
import * as XLSX from "xlsx";

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearTarget, setClearTarget] = useState<string | null>(null);

  const loadData = async () => {
    if (!quizId) return;
    try {
      const q = await getQuizById(quizId);
      if (q) {
        setQuiz(q);
        const [r, a] = await Promise.all([getResultsForQuiz(quizId), getActiveStudentsForQuiz(quizId)]);
        setResults(r);
        setActiveStudents(a);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [quizId]);
  useEffect(() => { const interval = setInterval(loadData, 5000); return () => clearInterval(interval); }, [quizId]);

  const exportToExcel = () => {
    if (!quiz || results.length === 0) return;
    const data = results.sort((a, b) => b.score - a.score).map((r, i) => ({
      "الترتيب": i + 1, "اسم الطالب": r.studentName,
      ...(r.studentId ? { "رقم الطالب": r.studentId } : {}),
      "الدرجة": `${r.score}/${r.totalQuestions}`,
      "النسبة المئوية": `${Math.round((r.score / r.totalQuestions) * 100)}%`,
      "الوقت": formatTime(r.timeTaken),
      "الحالة": Math.round((r.score / r.totalQuestions) * 100) >= 50 ? "ناجح" : "راسب",
      "تاريخ الإكمال": new Date(r.completedAt).toLocaleString("ar-SA"),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النتائج");

    const questionData = quiz.questions.map((q, i) => {
      const correctCount = results.filter(r => r.answers[q.id] === q.correctOptionId).length;
      return { "رقم السؤال": i + 1, "نص السؤال": q.text, "النوع": q.type === "mcq" ? "اختيار من متعدد" : "صح وخطأ", "عدد الإجابات الصحيحة": correctCount, "عدد الإجابات الخاطئة": results.length - correctCount, "نسبة النجاح": `${results.length ? Math.round((correctCount / results.length) * 100) : 0}%` };
    });
    const ws2 = XLSX.utils.json_to_sheet(questionData);
    XLSX.utils.book_append_sheet(wb, ws2, "تحليل الأسئلة");

    const detailedData = results.sort((a, b) => b.score - a.score).map((r) => {
      const row: Record<string, any> = { "اسم الطالب": r.studentName, ...(r.studentId ? { "رقم الطالب": r.studentId } : {}) };
      quiz.questions.forEach((q, i) => {
        const selectedOpt = q.options.find(o => o.id === r.answers[q.id]);
        row[`س${i + 1}`] = selectedOpt?.text || "لم يُجب";
        row[`س${i + 1} - صحيح`] = r.answers[q.id] === q.correctOptionId ? "✓" : "✗";
      });
      row["المجموع"] = `${r.score}/${r.totalQuestions}`;
      return row;
    });
    const ws3 = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, ws3, "إجابات تفصيلية");
    XLSX.writeFile(wb, `${quiz.title} - النتائج.xlsx`);
  };

  const handleClearActiveStudents = async (quizId: string) => {
    if (!quiz || activeStudents.length === 0) return;
    try {
      toast.info("جاري إخلاء الطلاب المعلقين...");
      setClearTarget(null);
      const previousActive = [...activeStudents];
      setActiveStudents([]); // Optimistic update
      
      await Promise.all(previousActive.map(s => removeActiveStudent(quizId, s.studentName)));
      loadData();
      toast.success("تم إخلاء الطلاب المعلقين بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء إخلاء الطلاب");
      loadData(); // Revert on failure
    }
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!quiz) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-muted-foreground">الاختبار غير موجود</div></div>;
  }

  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + (r.score / r.totalQuestions) * 100, 0) / results.length) : 0;
  const avgTime = results.length ? Math.round(results.reduce((s, r) => s + r.timeTaken, 0) / results.length) : 0;
  const highestScore = results.length ? Math.max(...results.map((r) => Math.round((r.score / r.totalQuestions) * 100))) : 0;
  const lowestScore = results.length ? Math.min(...results.map((r) => Math.round((r.score / r.totalQuestions) * 100))) : 0;
  const passCount = results.filter(r => Math.round((r.score / r.totalQuestions) * 100) >= 50).length;

  const questionStats = quiz.questions.map((q, i) => {
    const correctCount = results.filter(r => r.answers[q.id] === q.correctOptionId).length;
    return { index: i + 1, text: q.text, type: q.type, correctCount, wrongCount: results.length - correctCount, successRate: results.length ? Math.round((correctCount / results.length) * 100) : 0 };
  });

  return (
    <div className="min-h-[calc(100vh-4rem)]">
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
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="rounded-full"><ArrowRight className="h-5 w-5" /></Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">رمز الاختبار: <span className="font-mono font-bold">{quiz.code}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} className="gap-2 rounded-lg"><RefreshCw className="h-4 w-4" /> تحديث</Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={results.length === 0} className="gap-2 rounded-lg"><Download className="h-4 w-4" /> تصدير Excel</Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={<Users />} label="عدد الطلاب" value={`${results.length}`} />
            <StatCard icon={<BarChart3 />} label="متوسط الدرجات" value={`${avgScore}%`} color="primary" />
            <StatCard icon={<Trophy />} label="أعلى درجة" value={`${highestScore}%`} color="success" />
            <StatCard icon={<TrendingDown />} label="أقل درجة" value={`${lowestScore}%`} color="destructive" />
            <StatCard icon={<CheckCircle2 />} label="ناجحون" value={`${passCount}`} color="success" />
            <StatCard icon={<Clock />} label="متوسط الوقت" value={formatTime(avgTime)} color="secondary" />
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {activeStudents.length > 0 && (
          <Card className="p-5 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3 border-b border-primary/10 pb-2">
              <h2 className="text-lg font-bold flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /> طلاب يختبرون الآن ({activeStudents.length})</h2>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-8 text-xs font-bold" onClick={() => setClearTarget(quiz.id)}>
                إخلاء المعلقين
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeStudents.map((s, i) => {
                const elapsed = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card p-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.studentName}</p>
                      {s.studentId && <p className="text-xs text-muted-foreground font-mono">{s.studentId}</p>}
                    </div>
                    <Badge variant="outline" className="gap-1 font-mono text-xs"><Clock className="h-3 w-3" /> {formatTime(elapsed)}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {results.length > 0 && questionStats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 animate-fade-in shadow-sm">
            <Card className="p-6 border-r-4 border-r-warning bg-warning/5 border-l-0 border-y-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-warning-foreground relative z-10"><Target className="h-5 w-5" /> أصعب سؤال في الاختبار</h3>
              {(() => {
                const hardest = questionStats.reduce((prev, current) => (prev.successRate < current.successRate) ? prev : current);
                return (
                  <div className="relative z-10">
                    <p className="font-bold text-lg mb-3 leading-relaxed">{hardest.text}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="font-mono text-sm px-3 py-1">{hardest.successRate}% نسبة نجاح</Badge>
                      <span className="text-sm font-medium text-muted-foreground">{hardest.wrongCount} طلاب أخطأوا فيه</span>
                    </div>
                  </div>
                );
              })()}
            </Card>

            <Card className="p-6 border-r-4 border-r-success bg-success/5 border-l-0 border-y-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-success-foreground relative z-10"><Trophy className="h-5 w-5" /> أسهل سؤال في الاختبار</h3>
              {(() => {
                const easiest = questionStats.reduce((prev, current) => (prev.successRate > current.successRate) ? prev : current);
                return (
                  <div className="relative z-10">
                    <p className="font-bold text-lg mb-3 leading-relaxed">{easiest.text}</p>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-success text-success-foreground font-mono text-sm px-3 py-1 border-transparent">{easiest.successRate}% نسبة نجاح</Badge>
                      <span className="text-sm font-medium text-muted-foreground">{easiest.correctCount} طلاب أجابوا بشكل صحيح</span>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="h-5 w-5" /> تحليل الأسئلة</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {questionStats.map((qs) => (
                <Card key={qs.index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${qs.successRate >= 70 ? "bg-success/10 text-success" : qs.successRate >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>{qs.index}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{qs.text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {qs.correctCount}</span>
                        <span className="text-xs text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> {qs.wrongCount}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${qs.successRate >= 70 ? "bg-success" : qs.successRate >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${qs.successRate}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{qs.successRate}% نسبة النجاح</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold mb-4">نتائج الطلاب</h2>
          {results.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">لم يختبر أي طالب بعد</h3>
              <p className="text-muted-foreground">شارك رمز الاختبار مع طلابك لبدء الاختبار</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">#</TableHead>
                    <TableHead className="text-right">اسم الطالب</TableHead>
                    <TableHead className="text-right">الدرجة</TableHead>
                    <TableHead className="text-right">النسبة</TableHead>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.sort((a, b) => b.score - a.score).map((r, i) => {
                    const pct = Math.round((r.score / r.totalQuestions) * 100);
                    return (
                      <TableRow key={r.id} className="animate-fade-in">
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{r.studentName}</span>
                            {r.studentId && <span className="text-xs text-muted-foreground font-mono mr-2">({r.studentId})</span>}
                          </div>
                        </TableCell>
                        <TableCell>{r.score}/{r.totalQuestions}</TableCell>
                        <TableCell className="font-bold">{pct}%</TableCell>
                        <TableCell className="font-mono text-sm">{formatTime(r.timeTaken)}</TableCell>
                        <TableCell><Badge variant={pct >= 50 ? "default" : "destructive"}>{pct >= 50 ? "ناجح" : "راسب"}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatCard({ icon, label, value, color = "accent" }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  const bgMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary", success: "bg-success/10 text-success",
    secondary: "bg-secondary/10 text-secondary", accent: "bg-accent text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bgMap[color]}`}>{icon}</div>
        <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </div>
    </Card>
  );
}
