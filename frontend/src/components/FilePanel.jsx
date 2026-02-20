import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const FilePanel = ({ open, files, onUpload, onRemoveFile, isLoading }) => {
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
        <div className="space-y-1.5">
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
      </ScrollArea>
    </aside>
  );
};

export default FilePanel;