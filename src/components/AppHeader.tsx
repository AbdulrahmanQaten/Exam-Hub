import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, Home } from "lucide-react";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isTeacher = location.pathname.startsWith("/teacher");

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">اختبارات</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
              <Home className="h-4 w-4" />
              الرئيسية
            </Button>
          )}
          {!isTeacher && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")} className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              لوحة المعلم
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
