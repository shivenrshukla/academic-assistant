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

    const loadSession = useCallback(async (conversationId) => {
        setIsLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/chat/session/${conversationId}`), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setActiveConversationId(data.conversationId);
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

            if (activeConversationId) {
                formData.append("conversationId", activeConversationId);
            }

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

                // Load session automatically if the conversation ID is present
                if (data.conversationId && activeConversationId !== data.conversationId) {
                    await loadSession(data.conversationId);
                } else if (activeConversationId === data.conversationId) {
                    fetchConversations(); // refresh the sidebar
                }
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                addMessage("system", `Error uploading files: ${msg}`);
                toast({ title: "Upload failed", description: msg, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        },
        [addMessage, toast, token, loadSession, activeConversationId]
    );

    const sendQuery = useCallback(
        async (query) => {
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
            } catch (err) {
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

    const handleSelectConversation = useCallback((convId) => {
        if (convId) {
            loadSession(convId);
        }
    }, [loadSession]);

    const renameConversation = useCallback(
        async (conversationId, newTitle) => {
            if (!newTitle.trim()) return;
            try {
                const res = await fetch(getApiUrl(`/api/chat/conversations/${conversationId}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: newTitle })
                });

                if (res.ok) {
                    fetchConversations();
                } else {
                    const data = await res.json();
                    toast({ title: 'Error', description: data.error || 'Failed to rename chat.', variant: 'destructive' });
                }
            } catch (err) {
                console.error(err);
                toast({ title: 'Error', description: 'Failed to rename chat.', variant: 'destructive' });
            }
        },
        [token, fetchConversations, toast]
    );

    const handleNewChat = useCallback(() => {
        setActiveConversationId(null);
        setMessages([]);
        setUploadedFiles([]);
    }, []);

    return (
        <div className="relative h-screen flex flex-col overflow-hidden">
            <AmbientBackground />
            <div className="relative z-10 flex flex-col h-screen">
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
                        onRename={renameConversation}
                        onNewChat={handleNewChat}
                        isLoading={isLoading}
                    />
                    <main className="flex flex-col flex-1 min-w-0">
                        <ChatArea messages={messages} isLoading={isLoading} activeConversationId={activeConversationId} />
                        <QueryInput onSend={sendQuery} disabled={isLoading || !activeConversationId} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Index;