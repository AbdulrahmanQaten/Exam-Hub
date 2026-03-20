import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {resolved === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" /> فاتح
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" /> داكن
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" /> تلقائي
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
