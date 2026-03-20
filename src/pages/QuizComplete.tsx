import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Home, Clock } from "lucide-react";

export default function QuizComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const { score = 0, total = 0, studentName = "", timeTaken = 0 } = (location.state || {}) as {
    score: number; total: number; studentName: string; timeTaken: number;
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

        <Button onClick={() => navigate("/")} className="rounded-xl gap-2">
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </Button>
      </Card>
    </div>
  );
}
