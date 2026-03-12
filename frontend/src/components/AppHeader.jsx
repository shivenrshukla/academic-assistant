import { PanelLeftOpen, PanelLeftClose, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AppHeader = ({ isDark, onThemeToggle, sidebarOpen, onSidebarToggle }) => {
    const { user, logout } = useAuth();
    
    return (
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
            
            {user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8 transition-transform hover:scale-105">
                                <AvatarFallback className="bg-primary/20 text-primary font-medium text-xs">
                                    {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    </header>
    );
};

export default AppHeader;