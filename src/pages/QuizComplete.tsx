import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Home, Clock, List, Loader2 } from "lucide-react";
import { getResultsForQuiz, getQuizByCode, type QuizQuestion } from "@/lib/quizStore";

interface ResultState {
  score: number;
  total: number;
  studentName: string;
  timeTaken: number;
  showFeedback?: boolean;
  timerEnabled?: boolean;
  timerMinutes?: number;
  questions?: QuizQuestion[];
  userAnswers?: Record<string, string>;
}

export default function QuizComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code } = useParams();
  const [result, setResult] = useState<ResultState | null>(location.state as ResultState);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    // If we have state, we're good
    if (location.state) {
      setResult(location.state as ResultState);
      setLoading(false);
      return;
    }

    // If no state (e.g. refresh), try to fetch the latest result for this student from DB
    // This requires the studentName to be stored somewhere, but for now we'll just try to fetch
    // the very latest result if possible, or redirect.
    const tryRecoverResult = async () => {
      if (!code) { navigate("/"); return; }
      try {
        const quiz = await getQuizByCode(code);
        if (!quiz) { navigate("/"); return; }
        
        const results = await getResultsForQuiz(quiz.id);
        if (results && results.length > 0) {
          // Find the latest result for this student if possible, or just the most recent
          const latest = results[0]; 
          setResult({
            score: latest.score,
            total: latest.totalQuestions || quiz.questions.length,
            studentName: latest.studentName,
            timeTaken: latest.timeTaken,
            showFeedback: quiz.settings.showFeedback,
            timerEnabled: quiz.settings.timerEnabled,
            timerMinutes: quiz.settings.timerMinutes,
            questions: quiz.questions,
            userAnswers: latest.answers
          });
        } else {
          navigate("/");
        }
      } catch (err) {
        console.error(err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    tryRecoverResult();
  }, [code, location.state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) return null;

  const { score, total, studentName, timeTaken, showFeedback, questions = [], userAnswers = {}, timerEnabled, timerMinutes } = result;
  
  // Cap the timeTaken if timer is enabled
  const maxSeconds = timerEnabled ? (timerMinutes || 0) * 60 : Infinity;
  const effectiveTimeTaken = Math.min(timeTaken, maxSeconds);

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = percentage >= 50;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} دقيقة و ${s} ثانية`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 text-center animate-fade-in">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          passed ? "bg-success/10" : "bg-destructive/10"
        }`}>
          {passed ? (
            <CheckCircle2 className="h-10 w-10 text-success" />
          ) : (
            <XCircle className="h-10 w-10 text-destructive" />
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {passed ? "أحسنت!" : "حاول مرة أخرى"}
        </h1>
        <p className="text-muted-foreground mb-6">{studentName}</p>

        <div className="mb-6">
          <div className="text-6xl font-extrabold mb-2" style={{ color: passed ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
            {percentage}%
          </div>
          <p className="text-lg text-muted-foreground">
            {score} من {total} إجابة صحيحة
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
          <Clock className="h-4 w-4" />
          {formatTime(effectiveTimeTaken)}
        </div>

        <Button onClick={() => navigate("/")} className="rounded-xl gap-2 w-full max-w-xs mx-auto">
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </Button>

        {showFeedback && questions.length > 0 && (
          <div className="mt-12 border-t pt-8 text-right animate-fade-in">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-center gap-2"><List className="h-5 w-5" /> مراجعة الإجابات</h2>
            <div className="space-y-4 max-w-2xl mx-auto text-right" dir="rtl">
              {questions.map((q, i) => {
                const isCorrect = userAnswers[q.id] === q.correctOptionId;
                const isMissed = !userAnswers[q.id];
                return (
                  <Card key={q.id} className={`p-5 border-2 text-right ${isCorrect ? "border-success/30" : isMissed ? "border-warning/30" : "border-destructive/30"}`}>
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">{i + 1}</Badge>
                        {isCorrect ? (
                          <Badge className="bg-success text-success-foreground border-transparent">إجابة صحيحة</Badge>
                        ) : isMissed ? (
                          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-transparent">لم يُجب</Badge>
                        ) : (
                          <Badge variant="destructive">إجابة خاطئة</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold leading-relaxed">{q.text}</h3>
                      {q.imageUrl && (
                        <div className="mt-4 mb-4">
                          <img src={q.imageUrl} alt="مرفق السؤال" className="max-h-48 rounded-lg object-contain border border-muted/50 bg-muted/10" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt: any) => {
                        const isStudentChoice = userAnswers[q.id] === opt.id;
                        const isActualCorrect = q.correctOptionId === opt.id;
                        
                        let optClass = "border bg-muted/20 text-muted-foreground";
                        if (isActualCorrect) {
                          optClass = "border-success bg-success/10 text-success-foreground font-medium";
                        } else if (isStudentChoice && !isActualCorrect) {
                          optClass = "border-destructive bg-destructive/10 text-destructive-foreground opacity-80 line-through decoration-destructive/50";
                        }
                        
                        return (
                          <div key={opt.id} className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${optClass}`}>
                            <div className={`h-5 w-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                              isActualCorrect ? "border-success bg-success" : isStudentChoice ? "border-destructive bg-destructive" : "border-muted-foreground/30"
                            }`}>
                              {isActualCorrect && <CheckCircle2 className="h-3 w-3 text-white" />}
                              {isStudentChoice && !isActualCorrect && <XCircle className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
