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
  TrendingDown, Target, CheckCircle2, XCircle, Loader2, Eye, AlertTriangle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearTarget, setClearTarget] = useState<string | null>(null);
  const [answerFilter, setAnswerFilter] = useState<'all' | 'correct' | 'wrong'>('all');

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
      "النزاهة (مخالفات)": parseInt(r.answers._violations || "0"),
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
            <Card className="p-6 border-r-4 border-r-orange-500 bg-orange-500/5 border-l-0 border-y-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600 dark:text-orange-400 relative z-10"><Target className="h-5 w-5" /> أصعب سؤال في الاختبار</h3>
              {(() => {
                const hardest = questionStats.reduce((prev, current) => (prev.successRate < current.successRate) ? prev : current);
                return (
                  <div className="relative z-10">
                    <p className="font-bold text-lg mb-3 leading-relaxed text-foreground">{hardest.text}</p>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="font-mono text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white border-transparent">{hardest.successRate}% نسبة نجاح</Badge>
                      <span className="text-sm font-medium text-muted-foreground">{hardest.wrongCount} طلاب أخطأوا فيه</span>
                    </div>
                  </div>
                );
              })()}
            </Card>

            <Card className="p-6 border-r-4 border-r-emerald-500 bg-emerald-500/5 border-l-0 border-y-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 relative z-10"><Trophy className="h-5 w-5" /> أسهل سؤال في الاختبار</h3>
              {(() => {
                const easiest = questionStats.reduce((prev, current) => (prev.successRate > current.successRate) ? prev : current);
                return (
                  <div className="relative z-10">
                    <p className="font-bold text-lg mb-3 leading-relaxed text-foreground">{easiest.text}</p>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500 text-white font-mono text-sm px-3 py-1 border-transparent hover:bg-emerald-600">{easiest.successRate}% نسبة نجاح</Badge>
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
                    <TableHead className="text-right">النزاهة (مكافح الغش)</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center w-24">إجراء</TableHead>
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
                        <TableCell>
                          {parseInt(r.answers._violations || "0") > 0 ? (
                            <Badge variant="destructive" className="gap-1.5 bg-red-500 font-bold hover:bg-red-600" title="عدد مرات الخروج من الاختبار">
                              <AlertTriangle className="h-3.5 w-3.5" /> {r.answers._violations} مخالفات
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 gap-1.5 font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> سليم
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell><Badge variant={pct >= 50 ? "default" : "destructive"}>{pct >= 50 ? "ناجح" : "راسب"}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedResult(r)} className="hover:bg-primary/10 hover:text-primary h-8 px-2 gap-1 rounded-lg">
                            <Eye className="h-4 w-4" /> عرض
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedResult} onOpenChange={(o) => (!o && setSelectedResult(null))}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto text-right" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="flex flex-col gap-3 pb-3 border-b">
              <div className="flex items-center gap-2 text-xl">
                <Eye className="h-6 w-6 text-primary" /> إجابات الطالب: <span className="text-primary">{selectedResult?.studentName}</span>
              </div>
              {selectedResult?.answers && parseInt(selectedResult.answers._violations || "0") > 0 && (
                <div className="flex items-center gap-3 text-sm font-bold text-destructive bg-destructive/10 p-3 border border-destructive/20 rounded-xl mt-1">
                  <AlertTriangle className="h-5 w-5 animate-pulse" /> 
                  تنبيه: تشير السجلات إلى أن هذا الطالب قام بمغادرة شاشة الاختبار والانتقال لتطبيقات أخرى ({selectedResult.answers._violations} مرات)!
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mb-4 border-b pb-4">
            <Button variant={answerFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setAnswerFilter("all")} className="rounded-xl">الكل</Button>
            <Button variant={answerFilter === "correct" ? "default" : "outline"} size="sm" onClick={() => setAnswerFilter("correct")} className={`rounded-xl ${answerFilter === 'correct' ? 'bg-emerald-500 hover:bg-emerald-600 text-white opacity-100' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>الإجابات الصحيحة</Button>
            <Button variant={answerFilter === "wrong" ? "default" : "outline"} size="sm" onClick={() => setAnswerFilter("wrong")} className={`rounded-xl ${answerFilter === 'wrong' ? 'bg-red-500 hover:bg-red-600 text-white opacity-100' : 'text-red-600 border-red-200 hover:bg-red-50'}`}>الإجابات الخاطئة</Button>
          </div>
          <div className="space-y-4 pt-2">
            {selectedResult && quiz.questions.map((q, index) => ({ q, index })).filter(({ q }) => {
              if (answerFilter === 'all') return true;
              const isCorrect = (selectedResult.answers || {})[q.id] === q.correctOptionId;
              return answerFilter === 'correct' ? isCorrect : !isCorrect;
            }).map(({ q, index }) => {
              const studentAnswerId = (selectedResult.answers || {})[q.id];
              const isCorrect = studentAnswerId === q.correctOptionId;
              const studentOption = q.options?.find((o) => o.id === studentAnswerId);
              const correctOption = q.options?.find((o) => o.id === q.correctOptionId);

              return (
                <Card key={q.id} className={`p-4 border-2 ${isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`h-8 w-8 shrink-0 flex items-center justify-center font-bold text-sm rounded-lg ${isCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold mb-4 text-base leading-relaxed">{q.text}</p>
                      
                      {q.image_url && (
                        <div className="mb-4 rounded-xl overflow-hidden border bg-muted/30">
                          <img src={q.image_url} alt="Question" className="max-h-48 w-full object-contain" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium opacity-80 shrink-0">إجابة الطالب:</span>
                            <span className="font-bold text-foreground">
                              {studentOption ? studentOption.text : 
                               (studentAnswerId === 'true' ? 'صح' : studentAnswerId === 'false' ? 'خطأ' : 'غير مجاب')}
                            </span>
                          </div>
                          {isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                        </div>
                        
                        {!isCorrect && (
                          <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                             <div className="flex items-center gap-2">
                               <span className="font-medium opacity-80 text-emerald-700 dark:text-emerald-400 shrink-0">الإجابة الصحيحة:</span>
                               <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                 {correctOption?.text || (q.correctOptionId === 'true' ? 'صح' : 'خطأ')}
                               </span>
                             </div>
                             <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
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
