import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Users, ClipboardList, ArrowLeft } from "lucide-react";
import teacherHero from "@/assets/teacher-hero.jpg";
import studentsHero from "@/assets/students-hero.jpg";

export default function Index() {
  const navigate = useNavigate();
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
                  className="h-12 rounded-xl border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">كيف يعمل؟</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<ClipboardList className="h-8 w-8" />}
              title="أنشئ اختباراً"
              description="أضف أسئلة اختيار من متعدد وصح وخطأ مع مؤقت وتوزيع عشوائي"
              image={teacherHero}
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="شارك الرمز"
              description="شارك رمز الاختبار مع طلابك، يدخلون اسمهم ويبدؤون مباشرة"
              image={studentsHero}
            />
            <FeatureCard
              icon={<GraduationCap className="h-8 w-8" />}
              title="تابع النتائج"
              description="شاهد نتائج كل طالب وإحصائيات الاختبار في لوحة تحكم شاملة"
              gradient
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  image,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  image?: string;
  gradient?: boolean;
}) {
  return (
    <div className="group glass-card rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
      {image && (
        <div className="h-48 overflow-hidden">
          <img src={image} alt={title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        </div>
      )}
      {gradient && (
        <div className="h-48 gradient-hero flex items-center justify-center">
          <GraduationCap className="h-20 w-20 text-primary-foreground/30" />
        </div>
      )}
      <div className="p-6">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {icon}
        </div>
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
