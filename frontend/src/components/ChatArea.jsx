import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const roleMeta = {
  user: {
    label: "You",
    bubbleClass: "bg-gradient-to-br from-secondary/80 to-secondary/50 text-secondary-foreground ml-auto",
    badgeClass: "bg-secondary/20 text-secondary border-0",
  },
  assistant: {
    label: "Assistant",
    bubbleClass: "glass-panel",
    badgeClass: "bg-primary/15 text-primary border-0",
  },
  system: {
    label: "System",
    bubbleClass: "bg-emerald-500/10 border border-emerald-500/20",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0",
  },
};

const ChatArea = ({ messages, isLoading }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    return (
        <ScrollArea className="flex-1 px-4 py-4">
            <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <p className="text-4xl mb-4">📚</p>
                        <h2 className="font-heading text-xl font-semibold gradient-text mb-2">Welcome to Academic Assistant</h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Upload your academic documents and ask questions. I'll provide rigorous, context-aware responses.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const meta = roleMeta[msg.role] || roleMeta.system;
                    return (
                        <div
                        key={i}
                        className={`msg-animate flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                        style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
                        >
                        <div className={`max-w-[85%] rounded-xl px-4 py-3 ${meta.bubbleClass}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${meta.badgeClass}`}>
                                {meta.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        </div>
                    );
                    })}

                    {isLoading && (
                    <div className="msg-animate flex items-start">
                        <div className="glass-panel rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                                Assistant
                                </Badge>
                            </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            </div>
                            <span className="text-xs text-muted-foreground">Analyzing documents…</span>
                        </div>
                    </div>
                </div>
                )}
                <div ref={endRef} />
            </div>
        </ScrollArea>
    );
};

export default ChatArea;