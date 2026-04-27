import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Shuffle, ClipboardList, UserCircle, KeyRound, Globe, ShieldAlert } from "lucide-react";
import { getQuizByCode, getResultsForQuiz, addActiveStudent, type Quiz } from "@/lib/quizStore";
import { toast } from "sonner";

export default function StudentEntry() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [networkError, setNetworkError] = useState(false);

  const hasRoster = quiz?.roster && quiz.roster.length > 0;

  useEffect(() => {
    if (code) {
      getQuizByCode(code.toUpperCase()).then((found) => {
        if (found) {
          setQuiz(found);
        } else {
          setNotFound(true);
        }
      }).catch((err) => {
        if (err.message.includes("داخل شبكة المعلم")) {
          setNetworkError(true);
          setError(err.message);
        } else {
          setNotFound(true);
        }
      }).finally(() => setLoading(false));
    }
  }, [code]);

  const startQuiz = async () => {
    setError("");
    if (!quiz) return;

    try {
      let finalName = name.trim();
      let finalId = studentId.trim();

      if (hasRoster) {
        if (!finalId) { setError("يرجى إدخال رقم الطالب"); return; }
        const entry = quiz.roster!.find(r => r.studentId === finalId);
        if (!entry) { setError("رقم الطالب غير مسجل في هذا الاختبار"); return; }
        finalName = entry.name;
        
        const results = await getResultsForQuiz(quiz.id);
        if (results.find(r => r.studentId === finalId)) {
          setError("لقد أديت هذا الاختبار مسبقاً ولا يمكنك الدخول مرة أخرى"); return;
        }
      } else {
        if (!finalName) { setError("يرجى إدخال اسمك"); return; }
        const results = await getResultsForQuiz(quiz.id);
        if (results.find(r => r.studentName === finalName)) {
          setError("يوجد طالب بهذا الاسم أدى الاختبار مسبقاً. إذا كنت شخصاً مختلفاً أضف لقبك"); return;
        }
      }

      // Important: Check if student is already active (logged in elsewhere)
      await addActiveStudent(quiz.id, finalName, finalId || undefined);
      
      navigate(`/quiz/${code}/start`, { 
        state: { 
          studentName: finalName, 
          quizId: quiz.id, 
          studentId: finalId || undefined 
        } 
      });

    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء محاولة الدخول");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">جارٍ التحميل...</div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full mx-4 border-2 border-destructive/20">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-destructive animate-pulse" />
          </div>
          <h2 className="text-xl font-bold mb-2">قفل الشبكة مفعل</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {error}
            <br />
            تأكد من اتصالك بشبكة الواي فاي (Wi-Fi) الخاصة بالمدرسة أو المعلم.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full rounded-xl gap-2">
            إعادة محاولة الاتصال
          </Button>
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md w-full mx-4">
          <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">الاختبار غير موجود</h2>
          <p className="text-muted-foreground mb-4">تأكد من صحة رمز الاختبار أو أنه لا يزال نشطاً</p>
          <Button onClick={() => navigate("/")} className="rounded-xl">العودة للرئيسية</Button>
        </Card>
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 animate-fade-in relative overflow-hidden">
        {quiz.allowed_ip && (
          <div className="absolute top-0 right-0 left-0 bg-primary/5 py-1 px-4 text-center border-b border-primary/10">
             <span className="text-[10px] font-bold text-primary flex items-center justify-center gap-1">
               <ShieldAlert className="h-3 w-3" /> قفل الشبكة نشط: الدخول متاح فقط من شبكة المعلم
             </span>
          </div>
        )}
        
        <div className="text-center mb-8 pt-4">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          <p className="text-muted-foreground">{quiz.questions.length} سؤال</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {quiz.settings.timerEnabled && (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><Clock className="h-3.5 w-3.5" /> {quiz.settings.timerMinutes} دقيقة</Badge>
          )}
          {quiz.settings.shuffleQuestions && (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3"><Shuffle className="h-3.5 w-3.5" /> ترتيب عشوائي</Badge>
          )}
        </div>

        <div className="space-y-4">
          {hasRoster ? (
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="أدخل رقم الطالب" value={studentId} onChange={(e) => { setStudentId(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && startQuiz()} className="h-14 text-lg rounded-xl pr-10" />
            </div>
          ) : (
            <div className="relative">
              <UserCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="أدخل اسمك الكامل" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} onKeyDown={(e) => e.key === "Enter" && startQuiz()} className="h-14 text-lg rounded-xl pr-10" />
            </div>
          )}
          {error && <p className="text-sm font-bold text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10">{error}</p>}
          <Button onClick={startQuiz} className="w-full h-14 rounded-xl text-lg gap-2 shadow-lg hover:shadow-xl transition-all" disabled={hasRoster ? !studentId.trim() : !name.trim()}>
            ابدأ الاختبار
          </Button>
          <p className="text-[10px] text-center text-muted-foreground px-4 leading-relaxed">
            بمجرد النقر على زر البدء، سيتم تسجيل دخولك ولا يمكنك الدخول من متصفح آخر أو جهاز آخر حتى تنتهي.
          </p>
        </div>
      </Card>
    </div>
  );
}
