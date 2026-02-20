import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThemeToggle = ({ isDark, onToggle }) => (
    <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="relative rounded-full hover:bg-primary/10 transition-all duration-300"
        aria-label="Toggle theme"
    >
        {isDark ? (
            <Sun className="h-5 w-5 text-primary transition-transform duration-300 rotate-0" />
        ): (
            <Moon className="h-5 w-5 text-primary transition-transform duration-300 rotate-0" />
        )}
    </Button>
);

export default ThemeToggle;