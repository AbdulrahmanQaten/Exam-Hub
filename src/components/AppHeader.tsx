import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, Home, LogIn, LogOut, Database, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getUsername } = useAuth();
  
  const isHome = location.pathname === "/";
  const isTeacher = location.pathname.startsWith("/teacher");

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    } else {
      toast.success("تم تسجيل الخروج");
      navigate("/");
    }
  };

  return (
    <header className="print:hidden sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold hidden sm:inline-block">اختبارات</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 hidden sm:flex">
              <Home className="h-4 w-4" />
              الرئيسية
            </Button>
          )}

          {!isTeacher && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")} className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              المعلم
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => navigate("/how-it-works")} className="gap-2 px-2 sm:px-3">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline-block">كيف يعمل؟</span>
          </Button>
          
          {user && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/banks")} className="gap-2 text-primary">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline-block">بنك الأسئلة</span>
            </Button>
          )}

          <div className="mx-1 h-6 w-px bg-border hidden sm:block"></div>

          {user ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium mr-2 hidden sm:inline-block">أهلاً {getUsername()}!</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive gap-2 h-9 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline-block">خروج</span>
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="gap-2 h-9 px-3">
              <LogIn className="h-4 w-4" />
              دخول
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
