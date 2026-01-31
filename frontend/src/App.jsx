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

  const uploadFiles = (files) => {
    setUploadedFiles(prev => [...prev, ...files]);
    addMessage('system', `${files.length} file(s) uploaded successfully. Ready for academic queries.`);
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