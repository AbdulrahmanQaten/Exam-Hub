import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, LayoutDashboard, Database, Users, MoreHorizontal, 
  HelpCircle, LogOut, LogIn, GraduationCap, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getUsername } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isTeacherActive = location.pathname.startsWith("/teacher");

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    } else {
      toast.success("تم تسجيل الخروج");
      setIsMoreOpen(false);
      navigate("/");
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t pb-safe">
      <div className="grid grid-cols-5 h-16 items-center">
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            isActive("/") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className={`h-5 w-5 ${isActive("/") ? "fill-primary/10" : ""}`} />
          <span className="text-[10px] font-bold">الرئيسية</span>
        </button>

        {/* Teacher Dashboard */}
        <button
          onClick={() => navigate("/teacher")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            isTeacherActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 ${isTeacherActive ? "fill-primary/10" : ""}`} />
          <span className="text-[10px] font-bold">لوحة المعلم</span>
        </button>

        {/* Question Banks */}
        <button
          onClick={() => navigate("/banks")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            location.pathname.startsWith("/banks") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Database className={`h-5 w-5 ${location.pathname.startsWith("/banks") ? "fill-primary/10" : ""}`} />
          <span className="text-[10px] font-bold">البنوك</span>
        </button>

        {/* Classes */}
        <button
          onClick={() => navigate("/classes")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            location.pathname.startsWith("/classes") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className={`h-5 w-5 ${location.pathname.startsWith("/classes") ? "fill-primary/10" : ""}`} />
          <span className="text-[10px] font-bold">الفصول</span>
        </button>

        {/* More Menu */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-bold">المزيد</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[32px] p-6 text-right" dir="rtl">
            <SheetHeader className="text-right pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span>خيارات إضافية</span>
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex flex-col gap-4 mt-6">
              {user && (
                <div className="px-4 py-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">أهلاً بك يا معلم</p>
                  <p className="font-bold text-lg text-primary truncate">{getUsername()}</p>
                </div>
              )}

              <Button 
                variant="ghost" 
                size="lg" 
                onClick={() => { navigate("/how-it-works"); setIsMoreOpen(false); }} 
                className="justify-start gap-4 h-14 rounded-2xl text-lg font-bold"
              >
                <HelpCircle className="h-6 w-6 text-blue-500" />
                كيف يعمل المنصة؟
              </Button>

              <div className="pt-2">
                {user ? (
                  <Button variant="destructive" size="lg" onClick={handleLogout} className="w-full justify-start gap-4 h-14 rounded-2xl text-lg font-bold">
                    <LogOut className="h-6 w-6" />
                    تسجيل الخروج
                  </Button>
                ) : (
                  <Button variant="default" size="lg" onClick={() => { navigate("/auth"); setIsMoreOpen(false); }} className="w-full justify-start gap-4 h-14 rounded-2xl text-lg font-bold">
                    <LogIn className="h-6 w-6" />
                    تسجيل الدخول
                  </Button>
                )}
              </div>
            </div>
            
            <div className="h-2 w-12 bg-muted rounded-full mx-auto mt-6" />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
