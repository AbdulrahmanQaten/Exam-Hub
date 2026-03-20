import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Lock, Loader2 } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/teacher");
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      toast.error("يرجى إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    // التحقق من أن اسم المستخدم باللغة الإنجليزية (حروف وأرقام فقط)
    const englishRegex = /^[a-zA-Z0-9_]+$/;
    if (!englishRegex.test(cleanUsername)) {
      toast.error("يرجى إدخال اسم مستخدم باللغة الإنجليزية فقط (حروف وأرقام وبدون مسافات)");
      return;
    }

    setLoading(true);
    
    // استخدام الاسم الإنجليزي مباشرة كبريد وهمي للتعامل مع متطلبات Supabase
    const email = `${cleanUsername.toLowerCase()}@examhub.com`;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("بيانات الدخول غير صحيحة");
          } else {
            toast.error(error.message);
          }
          throw error;
        }
        toast.success("تم الدخول بنجاح");
        navigate("/teacher");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: cleanUsername }
          }
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم آخر أو تسجيل الدخول");
          } else {
            toast.error(error.message);
          }
          throw error;
        }
        
        if (!data.session) {
          toast.error("عذراً! يبدو أن خيار 'Confirm Email' مفعل في إعدادات Supabase الخاصة بك. يرجى الذهاب إلى Authentication ثم Providers وإيقاف تفعيل خيار Confirm Email لكي يعمل النظام.");
          setLoading(false);
          return;
        }

        toast.success("تم إنشاء الحساب بنجاح! جاري الدخول...");
        navigate("/teacher");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            ميزات الحساب: مزامنة اختباراتك وبنك الأسئلة لتصل إليها من أي مكان
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pr-10 h-11 text-right"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 h-11 text-right"
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? "دخول" : "إنشاء الحساب")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline hover:text-primary/80"
            disabled={loading}
          >
            {isLogin ? "لا تملك حساباً؟ أنشئ حسابك الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
          </button>
        </div>
      </Card>
    </div>
  );
}
