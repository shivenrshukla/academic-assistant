import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, FileIcon, MessageSquare } from "lucide-react";
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
    isLoading 
}) => {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

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
          <span className="font-heading font-semibold text-sm">Files</span>
          {files.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">
              {files.length}
            </Badge>
          )}
        </div>
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
        <p className="text-xs text-muted-foreground">Drop files or click to upload</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">PDF, DOCX, TXT, MD</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.md"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* File list */}
      <ScrollArea className="flex-1 px-3 pb-3">
        {files.length > 0 && (
          <div className="space-y-1.5 mb-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              New Documents
            </div>
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="msg-animate flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-muted group transition-colors"
              >
                <FileIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs truncate flex-1">{file.name}</span>
                <button
                  onClick={() => onRemoveFile(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Conversations list */}
        {conversations.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Recent Chats
            </div>
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id, conv.document?._id)}
                className={`w-full text-left msg-animate flex flex-col gap-1 px-2.5 py-2 rounded-lg transition-colors ${
                  activeConversationId === conv._id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-muted/30 hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${
                    activeConversationId === conv._id ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <span className={`text-xs truncate font-medium flex-1 ${
                    activeConversationId === conv._id ? "text-primary dark:text-primary-foreground" : "text-foreground dark:text-white"
                  }`}>
                    {conv.title || "Untitled Chat"}
                  </span>
                </div>
                {conv.document?.filename && (
                  <div className="text-[10px] text-muted-foreground truncate pl-5">
                    Doc: {conv.document.filename}
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