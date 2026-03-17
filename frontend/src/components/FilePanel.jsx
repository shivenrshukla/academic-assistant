import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, FileIcon, MessageSquare, Pencil, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const FilePanel = ({ 
    open, 
    files, 
    conversations = [], 
    activeConversationId, 
    onUpload, 
    onRemoveFile, 
    onSelectConversation, 
    onRename,
    onNewChat,
    isLoading 
}) => {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [editingConvId, setEditingConvId] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    const handleRenameStart = (e, conv) => {
        e.stopPropagation();
        setEditingConvId(conv._id);
        setEditTitle(conv.title || "Untitled Chat");
    };

    const handleRenameSubmit = (e, conv) => {
        e.stopPropagation();
        if (editTitle.trim() && editTitle !== conv.title && onRename) {
            onRename(conv._id, editTitle);
        }
        setEditingConvId(null);
    };

    const handleRenameKeyDown = (e, conv) => {
        if (e.key === "Enter") {
            handleRenameSubmit(e, conv);
        } else if (e.key === "Escape") {
            setEditingConvId(null);
            e.stopPropagation();
        }
    };

    const handleFiles = useCallback(
        (fileList) => {
            if (!fileList) return;
            const arr = Array.from(fileList).filter(
                (f) => 
                    f.type === "application/pdf" ||
                    f.type.includes("text/") ||
                    /\.(docx|doc|txt|md)$/i.test(f.name)
            );
            if (arr.length) onUpload(arr);
        },
        [onUpload]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles]
    );

    if (!open) return null;

    return (
    <aside className="glass-panel w-72 flex flex-col border-r border-border/50 shrink-0 transition-all duration-300">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-heading font-semibold text-sm">Chats</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onNewChat}
          className="h-8 gap-1.5 px-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary text-[11px] font-medium transition-all duration-300"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </Button>
      </div>

      {/* Upload zone */}
      <div
        className={`m-3 p-4 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer text-center
          ${dragOver ? "border-primary bg-primary/10 scale-[1.02]" : "border-border/60 hover:border-primary/50 hover:bg-primary/5"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Drop documents or click to upload</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Add to current chat</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.md"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1 px-3 pb-3">
        {conversations.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              History
            </div>
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`w-full text-left msg-animate flex flex-col gap-1 px-2.5 py-2 rounded-lg transition-colors ${
                  activeConversationId === conv._id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-muted/30 hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-2 w-full group/item">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${
                    activeConversationId === conv._id ? "text-primary" : "text-muted-foreground"
                  }`} />
                  {editingConvId === conv._id ? (
                      <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                              autoFocus
                              className="flex-1 bg-background border px-1.5 py-0.5 text-xs rounded text-foreground outline-none focus:ring-1 focus:ring-primary h-6"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => handleRenameKeyDown(e, conv)}
                              onBlur={(e) => handleRenameSubmit(e, conv)}
                          />
                          <button onClick={(e) => handleRenameSubmit(e, conv)} className="p-1 hover:bg-muted rounded shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                          </button>
                      </div>
                  ) : (
                      <>
                          <span className={`text-xs truncate font-medium flex-1 ${
                            activeConversationId === conv._id ? "text-primary" : "text-foreground dark:text-white"
                          }`}>
                            {conv.title || "Untitled Chat"}
                          </span>
                          <button 
                            onClick={(e) => handleRenameStart(e, conv)} 
                            className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-muted-foreground/20 rounded shrink-0"
                            title="Rename"
                          >
                              <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                      </>
                  )}
                </div>
                {conv.documents && conv.documents.length > 0 && (
                  <div className="text-[10px] text-muted-foreground truncate pl-5">
                    Docs: {conv.documents.map(d => d.filename).join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
};

export default FilePanel;