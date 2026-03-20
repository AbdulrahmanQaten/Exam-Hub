import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Users, ClipboardList, ArrowLeft, Library, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizCode, setQuizCode] = useState("");

  const handleJoinQuiz = () => {
    if (quizCode.trim()) {
      navigate(`/quiz/${quizCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero py-20 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-30" />
        <div className="container relative z-10 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              منصة اختبارات تعمل بدون إنترنت
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-primary-foreground md:text-6xl">
              أنشئ اختباراتك
              <br />
              <span className="opacity-80">بسهولة وسرعة</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-primary-foreground/80">
              أنشئ اختبارات اختيار من متعدد وصح وخطأ، شاركها مع طلابك عبر رمز بسيط، وتابع النتائج لحظياً
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/teacher")}
                className="gap-2 rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8 text-base font-bold shadow-lg"
              >
                <ClipboardList className="h-5 w-5" />
                لوحة المعلم
              </Button>
              {user ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/banks")}
                  className="gap-2 rounded-xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground px-8 text-base font-bold shadow-lg backdrop-blur-sm"
                >
                  <Library className="h-5 w-5" />
                  بنوك الأسئلة
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="gap-2 rounded-xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground px-8 text-base font-bold shadow-lg backdrop-blur-sm"
                >
                  <UserPlus className="h-5 w-5" />
                  سجل للحصول على الميزات
                </Button>
              )}
            </div>

            {/* Student Entry - Single quiz code input */}
            <div className="mx-auto mt-8 max-w-md">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="أدخل رمز الاختبار"
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinQuiz()}
                  className="h-12 rounded-xl border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/50 text-center text-lg tracking-widest"
                />
                <Button
                  size="lg"
                  onClick={handleJoinQuiz}
                  variant="outline"
                  className="h-12 rounded-xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-primary/5 py-16 border-y border-primary/10 mt-12">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">لماذا تُنشئ حساباً معنا؟</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
            وفر وقتك واحتفظ بأسئلتك. عند إنشاء حساب (باسم مستخدم وكلمة مرور فقط، دون إيميل!)، ستحصل مجاناً على ميزات حصرية مصممة للمعلمين:
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto text-start">
            <div className="bg-background p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
              <Library className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-2">بنوك الأسئلة المخصصة</h3>
              <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg mt-2">أنشئ بنوك أسئلة وصنفها في وحدات، واحتفظ بأسئلتك للرجوع إليها مستقبلاً وتكوين الاختبارات منها بنقرة زر وبسحب عشوائي.</p>
            </div>
            <div className="bg-background p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
              <ClipboardList className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-2">حفظ اختباراتك للأبد</h3>
              <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg mt-2">اربط جميع اختباراتك السابقة والقادمة بحسابك الخاص للوصول إليها من أي جهاز، وتعديلها أو مشاهدة نتائجها بأمان تام في مكان واحد.</p>
            </div>
          </div>
          {!user && (
            <div className="mt-10">
              <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 rounded-xl h-14 px-8 text-lg font-bold shadow-lg mx-auto">
                <UserPlus className="h-6 w-6" />
                إنشاء حساب مجاني أو تسجيل الدخول
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">كيف يعمل؟</h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-2xl border text-center hover:border-primary/50 transition-colors shadow-sm">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ClipboardList className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">1. أنشئ اختبارك</h3>
              <p className="text-muted-foreground">قم بإضافة أسئلة اختيار من متعدد أو صح وخطأ، أو استوردها بنقرة واحدة من بنك أسئلتك الخاص.</p>
            </div>
            <div className="bg-card p-8 rounded-2xl border text-center hover:border-primary/50 transition-colors shadow-sm">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">2. شارك الرمز</h3>
              <p className="text-muted-foreground">احصل على رمز سري للاختبار وشاركه مع طلابك ليدخلوا فوراً دون الحاجة لتسجيل حساب.</p>
            </div>
            <div className="bg-card p-8 rounded-2xl border text-center hover:border-primary/50 transition-colors shadow-sm">
              <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-xl mb-3">3. تتبع النتائج</h3>
              <p className="text-muted-foreground">شاهد درجات الطلاب وإجاباتهم بشكل لحظي من خلال لوحة تحكم بسيطة وشاملة.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="bg-muted/30 py-20 border-t">
        <div className="container max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold">من نحن؟</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            نحن دورية التميز <strong>Exam Hub</strong>، صُممنا المنصة بشغف لخدمة المعلمين والطلاب في بيئة تعليمية ذكية وخالية من التعقيد. هدفنا الأساسي هو توفير أداة قوية وسريعة لبناء الاختبارات وإدارتها دون الحاجة لخطوات تسجيل مطولة للطلاب أو إعدادات معقدة.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center p-1 bg-background rounded-2xl border gap-2">
            <span className="px-4 py-2 text-sm font-medium">تطوير مبني على احتياجاتكم</span>
            <span className="px-4 py-2 text-sm font-medium border-r sm:border-y-0 border-y">سرعة وأداء فائقان</span>
            <span className="px-4 py-2 text-sm font-medium border-r">بيئة عربية وخاصة</span>
          </div>
        </div>
      </section>
    </div>
  );
}
