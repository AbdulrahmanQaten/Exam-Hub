import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, ArrowRight, CheckCircle2, Circle, Settings2, Image as ImageIcon, Trash2, FileText, Type, Layout } from "lucide-react";
import { getQuizById, type Quiz, type Question } from "@/lib/quizStore";

export default function PrintQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  // Customization States
  const [showAnswers, setShowAnswers] = useState(false);
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [fontFamily, setFontFamily] = useState("'Cairo', sans-serif");
  const [fontSize, setFontSize] = useState("text-lg");
  const [subjectName, setSubjectName] = useState("___________________");
  const [teacherName, setTeacherName] = useState("___________________");
  const [headerTitle, setHeaderTitle] = useState("");
  const [logoRightUrl, setLogoRightUrl] = useState<string | null>(null);
  const [logoLeftUrl, setLogoLeftUrl] = useState<string | null>(null);
  const [numForms, setNumForms] = useState("1");
  const [forms, setForms] = useState<{name: string, questions: Question[]}[]>([]);

  // File Input Refs for local image upload
  const rightLogoRef = useRef<HTMLInputElement>(null);
  const leftLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quizId) {
      getQuizById(quizId).then((data) => {
        if (data) {
          setQuiz(data);
          setHeaderTitle(data.title);
        } else navigate("/teacher");
      });
    }
  }, [quizId, navigate]);

  // Generate Forms when numForms or quiz changes
  useEffect(() => {
    if (quiz) {
      const newForms = [];
      const count = parseInt(numForms) || 1;
      const formNames = ["أ", "ب", "ج", "د", "هـ", "و", "ز"];
      
      for(let i=0; i<count; i++) {
        let qs = [...quiz.questions];
        if (count > 1 && i > 0) {
          // Shuffle questions for subsequent forms to prevent cheating
          qs = qs.sort(() => Math.random() - 0.5);
          // Shuffle options if it's MCQ
          qs = qs.map(q => {
            if (q.type === 'mcq') {
              return {...q, options: [...q.options].sort(() => Math.random() - 0.5)};
            }
            return q;
          });
        }
        newForms.push({ name: formNames[i % formNames.length], questions: qs });
      }
      setForms(newForms);
    }
  }, [quiz, numForms]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'right' | 'left') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (side === 'right') setLogoRightUrl(url);
      else setLogoLeftUrl(url);
    }
    // reset input
    if (e.target) e.target.value = '';
  };

  const removeLogo = (side: 'right' | 'left') => {
    if (side === 'right') {
      if (logoRightUrl) URL.revokeObjectURL(logoRightUrl);
      setLogoRightUrl(null);
    } else {
      if (logoLeftUrl) URL.revokeObjectURL(logoLeftUrl);
      setLogoLeftUrl(null);
    }
  };

  if (!quiz) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100/50 flex flex-col md:flex-row" dir="rtl">
      
      {/* Settings Sidebar (Hidden on print) */}
      <div className="print:hidden flex-shrink-0 w-full md:w-80 lg:w-[380px] bg-white border-l shadow-2xl z-40 flex flex-col h-auto md:h-[calc(100vh-4rem)] md:sticky md:top-16">
        <div className="p-5 border-b bg-gradient-to-l from-primary/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/teacher")} className="h-9 w-9 rounded-full shadow-sm hover:bg-white/80">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h2 className="font-bold text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /> استديو الطباعة</h2>
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-primary shadow-md hover:shadow-lg transition-all rounded-full px-6">
            <Printer className="h-4 w-4" /> طباعة ألان
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="header" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="header" className="rounded-lg text-xs md:text-sm font-bold"><Layout className="h-4 w-4 ml-1 shrink-0" /> الترويسة</TabsTrigger>
              <TabsTrigger value="content" className="rounded-lg text-xs md:text-sm font-bold"><FileText className="h-4 w-4 ml-1 shrink-0" /> النماذج</TabsTrigger>
              <TabsTrigger value="style" className="rounded-lg text-xs md:text-sm font-bold"><Type className="h-4 w-4 ml-1 shrink-0" /> التنسيق</TabsTrigger>
            </TabsList>
            
            <TabsContent value="header" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان الاختبار الرئيسي</Label>
                  <Input value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} className="bg-gray-50 bg-opacity-50 font-bold focus:bg-white focus:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label>طبيعة المادة</Label>
                  <Input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="مثال: رياضيات مجردة" className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>اسم المعلم أو المحاضر</Label>
                  <Input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="مثال: أ. أحمد" className="bg-gray-50" />
                </div>

                <div className="pt-4 border-t">
                  <Label className="block mb-3 font-bold text-primary">شعارات ورقة الاختبار</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-dashed">
                      <Label className="text-xs text-muted-foreground block text-center font-bold">شعار اليمين</Label>
                      <input type="file" ref={rightLogoRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'right')} />
                      {logoRightUrl ? (
                        <div className="relative group rounded aspect-square flex flex-col items-center justify-center p-1 bg-white shadow-sm">
                          <img src={logoRightUrl} className="max-h-full max-w-full object-contain" />
                          <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md scale-90 group-hover:scale-100 transition-transform" onClick={() => removeLogo('right')}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full text-xs h-16 bg-white hover:bg-gray-100 border-dashed" onClick={() => rightLogoRef.current?.click()}><ImageIcon className="h-4 w-4 ml-1" /> إرفاق</Button>
                      )}
                    </div>

                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-dashed">
                      <Label className="text-xs text-muted-foreground block text-center font-bold">شعار اليسار</Label>
                      <input type="file" ref={leftLogoRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'left')} />
                      {logoLeftUrl ? (
                        <div className="relative group rounded aspect-square flex flex-col items-center justify-center p-1 bg-white shadow-sm">
                          <img src={logoLeftUrl} className="max-h-full max-w-full object-contain" />
                          <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md scale-90 group-hover:scale-100 transition-transform" onClick={() => removeLogo('left')}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full text-xs h-16 bg-white hover:bg-gray-100 border-dashed" onClick={() => leftLogoRef.current?.click()}><ImageIcon className="h-4 w-4 ml-1" /> إرفاق</Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 text-center leading-relaxed">
                    تبقى الشعارات محفوظة في متصفحك بشكل محلي للخصوصية والسرعة المطلقة. في حال لم ترفع شعاراً، سيتمدد النص تلقائياً لملء الفراغ.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer font-bold text-primary">إظهار الإجابات المحلولة</Label>
                    <p className="text-[11px] text-muted-foreground">مفيد لطباعة نسخة للمعلم (Model Answer)</p>
                  </div>
                  <Switch checked={showAnswers} onCheckedChange={setShowAnswers} />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                  <div className="space-y-0.5">
                    <Label className="cursor-pointer font-bold">بيانات التلميذ أعلى الورقة</Label>
                    <p className="text-[11px] text-muted-foreground">الاسم، رقم الجلوس، اسم الفصل..</p>
                  </div>
                  <Switch checked={showStudentInfo} onCheckedChange={setShowStudentInfo} />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="font-bold flex items-center gap-2">عدد النماذج المختلفة (A, B, C...)</Label>
                  <Select value={numForms} onValueChange={setNumForms}>
                    <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">نموذج واحد (تخطيط أساسي)</SelectItem>
                      <SelectItem value="2">إنشاء نموذجين عشوائيين</SelectItem>
                      <SelectItem value="3">إنشاء 3 نماذج عشوائية</SelectItem>
                      <SelectItem value="4">إنشاء 4 نماذج عشوائية</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground leading-relaxed p-2 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                    <span className="font-bold">مضاد الغش: </span> 
                    عند اختيار أكثر من نموذج، سيقوم النظام تلقائياً بتنويع أوراق الاختبار وبعثرة ترتيب الأسئلة والخيارات لإنتاج نسخ مختلفة كلياً لكل نموذج.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="font-bold">نوع واسم الخط</Label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="'Cairo', sans-serif">Cairo (عصري ومقروء - مُوصى به)</SelectItem>
                      <SelectItem value="'Tajawal', sans-serif">Tajawal (دائري وناعم)</SelectItem>
                      <SelectItem value="'Arial', sans-serif">Arial (تقليدي وأساسي)</SelectItem>
                      <SelectItem value="'Times New Roman', serif">Times New Roman (أكاديمي ورسمي)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-bold">حجم نص الأسئلة</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-sm">دقيق (أصغر حجم)</SelectItem>
                      <SelectItem value="text-base">صغير (لتوفير الأوراق)</SelectItem>
                      <SelectItem value="text-lg">متوسط (ينصح به للمدارس)</SelectItem>
                      <SelectItem value="text-xl">كبير وواضح (للفئات الخاصة)</SelectItem>
                      <SelectItem value="text-2xl">ضخم (للابتدائية)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="flex-1 overflow-auto w-full p-4 sm:p-8 flex flex-col items-center print:block print:p-0 print:overflow-visible">
        
        {/* Responsive wrapper to allow scrolling horizontally on very small mobiles instead of squishing the A4 */}
        <div className="w-full max-w-full overflow-x-auto pb-10 print:pb-0 print:overflow-visible flex flex-col items-center gap-10">
          {forms.map((form, formIndex) => (
            <div 
              key={formIndex} 
              className="print:m-0 print:p-0 bg-white text-black min-h-[297mm] w-[210mm] shrink-0 shadow-2xl print:shadow-none p-10 md:p-12 break-after-page relative print:border-none border border-gray-300 mx-auto" 
              style={{ fontFamily }}
            >
              {/* Header Section */}
              <div className="flex border-b-[3px] border-black pb-5 mb-8 relative justify-between items-center text-center">
                
                {/* Right Logo */}
                {logoRightUrl ? (
                  <div className="w-[100px] h-[100px] flex items-center justify-center shrink-0">
                    <img src={logoRightUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-[100px] h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs print:hidden shrink-0">شعار اليمين</div>
                )}

                {/* Title & Info */}
                <div className="flex-1 px-4 flex flex-col justify-center min-h-[100px]">
                  <h2 className="text-3xl font-black mb-3 uppercase leading-tight">{headerTitle}</h2>
                  <div className="flex justify-center gap-8 font-bold text-lg">
                    {subjectName && <span>المادة: {subjectName}</span>}
                    {teacherName && <span>المعلم: {teacherName}</span>}
                  </div>
                  {forms.length > 1 && (
                    <div className="mt-4 flex justify-center">
                      <div className="inline-block border-[3px] border-black rounded-lg px-6 py-1 text-xl font-black bg-gray-100 print:bg-gray-100 print:-webkit-print-color-adjust-exact print:color-adjust-exact">
                        نموذج ({form.name})
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Logo */}
                {logoLeftUrl ? (
                  <div className="w-[100px] h-[100px] flex items-center justify-center shrink-0">
                    <img src={logoLeftUrl} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-[100px] h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs print:hidden shrink-0">شعار اليسار</div>
                )}
              </div>

              {/* Student Data Fields */}
              {showStudentInfo && (
                <div className={`grid grid-cols-2 gap-y-6 gap-x-8 mb-10 ${fontSize === 'text-2xl' ? 'text-xl' : 'text-lg'} font-bold p-5 border-[3px] border-black rounded-2xl bg-gray-50 print:bg-gray-50 print:-webkit-print-color-adjust-exact`}>
                  <div className="flex items-end">
                    <span className="shrink-0">اسم الطالب: </span>
                    <span className="flex-1 border-b-2 border-dotted border-black/60 ml-2"></span>
                  </div>
                  <div className="flex items-end">
                    <span className="shrink-0">رقم الجلوس: </span>
                    <span className="flex-1 border-b-2 border-dotted border-black/60 ml-2"></span>
                  </div>
                  <div className="flex items-end">
                    <span className="shrink-0">الصف / الشُعبة: </span>
                    <span className="flex-1 border-b-2 border-dotted border-black/60 ml-2"></span>
                  </div>
                  <div className="flex items-end">
                    <span className="shrink-0">الدرجة الكلية: </span>
                    <span className="w-24 border-b-2 border-solid border-black ml-2 text-center font-mono text-xl tracking-widest">&nbsp; / {quiz.questions.length}</span>
                  </div>
                </div>
              )}

              <div className={`mb-8 font-black ${fontSize} underline underline-offset-8 decoration-2 flex items-center gap-2`}>
                <span className="bg-black text-white px-3 py-1 rounded-sm print:bg-black print:-webkit-print-color-adjust-exact">الأسئلة</span>
                أجب عن جميع الأسئلة التالية (عدد الأسئلة: {quiz.questions.length}):
              </div>

              {/* Questions Section */}
              <div className="space-y-10">
                {form.questions.map((q, index) => (
                  <div key={q.id} className="break-inside-avoid print:break-inside-avoid">
                    <div className={`flex gap-3 font-bold ${fontSize} mb-4`}>
                      <span className="shrink-0 bg-gray-200 text-black w-8 h-8 flex items-center justify-center rounded-full border border-black/20 print:bg-transparent print:border-none print:w-auto print:h-auto">
                        {index + 1}.
                      </span>
                      <span className="leading-relaxed pt-1.5 print:pt-0">{q.text}</span>
                    </div>
                    {q.imageUrl && (
                      <div className="mb-5 pr-11 flex justify-start">
                        <img src={q.imageUrl} alt="مرفق السؤال" className="max-h-60 rounded-lg border-2 border-black/20 object-contain print:max-h-52 shadow-sm print:shadow-none" />
                      </div>
                    )}
                    <div className={`pr-11 grid grid-cols-1 ${q.options.some(o => o.text.length > 40) ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-x-6 gap-y-4`}>
                      {q.options.map((opt) => {
                        const isCorrect = q.correctOptionId === opt.id;
                        const highlightAnswer = showAnswers && isCorrect;
                        
                        return (
                          <div 
                            key={opt.id} 
                            className={`flex items-start gap-3 p-2 transition-all ${highlightAnswer ? "font-bold text-black border-[3px] border-black bg-gray-200 print:-webkit-print-color-adjust-exact print:color-adjust-exact rounded-xl shadow-sm print:shadow-none" : "text-black border-[3px] border-transparent"}`}
                          >
                            <div className="shrink-0 pt-0.5">
                              {highlightAnswer ? (
                                <CheckCircle2 className="h-6 w-6" />
                              ) : (
                                <Circle className="h-6 w-6 text-gray-300 print:text-black" />
                              )}
                            </div>
                            <span className={`leading-snug ${fontSize} ${highlightAnswer ? '' : 'font-semibold'}`}>{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-20 pt-10 border-t-[3px] border-black/20 text-center text-base font-bold opacity-80 pb-12 flex justify-between items-center text-muted-foreground print:text-black">
                <span>انتهت الأسئلة - بالتوفيق والنجاح</span>
                <span>الصفحة 1 من 1</span>
              </div>
              
              {showAnswers && (
                <div className="mt-8 p-4 rounded-xl border-2 border-dashed border-destructive text-center text-destructive font-black print:hidden">
                  🚧 هذا نموذج إجابة للمعلم - احذر توزيعه على الطلاب بالخطأ!
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
