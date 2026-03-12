import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import AmbientBackground from '@/components/AmbientBackground';
import AppHeader from '@/components/AppHeader';
import FilePanel from '@/components/FilePanel';
import ChatArea from '@/components/ChatArea';
import QueryInput from '@/components/QueryInput';
import { getApiUrl } from '@/lib/api';

const Index = () => {
    const { isDark, toggle } = useTheme();
    const { toast } = useToast();
    const { token } = useAuth();
    
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [activeDocumentId, setActiveDocumentId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const fetchConversations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(getApiUrl("/api/chat/conversations"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        }
    }, [token]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const addMessage = useCallback((role, content) => {
        setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
    }, []);

    const loadSession = useCallback(async (documentId) => {
        setIsLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/chat/session/${documentId}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setActiveConversationId(data.conversationId);
                setActiveDocumentId(data.documentId);
                setMessages(data.messages || []);
                fetchConversations();
            } else {
                toast({ title: "Failed to load session", description: data.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to load chat session.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [token, toast, fetchConversations]);

    const uploadFiles = useCallback(
        async (files) => {
            setIsLoading(true);
            const formData = new FormData();
            
            files.forEach((f) => formData.append("files", f)); 
            
            addMessage("system", "Uploading and processing files...");

            try {
                const res = await fetch(getApiUrl("/api/upload"), { 
                    method: "POST", 
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData 
                });
                if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
                const data = await res.json();
                
                // Add nicely extracted documents to new documents
                setUploadedFiles((prev) => [...prev, ...data.files]);
                addMessage("system", `Success: ${data.message}`);

                // Load session automatically for the first valid uploaded file
                const firstValidFile = data.files.find((f) => f.documentId);
                if (firstValidFile) {
                    await loadSession(firstValidFile.documentId);
                }
            } catch(err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                addMessage("system", `Error uploading files: ${msg}`);
                toast({ title: "Upload failed", description: msg, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        },
        [addMessage, toast, token, loadSession]
    );

    const sendQuery = useCallback(
        async(query) => {
            if (!query.trim()) return;
            
            if (!activeConversationId) {
                toast({ title: "No active chat", description: "Please select a document or chat first.", variant: "destructive" });
                return;
            }

            addMessage("user", query);
            setIsLoading(true);

            try {
                const res = await fetch(getApiUrl("/api/chat"), {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        query, 
                        conversationId: activeConversationId 
                    }),
                });
                const data = await res.json();
                addMessage("assistant", data.response || "I encountered an error processing your query. Please try again.");
                
                // Refresh conversations list to update 'lastMessageAt' ordering
                fetchConversations();
            } catch(err) {
                addMessage("assistant", "A technical issue occurred. Please verify your connection and try again.");
            } finally {
                setIsLoading(false);
            }
        },
        [addMessage, activeConversationId, token, toast, fetchConversations]
    );

    const removeFile = useCallback((index) => {
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSelectConversation = useCallback((convId, docId) => {
        if (docId) {
            loadSession(docId);
        }
    }, [loadSession]);

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
                        conversations={conversations}
                        activeConversationId={activeConversationId}
                        onUpload={uploadFiles}
                        onRemoveFile={removeFile}
                        onSelectConversation={handleSelectConversation}
                        isLoading={isLoading}
                    />
                    <main className="flex flex-col flex-1 min-w-0">
                        <ChatArea messages={messages} isLoading={isLoading} />
                        <QueryInput onSend={sendQuery} disabled={isLoading || !activeConversationId} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Index;