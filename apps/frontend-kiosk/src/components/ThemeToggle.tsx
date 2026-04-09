import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="w-12 h-12 rounded-full border-2 transition-smooth">
          <Sun className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.5rem] w-[1.5rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-2 min-w-[150px] rounded-xl shadow-xl border-2">
        <DropdownMenuItem onClick={() => setTheme("light")} className="py-3 px-4 rounded-lg cursor-pointer flex items-center gap-3">
          <Sun className="h-5 w-5" />
          <span className="text-lg font-medium">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="py-3 px-4 rounded-lg cursor-pointer flex items-center gap-3">
          <Moon className="h-5 w-5" />
          <span className="text-lg font-medium">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="py-3 px-4 rounded-lg cursor-pointer flex items-center gap-3">
          <Laptop className="h-5 w-5" />
          <span className="text-lg font-medium">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
