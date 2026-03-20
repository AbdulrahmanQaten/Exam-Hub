import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Home, Clock, List } from "lucide-react";

export default function QuizComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { score = 0, total = 0, studentName = "", timeTaken = 0, showFeedback = false, questions = [], userAnswers = {} } = (location.state || {}) as {
    score: number; total: number; studentName: string; timeTaken: number; showFeedback?: boolean; questions?: any[]; userAnswers?: Record<string, string>;
  };

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
          {formatTime(timeTaken)}
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
