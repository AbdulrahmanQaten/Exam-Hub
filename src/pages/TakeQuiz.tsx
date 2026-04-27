import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, ArrowLeft, ArrowRight, Send, CheckCircle2, AlertTriangle, List, PanelRightClose, RefreshCw } from "lucide-react";
import {
  getQuizById, getQuizByCode, submitResult, shuffleArray, addActiveStudent, removeActiveStudent,
  type Quiz, type QuizQuestion,
} from "@/lib/quizStore";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TakeQuiz() {
  const { code } = useParams();
  usePageTitle("حل الاختبار الجاري");
  const navigate = useNavigate();
  const location = useLocation();
  const { studentName, quizId, studentId } = (location.state || {}) as { studentName?: string; quizId?: string; studentId?: string };

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [preparedQuestions, setPreparedQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); toast.success("تم استعادة الاتصال بالإنترنت"); };
    const handleOffline = () => { setIsOffline(true); toast.warning("أنت تعمل الآن في وضع الأوفلاين. إجاباتك تُحفظ محلياً."); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  // Save to local storage
  useEffect(() => {
    if (quizId && studentName) {
      const storageKey = `quiz_progress_${quizId}_${studentName}`;
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentIndex, timeLeft }));
    }
  }, [answers, currentIndex, timeLeft, quizId, studentName]);

  // Load from local storage
  useEffect(() => {
    if (quizId && studentName) {
      const storageKey = `quiz_progress_${quizId}_${studentName}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { answers: sAnswers, currentIndex: sIndex, timeLeft: sTime } = JSON.parse(saved);
        if (Object.keys(sAnswers).length > 0) {
           setAnswers(sAnswers);
           setCurrentIndex(sIndex);
           if (sTime) setTimeLeft(sTime);
           toast.info("تم استعادة تقدمك في الاختبار");
        }
      }
    }
  }, [quizId, studentName]);

  const [startTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [showNav, setShowNav] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const hasSubmittedRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});
  const violationsRef = useRef(0);
  const lastViolationTime = useRef(0);

  // Keep answersRef in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (!studentName || !quizId) {
      navigate(`/quiz/${code}`);
      return;
    }
    if (!code) return;
    getQuizByCode(code).then((found) => {
      if (!found) { navigate("/"); return; }
      setQuiz(found);
      
      let questions = [...found.questions];
      if (found.settings.shuffleQuestions) questions = shuffleArray(questions);
      if (found.settings.shuffleOptions) {
        questions = questions.map((q) => ({
          ...q,
          options: q.type === "truefalse" ? q.options : shuffleArray(q.options),
        }));
      }
      setPreparedQuestions(questions);
      if (found.settings.timerEnabled) setTimeLeft(found.settings.timerMinutes * 60);
    });
  }, [quizId, studentName, studentId, code, navigate]);

  const handleSubmit = useCallback(async (forceZero = false) => {
    if (!quiz || !studentName || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const finalAnswers = forceZero ? { _violations: violationsRef.current.toString() } : { ...answersRef.current, _violations: violationsRef.current.toString() };
    try {
      const result = await submitResult(quiz.id, studentName, finalAnswers, timeTaken, studentId);
      
      // التنظيف: حذف الطالب من قائمة النشطين فور التسليم بنجاح
      await removeActiveStudent(quiz.id, studentName);
      
      const storageKey = `quiz_progress_${quiz.id}_${studentName}`;
      localStorage.removeItem(storageKey);

      navigate(`/quiz/${code}/complete`, {
        state: { 
          score: result.score, 
          total: result.totalQuestions, 
          studentName, 
          timeTaken, 
          wasForceSubmitted: forceZero,
          showFeedback: quiz.settings.showFeedback,
          questions: result.questions || preparedQuestions,
          userAnswers: finalAnswers
        },
      });
    } catch (err) {
      console.error(err);
      hasSubmittedRef.current = false;
    }
  }, [quiz, studentName, studentId, startTime, code, navigate, preparedQuestions]);

  // Cleanup session if tab is closed without submission
  useEffect(() => {
    return () => {
      if (quizId && studentName && !hasSubmittedRef.current) {
        removeActiveStudent(quizId, studentName).catch(() => {});
      }
    };
  }, [quizId, studentName]);

  // Warn on page close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasSubmittedRef.current) { e.preventDefault(); e.returnValue = "سيتم إلغاء اختبارك!"; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleLeave = () => {
      if (hasSubmittedRef.current) return;
      
      const now = Date.now();
      if (now - lastViolationTime.current > 2000) {
        violationsRef.current += 1;
        lastViolationTime.current = now;
        setShowCheatWarning(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleLeave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleLeave);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleLeave);
    };
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (!hasSubmittedRef.current) { 
        e.preventDefault(); 
        window.history.pushState(null, "", window.location.href); 
        violationsRef.current += 1;
        toast.error("🚨 محاولة خروج غير مصرح بها! تم تسجيل المحاولة.", { duration: 5000, position: 'top-center' });
        setShowExitWarning(true); 
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const trySubmit = () => {
    const unansweredCount = preparedQuestions.length - Object.keys(answers).length;
    if (unansweredCount > 0) setShowSubmitWarning(true);
    else handleSubmit();
  };

  useEffect(() => {
    if (!quiz?.settings.timerEnabled) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 61) {
          toast.warning("تنبيه: تبقى دقيقة واحدة فقط على انتهاء الاختبار!", { duration: 6000 });
        }
        if (prev <= 1) { handleSubmit(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quiz, handleSubmit]);

  const goTo = (index: number) => {
    if (index === currentIndex || isAnimating) return;
    setSlideDirection(index > currentIndex ? "left" : "right");
    setIsAnimating(true);
    
    // التمرير لأعلى الصفحة عند الانتقال لسؤال جديد
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => { 
      setCurrentIndex(index); 
      setIsAnimating(false); 
    }, 150);
  };

  // دعم التنقل عبر لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, answers]); // نكتفي بـ currentIndex و answers كاعتماديات

  const goNext = () => { if (currentIndex < preparedQuestions.length - 1) goTo(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };

  if (!quiz || preparedQuestions.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse-soft text-muted-foreground">جارٍ التحميل...</div>
      </div>
    );
  }

  const currentQ = preparedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / preparedQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = preparedQuestions.length - answeredCount;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isTimeLow = quiz.settings.timerEnabled && timeLeft <= 60;

  return (
    <div className="min-h-[calc(100vh-4rem)]" dir="rtl">
      <AlertDialog open={showSubmitWarning} onOpenChange={setShowSubmitWarning}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> أسئلة غير مجابة</AlertDialogTitle>
            <AlertDialogDescription>
              لديك {unansweredCount} {unansweredCount === 1 ? "سؤال غير مجاب" : unansweredCount === 2 ? "سؤالان غير مجابين" : "أسئلة غير مجابة"}. هل تريد إنهاء الاختبار على أي حال؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>العودة للأسئلة</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">إنهاء الاختبار</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> تحذير: لا تغادر الاختبار!</AlertDialogTitle>
            <AlertDialogDescription>إذا غادرت هذه الصفحة سيتم إلغاء اختبارك وتسجيل النتيجة صفر. هل تريد المغادرة؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>متابعة الاختبار</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">مغادرة (صفر)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCheatWarning} onOpenChange={setShowCheatWarning}>
        <AlertDialogContent className="text-right border-destructive/30" dir="rtl">
          <AlertDialogHeader className="text-right sm:text-right">
            <AlertDialogTitle className="flex items-center gap-3 text-destructive text-xl"><AlertTriangle className="h-8 w-8 animate-pulse" /> تحذير أمني صارم!</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium mt-3 leading-relaxed text-foreground">
              لقد قمت بمغادرة شاشة الاختبار أو فتح تطبيق آخر.
              <br /><br />
              <span className="text-destructive font-bold text-lg">تم تسجيل محاولة خروجك وإرسالها لمعلمك!</span>
              <br /><br />يرجى البقاء في هذه الصفحة وعدم فتح تطبيقات أخرى حتى يكتمل تسليم إجاباتك بنجاح.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold w-full sm:w-auto h-12 text-md border-none">أتعهد بعدم المغادرة مجدداً</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="border-b bg-card sticky top-16 z-40">
        <div className="container py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">السؤال {currentIndex + 1} من {preparedQuestions.length}</span>
            <div className="flex items-center gap-2">
              {isOffline && (
                <Badge variant="outline" className="gap-1.5 text-orange-600 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-3.5 w-3.5" /> أوفلاين
                </Badge>
              )}
              {isSyncing && (
                <Badge variant="outline" className="gap-1.5 text-blue-600 border-blue-200 bg-blue-50">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> مزامنة...
                </Badge>
              )}
              <Button variant={showNav ? "default" : "ghost"} size="sm" onClick={() => setShowNav(!showNav)} className="gap-1.5 h-8">
                {showNav ? <PanelRightClose className="h-4 w-4" /> : <List className="h-4 w-4" />}
                <span className="hidden sm:inline">قائمة الأسئلة</span>
              </Button>
              <Badge variant="outline">{answeredCount}/{preparedQuestions.length} مُجاب</Badge>
              {quiz.settings.timerEnabled && (
                <Badge variant={isTimeLow ? "destructive" : "outline"} className={`gap-1.5 font-mono ${isTimeLow ? "animate-pulse-soft" : ""}`}>
                  <Clock className="h-3.5 w-3.5" /> {formatTime(timeLeft)}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="container py-6">
        <div className={`flex gap-6 ${showNav ? "" : "justify-center"}`}>
          {showNav && (
            <div className="hidden md:block w-72 shrink-0">
              <Card className="sticky top-36 overflow-hidden">
                <div className="p-3 border-b bg-muted/50">
                  <h3 className="text-sm font-bold flex items-center gap-2"><List className="h-4 w-4" /> قائمة الأسئلة</h3>
                  <p className="text-xs text-muted-foreground mt-1">{answeredCount} من {preparedQuestions.length} مُجاب</p>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-2 space-y-1">
                    {preparedQuestions.map((q, i) => {
                      const isAnswered = !!answers[q.id];
                      const isCurrent = i === currentIndex;
                      return (
                        <button key={q.id} onClick={() => goTo(i)} className={`w-full text-start rounded-lg p-2.5 transition-all flex items-start gap-2.5 text-sm ${isCurrent ? "bg-primary/10 border border-primary/30" : isAnswered ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/80"}`}>
                          <span className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${isCurrent ? "bg-primary text-primary-foreground" : isAnswered ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                            {isAnswered ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                          </span>
                          <span className={`line-clamp-2 leading-relaxed ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}>{q.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          )}

          {showNav && (
            <div className="fixed inset-0 top-[8.5rem] z-30 bg-background/95 backdrop-blur-sm md:hidden overflow-auto pb-20">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold">قائمة الأسئلة ({answeredCount}/{preparedQuestions.length} مُجاب)</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNav(false)}>إغلاق</Button>
                </div>
                {preparedQuestions.map((q, i) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = i === currentIndex;
                  return (
                    <button key={q.id} onClick={() => { goTo(i); setShowNav(false); }} className={`w-full text-start rounded-xl border-2 p-3 transition-all flex items-start gap-3 ${isCurrent ? "border-primary bg-primary/5" : isAnswered ? "border-success/30 bg-success/5" : "border-border"}`}>
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isCurrent ? "bg-primary text-primary-foreground" : isAnswered ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                        {isAnswered ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className={`line-clamp-2 text-sm leading-relaxed ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>{q.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={`w-full ${showNav ? "max-w-2xl" : "max-w-2xl"}`}>
            <div 
              className={`transition-all duration-200 ease-in-out min-h-[350px] sm:min-h-[400px] ${
                isAnimating 
                  ? slideDirection === "left" ? "opacity-0 -translate-x-4" : "opacity-0 translate-x-4" 
                  : "opacity-100 translate-x-0"
              }`}
            >
              <Card className="p-4 sm:p-8 shadow-md border-2 border-muted/50" key={currentQ.id}>
                <div className="mb-6">
                  <Badge variant="secondary" className="mb-3 px-3 py-1 rounded-lg">
                    {currentQ.type === "mcq" ? "اختيار من متعدد" : "صح أو خطأ"}
                  </Badge>
                  <h2 className="text-xl md:text-2xl font-bold mb-6 leading-relaxed text-foreground">
                    {currentQ.text}
                  </h2>
                  
                  {currentQ.imageUrl && (
                    <div className="mb-8 flex justify-center animate-fade-in relative group">
                      <div className="relative overflow-hidden rounded-2xl border-2 border-muted bg-muted/5 p-1 transition-all group-hover:border-primary/30">
                        <img 
                          src={currentQ.imageUrl} 
                          alt="مرفق توضيحي للسؤال" 
                          className="max-h-64 md:max-h-80 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {currentQ.options.map((opt, i) => {
                    const selected = answers[currentQ.id] === opt.id;
                    return (
                      <button 
                        key={opt.id} 
                        onClick={() => setAnswers({ ...answers, [currentQ.id]: opt.id })} 
                        className={`w-full text-start rounded-xl border-2 p-4 transition-all flex items-center gap-3 active:scale-[0.98] ${
                          selected 
                            ? "border-primary bg-primary/5 ring-4 ring-primary/5" 
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {selected ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-base leading-snug ${selected ? "font-bold" : "font-medium"}`}>
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8 pb-10">
              <Button 
                variant="outline" 
                onClick={goPrev} 
                disabled={currentIndex === 0} 
                className="gap-2 rounded-xl h-12 sm:h-14 font-bold border-2 hover:bg-muted"
              >
                <ArrowRight className="h-5 w-5" /> 
                <span className="hidden xs:inline">السابق</span>
              </Button>
              
              <Button 
                onClick={trySubmit} 
                variant={answeredCount === preparedQuestions.length ? "default" : "outline"} 
                className={`gap-2 rounded-xl h-12 sm:h-14 font-bold border-2 ${
                  answeredCount === preparedQuestions.length 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" 
                    : "border-primary/20 text-primary hover:bg-primary/5"
                }`}
              >
                <Send className="h-4 w-4" /> 
                <span>إنهاء</span>
              </Button>

              <Button 
                onClick={goNext} 
                disabled={currentIndex === preparedQuestions.length - 1 || !answers[currentQ.id]} 
                className="gap-2 rounded-xl h-12 sm:h-14 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                <span className="hidden xs:inline">التالي</span> 
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
