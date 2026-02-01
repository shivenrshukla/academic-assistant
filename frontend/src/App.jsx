import { useState, useRef, useCallback } from 'react';
import ChatBox from './components/ChatBox';
import FileUpload from './components/FileUpload';
import QueryInput from './components/QueryInput';
import Header from './components/Header';
import './App.css'

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const messageEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  // In App.jsx

  const uploadFiles = async (files) => {
    // 1. Create the FormData object
    const formData = new FormData();
    
    // 2. Append files. 'files' MUST match the string in your backend upload.array('files')
    files.forEach(file => {
      formData.append('files', file); 
    });

    setIsLoading(true);
    addMessage('system', 'Uploading and processing files...');

    try {
      // 3. Send the request to your backend
      const response = await fetch('/api/upload', { 
        method: 'POST',
        body: formData, 
        // Note: Do NOT set Content-Type header manually for FormData, 
        // the browser sets it automatically with the boundary.
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      // 4. Update state with the files returned from the server (which contain paths/metadata)
      setUploadedFiles(prev => [...prev, ...data.files]);
      addMessage('system', `Success: ${data.message}`);

    } catch (error) {
      console.error("Upload error:", error);
      addMessage('system', `Error uploading files: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuery = async (query) => {
    if (!query.trim()) return;

    addMessage('user', query);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: uploadedFiles.map(f => f.name),
          files: uploadedFiles
        })
      });

      const data = await response.json();
      
      if (data.response) {
        addMessage('assistant', data.response);
      } else {
        addMessage('assistant', 'I apologize, but I encountered an error processing your query. Please try again.');
      }
    } catch (error) {
      addMessage('assistant', 'I regret that there was a technical issue. Please verify your connection and try again.');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };
  return (
    <div className='app'>
      <Header />
      <main className='main-content'>
        <div className='chat-container'>
          <FileUpload onUpload={uploadFiles} />
            <ChatBox
              message={messages}
              isLoading={isLoading}
              messagesEndRef={messageEndRef}
            />
            <QueryInput onSend={sendQuery} disabled={isLoading} />
        </div>
      </main>
    </div>
  )
}

export default App;