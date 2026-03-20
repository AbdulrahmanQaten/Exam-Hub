import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Printer, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { getQuizById, type Quiz } from "@/lib/quizStore";

export default function PrintQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (quizId) {
      getQuizById(quizId).then((data) => {
        if (data) setQuiz(data);
        else navigate("/teacher");
      });
    }
  }, [quizId, navigate]);

  if (!quiz) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Non-printable Control Bar */}
      <div className="print:hidden bg-card border-b sticky top-0 z-50 p-4 shadow-sm">
        <div className="container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="rounded-full">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">تجهيز الطباعة: {quiz.title}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={showAnswers} onCheckedChange={setShowAnswers} id="show-answers" />
              <Label htmlFor="show-answers" className="cursor-pointer font-medium">إظهار نموذج الإجابة للمعلم</Label>
            </div>
            <Button onClick={() => window.print()} className="gap-2 rounded-lg bg-primary text-primary-foreground">
              <Printer className="h-5 w-5" /> طباعة الاختبار
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Area - A4 Optimized */}
      <div className="print:m-0 print:p-0 print:bg-white print:text-black bg-white text-black min-h-[297mm] mx-auto w-full max-w-[210mm] shadow-lg print:shadow-none p-10 md:my-10">
        
        {/* Header Section */}
        <div className="border-b-2 border-black pb-4 mb-6 relative">
          <div className="absolute top-0 left-0 w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm print:border-black/20">
            الختم / الشعار
          </div>
          <div className="text-center pr-28">
            <h2 className="text-2xl font-bold mb-1">{quiz.title}</h2>
            <p className="text-lg mb-1">المادة: ___________________</p>
            <p className="text-sm">معلم المادة: ___________________</p>
          </div>
        </div>

        {/* Student Data Fields */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-lg font-medium p-4 border border-black rounded-xl bg-gray-50 print:bg-transparent">
          <div>اسم الطالب: <span className="inline-block w-[75%] border-b-2 border-dotted border-black/50"></span></div>
          <div>رقم الجلوس: <span className="inline-block w-[75%] border-b-2 border-dotted border-black/50"></span></div>
          <div>الفصل / الشُعبة: <span className="inline-block w-[70%] border-b-2 border-dotted border-black/50"></span></div>
          <div>الدرجة الكلية: <span className="inline-block w-[40%] border-b-2 border-solid border-black">&nbsp; / {quiz.questions.length}</span></div>
        </div>

        <div className="mb-6 font-bold text-lg underline underline-offset-4">
          أجب عن جميع الأسئلة التالية (عدد الأسئلة: {quiz.questions.length}):
        </div>

        {/* Questions Section */}
        <div className="space-y-8">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="break-inside-avoid">
              <div className="flex gap-2 font-bold text-lg mb-3">
                <span className="shrink-0">{index + 1}.</span>
                <span className="leading-snug">{q.text}</span>
              </div>
              {q.imageUrl && (
                <div className="mb-4 pr-6 flex justify-start">
                  <img src={q.imageUrl} alt="مرفق السؤال" className="max-h-40 rounded border border-black/20 object-contain print:max-h-48" />
                </div>
              )}
              <div className="pr-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {q.options.map((opt) => {
                  const isCorrect = q.correctOptionId === opt.id;
                  const highlightAnswer = showAnswers && isCorrect;
                  
                  return (
                    <div 
                      key={opt.id} 
                      className={`flex items-center gap-3 p-1 ${highlightAnswer ? "font-bold text-black bg-gray-200 print:bg-gray-200 print:-webkit-print-color-adjust-exact print:color-adjust-exact rounded" : "text-gray-800"}`}
                    >
                      {highlightAnswer ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-gray-400" />
                      )}
                      <span className="leading-snug">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-black/20 text-center text-sm text-gray-500 font-medium">
          انتهت الأسئلة - بالتوفيق والنجاح
        </div>
      </div>
    </div>
  );
}
