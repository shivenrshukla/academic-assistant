import { useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button'; 

function QueryInput({ onSend, disabled }) {
    const [query, setQuery] = useState('');

    const handleSubmit = useCallback(
        (e) => {
            e.preventDefault();
            if (query.trim() && !disabled) {
                onSend(query);
                setQuery('');
            }
        },
        [query, disabled, onSend]
    );

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit]
    );

    return (
        <div className="border-t border-border/50 px-4 py-3 glass-panel">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 p-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='Ask a question about your documents…'
                        rows={1}
                        disabled={disabled}
                        className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 min-h-[40px] max-h-[120px]"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={disabled || !query.trim()}
                        className="shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground hover:opacity-90 hover:scale-105 transition-all duration-200 disabled:opacity-40 h-9 w-9"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-center">
                    Press Enter to send • Shift+Enter for new line
                </p>
            </form>
        </div>
    );
};

export default QueryInput;