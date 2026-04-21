import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, ClipboardList, BookOpen, ShieldCheck, 
  BarChart, ArrowRight, CheckCircle2, CopyPlus, ImageIcon, Settings, 
  FileSpreadsheet, Target, Download
} from "lucide-react";

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/20 py-12">
      <div className="container max-w-5xl">
        
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate("/")}>
          <ArrowRight className="h-4 w-4" /> العودة للرئيسية
        </Button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold mb-4 text-primary">دليل الاستخدام الشامل</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            تعرف على كيف صُممت دائرية <strong>Exam Hub</strong> لتسهيل حياة المعلم والطالب بأبسط وأسرع الطرق دون تعقيدات تسجيل مطولة.
          </p>
          
          <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-center flex flex-col sm:flex-row items-center justify-center gap-3 max-w-3xl mx-auto shadow-sm">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="font-bold text-lg">أهم ميزة لدينا: إيميلك ليس مطلوباً للمعلم، والطالب لا يحتاج لأي حساب إطلاقاً!</p>
          </div>
        </div>

        <Tabs defaultValue="teacher" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 h-12">
            <TabsTrigger value="teacher" className="text-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">أنا معلم</TabsTrigger>
            <TabsTrigger value="student" className="text-lg font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">أنا طالب</TabsTrigger>
          </TabsList>

          <TabsContent value="teacher" className="space-y-8 animate-fade-in">
            <Card className="p-8 border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-lg">
                  <ClipboardList className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">رحلة المعلم في دقيقة</h2>
                  <p className="text-muted-foreground">صممنا المنصة لتوفر وقتك وجهدك في إعداد وتصحيح الاختبارات.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <FeatureCard 
                  icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
                  title="تسجيل سريع وآمن"
                  desc="لا نطلب بريداً إلكترونياً أو معلومات معقدة. اختر اسم مستخدم (باللغة الإنجليزية) وكلمة مرور فقط، وستُحفظ جميع اختباراتك وبنوك أسئلتك على هذا الحساب للأبد."
                />
                
                <FeatureCard 
                  icon={<BookOpen className="h-6 w-6 text-blue-500" />}
                  title="بنوك الأسئلة"
                  desc="يمكنك إنشاء وحدات مختلفة لكل منهج وإضافة الأسئلة لها. استورد هذه الأسئلة لاحقاً في أي اختبار جديد يتم إنشاؤه بضغطة زر. يدعم النظام تصنيف الأسئلة وتحديد درجات الصعوبة."
                />

                <FeatureCard 
                  icon={<Settings className="h-6 w-6 text-purple-500" />}
                  title="إعدادات اختبار متناغمة"
                  desc="تحكم تام في اختبارك: أضف مؤقت زمني، فعل خلط ترتيب الأسئلة أو الإجابات تلقائياً للطلاب، وتحكم في إظهار الحل الصحيح للطالب بعد التسليم أو إخفائه."
                />

                <FeatureCard 
                  icon={<ImageIcon className="h-6 w-6 text-orange-500" />}
                  title="دعم الوسائط"
                  desc="هل سؤالك يعتمد على شكل هندسي أو خريطة؟ يمكنك الآن إرفاق صورة مع السؤال بكل بساطة لتظهر للطالب بحجم مناسب داخل ورقة الاختبار."
                />
                
                <FeatureCard 
                  icon={<FileSpreadsheet className="h-6 w-6 text-teal-500" />}
                  title="قوائم الطلاب المحصورة"
                  desc="إذا أردت حصر الاختبار على طلاب فصل معين ومنع دخول الغرباء، يمكنك لصق قائمة بأسماء الطلاب (من الإكسل مثلاً)، ولن يتمكن غيرهم من الدخول للاختبار."
                />

                <FeatureCard 
                  icon={<Download className="h-6 w-6 text-green-500" />}
                  title="استيراد الأسئلة من Excel"
                  desc="يمكنك الآن تجهيز اختبارك بالكامل في ملف Excel ورفعه بضغطة زر واحدة. نوفر لك قالباً جاهزاً يحتوي على أنواع الأسئلة (اختيار من متعدد وصح أو خطأ) لتسهيل العملية."
                />

                <FeatureCard 
                  icon={<BarChart className="h-6 w-6 text-red-500" />}
                  title="النتائج والتحليلات"
                  desc="بمجرد إرسال الطالب لإجابته، تظهر نتيجته لديك فوراً! احصل على تحليل فوري يبين لك أسهل وأصعب سؤال في الاختبار، ونسب النجاح، ومراجعة ورقة كل طالب على حدة بكبسة زر."
                />
                
                <FeatureCard 
                  icon={<Target className="h-6 w-6 text-indigo-500" />}
                  title="نظام مكافحة الغش الصارم"
                  desc="تتيح المنصة أداة حساسة لاستشعار خروج الطالب من متصفح الاختبار إلى نوافذ أخرى بهدف البحث. بعد 3 إنذارات، يتم سحب الورقة آلياً وتسليمها كحالة غش بـ صفر."
                />

                <FeatureCard 
                  icon={<CopyPlus className="h-6 w-6 text-yellow-500" />}
                  title="الاستنساخ والمراجعة"
                  desc="استنسخ اختبارات السنة الماضية بنقرات قليلة. سيتم توليد رمز دخول (Code) جديد مع الاحتفاظ بكامل الأسئلة والصور المحفوظة والبدء بها كنسخة طازجة."
                />
              </div>

              <div className="mt-10 text-center">
                <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 rounded-xl text-lg h-14 px-8 shadow-xl">
                  جرب كمعلم الآن
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="student" className="space-y-8 animate-fade-in">
            <Card className="p-8 border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-secondary text-secondary-foreground rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">رحلة الطالب في دقيقة</h2>
                  <p className="text-muted-foreground">أسرع تجربة اختباريّة على الإطلاق.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <FeatureCard 
                  icon={<CheckCircle2 className="h-6 w-6 text-success" />}
                  title="بدون حسابات أو تعقيد"
                  desc="فقط افتح الصفحة الرئيسية، أدخل الرمز السري الذي أعطاك إياه المعلم، واكتب اسمك واسم العائلة لتبدأ الاختبار فوراً."
                />
                
                <FeatureCard 
                  icon={<Target className="h-6 w-6 text-primary" />}
                  title="واجهة تفاعلية سلسة"
                  desc="تحتوي الأسئلة على أزرار واضحة وخيارات قابلة للقراءة بشكل مريح جداً من الهاتف الذكي وكذلك الكمبيوتر. لا تشتيت للتركيز."
                />

                <FeatureCard 
                  icon={<ShieldCheck className="h-6 w-6 text-warning" />}
                  title="إياك ومغادرة المتصفح!"
                  desc="احرص على البقاء داخل صفحة الاختبار، إذا حاولت فتح تطبيق آخر أو علامة تبويب أخرى سيقوم النظام بإنذارك فوراً وسيسحب ورقتك إن تماديت."
                />
                
                <FeatureCard 
                  icon={<BarChart className="h-6 w-6 text-accent" />}
                  title="نتائج فورية وشفافة"
                  desc="إن تكرّم المعلم وفعل ميزة إظهار النتائج، ستتمكن بمجرد النقر على إنهاء من رؤية درجتك ومعرفة الإجابات الصحيحة والخاطئة على الفور."
                />
              </div>

              <div className="mt-10 text-center">
                <Button size="lg" variant="secondary" onClick={() => navigate("/")} className="gap-2 rounded-xl text-lg h-14 px-8 shadow-xl">
                  لدي رمز اختبار وأريد الدخول
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="shrink-0 h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
