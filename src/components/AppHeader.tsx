import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, LayoutDashboard, Home, LogIn, LogOut, 
  Database, HelpCircle, Smartphone, Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getUsername } = useAuth();
  const { isInstallable, installPWA } = usePWAInstall();
  
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

  const NavItems = () => (
    <>
      {!isHome && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/")} 
          className="gap-2 hidden sm:flex"
        >
          <Home className="h-4 w-4" />
          الرئيسية
        </Button>
      )}

      {!isTeacher && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/teacher")} 
          className="gap-2 hidden sm:flex"
        >
          <LayoutDashboard className="h-4 w-4" />
          لوحة المعلم
        </Button>
      )}

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate("/how-it-works")} 
        className="gap-2 px-2 sm:px-3 hidden md:flex"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline-block">كيف يعمل؟</span>
      </Button>
      
      {user && (
        <>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/banks")} 
            className="gap-2 text-primary hidden lg:flex"
          >
            <Database className="h-4 w-4" />
            <span>البنوك</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/classes")} 
            className="gap-2 text-primary hidden lg:flex"
          >
            <Users className="h-4 w-4" />
            <span>الفصول</span>
          </Button>
        </>
      )}
    </>
  );

  return (
    <header className="print:hidden sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">اختبارات</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          <NavItems />
        </div>

        <div className="flex items-center gap-2">
          {/* Always visible Desktop Auth */}
          <div className="hidden md:flex items-center gap-2">
            <div className="mx-2 h-6 w-px bg-border"></div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden lg:inline-block">أهلاً {getUsername()}!</span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive h-9 px-3">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="h-9 px-4 rounded-lg font-bold">
                دخول
              </Button>
            )}
          </div>

          {/* Quick Actions (Mobile & Desktop) */}
          {isInstallable && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={installPWA} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 sm:h-9 sm:px-3 animate-pulse shadow-md rounded-lg"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden xs:inline-block mr-1 text-xs">تثبيت</span>
            </Button>
          )}

          {/* Mobile User/Login - Simplified */}
          <div className="md:hidden">
            {user ? (
               <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                 <span className="text-[10px] font-bold text-primary">{getUsername()?.substring(0, 2).toUpperCase()}</span>
               </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="h-8 w-8 p-0">
                <LogIn className="h-5 w-5 text-primary" />
              </Button>
            )}
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
