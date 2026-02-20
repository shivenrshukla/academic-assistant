import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';

const AppHeader = ({ isDark, onThemeToggle, sidebarOpen, onSidebarToggle }) => (
    <header className="glass-panel sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
            <Button
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="rounded-full hover:bg-primary/10"
            >
                {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>
            <div>
                <h1 className="text-xl font-bold font-heading gradient-text glow-pulse leading-tight">
                    📚 Academic Assistant
                </h1>
                <p className="text-xs text-muted-foreground">Powered by Fine-tuned Gemini LLM</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-75 bg-primary/60" style={{ animation: "ping-status 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                Online
            </div>
            <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        </div>
    </header>
);

export default AppHeader;