import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, LayoutDashboard, Home, LogIn, LogOut, 
  Database, HelpCircle, Smartphone, Users, Menu 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getUsername } = useAuth();
  const { isInstallable, installPWA } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  
  const isHome = location.pathname === "/";
  const isTeacher = location.pathname.startsWith("/teacher");

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    } else {
      toast.success("تم تسجيل الخروج");
      setIsOpen(false);
      navigate("/");
    }
  };

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {!isHome && (
        <Button 
          variant="ghost" 
          size={mobile ? "lg" : "sm"} 
          onClick={() => { navigate("/"); setIsOpen(false); }} 
          className={`gap-3 ${mobile ? "justify-start w-full" : "hidden sm:flex"}`}
        >
          <Home className="h-4 w-4" />
          الرئيسية
        </Button>
      )}

      {!isTeacher && (
        <Button 
          variant="ghost" 
          size={mobile ? "lg" : "sm"} 
          onClick={() => { navigate("/teacher"); setIsOpen(false); }} 
          className={`gap-3 ${mobile ? "justify-start w-full" : "flex"}`}
        >
          <LayoutDashboard className="h-4 w-4" />
          لوحة المعلم
        </Button>
      )}

      <Button 
        variant="ghost" 
        size={mobile ? "lg" : "sm"} 
        onClick={() => { navigate("/how-it-works"); setIsOpen(false); }} 
        className={`gap-3 ${mobile ? "justify-start w-full" : "px-2 sm:px-3 hidden md:flex"}`}
      >
        <HelpCircle className="h-4 w-4" />
        <span>كيف يعمل؟</span>
      </Button>
      
      {user && (
        <>
          <Button 
            variant="ghost" 
            size={mobile ? "lg" : "sm"} 
            onClick={() => { navigate("/banks"); setIsOpen(false); }} 
            className={`gap-3 text-primary ${mobile ? "justify-start w-full" : "hidden lg:flex"}`}
          >
            <Database className="h-4 w-4" />
            <span>البنوك</span>
          </Button>
          <Button 
            variant="ghost" 
            size={mobile ? "lg" : "sm"} 
            onClick={() => { navigate("/classes"); setIsOpen(false); }} 
            className={`gap-3 text-primary ${mobile ? "justify-start w-full" : "hidden lg:flex"}`}
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
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px] text-right" dir="rtl">
                <SheetHeader className="text-right pb-6 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span>قائمة المنصة</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  {user && (
                    <div className="px-4 py-3 bg-muted/50 rounded-xl mb-2">
                      <p className="text-xs text-muted-foreground mb-1">مسجل كـ</p>
                      <p className="font-bold text-primary truncate">{getUsername()}</p>
                    </div>
                  )}
                  <NavItems mobile />
                  
                  <div className="my-4 border-t pt-4">
                    {user ? (
                      <Button variant="destructive" size="lg" onClick={handleLogout} className="w-full justify-start gap-3 rounded-xl">
                        <LogOut className="h-5 w-5" />
                        تسجيل الخروج
                      </Button>
                    ) : (
                      <Button variant="default" size="lg" onClick={() => { navigate("/auth"); setIsOpen(false); }} className="w-full justify-start gap-3 rounded-xl">
                        <LogIn className="h-5 w-5" />
                        تسجيل الدخول
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div
            className="flex items-center gap-2 cursor-pointer ml-1"
            onClick={() => navigate("/")}
          >
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold hidden sm:inline-block">اختبارات</span>
          </div>
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
