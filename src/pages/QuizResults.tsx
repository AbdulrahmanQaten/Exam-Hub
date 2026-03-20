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
import { getQuizById, getResultsForQuiz, getActiveStudentsForQuiz, type Quiz, type StudentResult, type ActiveStudent } from "@/lib/quizStore";
import * as XLSX from "xlsx";

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [activeStudents, setActiveStudents] = useState<ActiveStudent[]>([]);

  const loadData = () => {
    if (quizId) {
      const q = getQuizById(quizId);
      if (q) {
        setQuiz(q);
        setResults(getResultsForQuiz(quizId));
        setActiveStudents(getActiveStudentsForQuiz(quizId));
      }
    }
  };

  useEffect(loadData, [quizId]);

  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [quizId]);

  const exportToExcel = () => {
    if (!quiz || results.length === 0) return;

    const data = results
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({
        "الترتيب": i + 1,
        "اسم الطالب": r.studentName,
        ...(r.studentId ? { "رقم الطالب": r.studentId } : {}),
        "الدرجة": `${r.score}/${r.totalQuestions}`,
        "النسبة المئوية": `${Math.round((r.score / r.totalQuestions) * 100)}%`,
        "الوقت (ثانية)": r.timeTaken,
        "الوقت": formatTime(r.timeTaken),
        "الحالة": Math.round((r.score / r.totalQuestions) * 100) >= 50 ? "ناجح" : "راسب",
        "تاريخ الإكمال": new Date(r.completedAt).toLocaleString("ar-SA"),
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النتائج");

    const questionData = quiz.questions.map((q, i) => {
      const correctCount = results.filter(r => r.answers[q.id] === q.correctOptionId).length;
      return {
        "رقم السؤال": i + 1,
        "نص السؤال": q.text,
        "النوع": q.type === "mcq" ? "اختيار من متعدد" : "صح وخطأ",
        "عدد الإجابات الصحيحة": correctCount,
        "عدد الإجابات الخاطئة": results.length - correctCount,
        "نسبة النجاح": `${results.length ? Math.round((correctCount / results.length) * 100) : 0}%`,
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(questionData);
    XLSX.utils.book_append_sheet(wb, ws2, "تحليل الأسئلة");

    // Detailed answers sheet
    const detailedData = results.sort((a, b) => b.score - a.score).map((r) => {
      const row: Record<string, any> = {
        "اسم الطالب": r.studentName,
        ...(r.studentId ? { "رقم الطالب": r.studentId } : {}),
      };
      quiz.questions.forEach((q, i) => {
        const selectedOpt = q.options.find(o => o.id === r.answers[q.id]);
        const correctOpt = q.options.find(o => o.id === q.correctOptionId);
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

  if (!quiz) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-muted-foreground">الاختبار غير موجود</div>
      </div>
    );
  }

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + (r.score / r.totalQuestions) * 100, 0) / results.length)
    : 0;
  const avgTime = results.length
    ? Math.round(results.reduce((s, r) => s + r.timeTaken, 0) / results.length)
    : 0;
  const highestScore = results.length
    ? Math.max(...results.map((r) => Math.round((r.score / r.totalQuestions) * 100)))
    : 0;
  const lowestScore = results.length
    ? Math.min(...results.map((r) => Math.round((r.score / r.totalQuestions) * 100)))
    : 0;
  const passCount = results.filter(r => Math.round((r.score / r.totalQuestions) * 100) >= 50).length;

  const questionStats = quiz.questions.map((q, i) => {
    const correctCount = results.filter(r => r.answers[q.id] === q.correctOptionId).length;
    return {
      index: i + 1,
      text: q.text,
      type: q.type,
      correctCount,
      wrongCount: results.length - correctCount,
      successRate: results.length ? Math.round((correctCount / results.length) * 100) : 0,
    };
  });

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="rounded-full">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
              <p className="text-sm text-muted-foreground">رمز الاختبار: <span className="font-mono font-bold">{quiz.code}</span></p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} className="gap-2 rounded-lg">
                <RefreshCw className="h-4 w-4" /> تحديث
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={results.length === 0} className="gap-2 rounded-lg">
                <Download className="h-4 w-4" /> تصدير Excel
              </Button>
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
        {/* Active Students */}
        {activeStudents.length > 0 && (
          <Card className="p-5 border-primary/30 bg-primary/5">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              طلاب يختبرون الآن ({activeStudents.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeStudents.map((s, i) => {
                const elapsed = Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000);
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card p-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.studentName}</p>
                      {s.studentId && <p className="text-xs text-muted-foreground font-mono">{s.studentId}</p>}
                    </div>
                    <div className="text-left">
                      <Badge variant="outline" className="gap-1 font-mono text-xs">
                        <Clock className="h-3 w-3" />
                        {formatTime(elapsed)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Question Analysis */}
        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" /> تحليل الأسئلة
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {questionStats.map((qs) => (
                <Card key={qs.index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                      qs.successRate >= 70 ? "bg-success/10 text-success" :
                      qs.successRate >= 40 ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {qs.index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{qs.text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {qs.correctCount}
                        </span>
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> {qs.wrongCount}
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            qs.successRate >= 70 ? "bg-success" :
                            qs.successRate >= 40 ? "bg-warning" :
                            "bg-destructive"
                          }`}
                          style={{ width: `${qs.successRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{qs.successRate}% نسبة النجاح</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Student Results Table */}
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
                  {results
                    .sort((a, b) => b.score - a.score)
                    .map((r, i) => {
                      const pct = Math.round((r.score / r.totalQuestions) * 100);
                      return (
                        <TableRow key={r.id} className="animate-fade-in">
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{r.studentName}</span>
                              {r.studentId && (
                                <span className="text-xs text-muted-foreground font-mono mr-2">({r.studentId})</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{r.score}/{r.totalQuestions}</TableCell>
                          <TableCell className="font-bold">{pct}%</TableCell>
                          <TableCell className="font-mono text-sm">{formatTime(r.timeTaken)}</TableCell>
                          <TableCell>
                            <Badge variant={pct >= 50 ? "default" : "destructive"}>
                              {pct >= 50 ? "ناجح" : "راسب"}
                            </Badge>
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
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent text-accent-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${bgMap[color]}`}>{icon}</div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
