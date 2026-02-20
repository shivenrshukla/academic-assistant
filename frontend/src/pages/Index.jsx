import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import AmbientBackground from '@/components/AmbientBackground';
import AppHeader from '@/components/AppHeader';
import FilePanel from '@/components/FilePanel';
import ChatArea from '@/components/ChatArea';
import QueryInput from '@/components/QueryInput';

const Index = () => {
    const { isDark, toggle } = useTheme();
    const { toast } = useToast();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const addMessage = useCallback((role, content) => {
        setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
    }, []);

    const uploadFiles = useCallback(
        async (files) => {
            setIsLoading(true);
            const formData = new FormData();
            files.forEach((f) => formData.append("files", f));
            addMessage("system", "Uploading and processing files");

            try {
                const res = await fetch("api/upload", { method: "POST", body: formData });
                if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
                const data = await res.json();
                setUploadedFiles((prev) => [...prev, ...data.files]);
                addMessage("system", `Success: ${data.message}`);
            } catch(err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                addMessage("system", `Error uploading files: ${msg}`);
                toast({ title: "Upload failed", description: msg, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        },
        [addMessage, toast]
    );

    const sendQuery = useCallback(
        async(query) => {
            if (!query.trim()) return;
            addMessage("user", query);
            setIsLoading(true);

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query, context: uploadedFiles.map((f) => f.name), files: uploadedFiles }),
                });
                const data = await res.json();
                addMessage("assistant", data.response || "I encountered an error processing your query. Please try again.");
            } catch(err) {
                addMessage("assistant", "A technical issue occurred. Please verify your connection and try again.");
            } finally {
                setIsLoading(false);
            }
        },
        [addMessage, uploadFiles]
    );

    const removeFile = useCallback((index) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i != index));
    }, []);

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden">
            <AmbientBackground />
            <div className="relative z-10 flex flex-col min-h-screen">
                <AppHeader
                    isDark={isDark}
                    onThemeToggle={toggle}
                    sidebarOpen={sidebarOpen}
                    onSidebarToggle={() => setSidebarOpen((p) => !p)}
                />
                <div className="flex flex-1 overflow-hidden">
                    <FilePanel
                        open={sidebarOpen}
                        files={uploadedFiles}
                        onUpload={uploadFiles}
                        onRemoveFile={removeFile}
                        isLoading={isLoading}
                    />
                    <main className="flex flex-col flex-1 min-w-0">
                        <ChatArea messages={messages} isLoading={isLoading} />
                        <QueryInput onSend={sendQuery} disabled={isLoading} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Index;