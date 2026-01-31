function ChatBox({ messages, isLoading, messagesEndRef }) {
    return (
        <div className="chat-box">
            <div className="messages">
                {messages?.map((message, index) => (
                    <div key={index} className={`message ${message.role}`}>
                        <div className="message-bubble">
                            <div className="message-header">
                                <span className={`role-badge ${message.role}`}>
                                    {message.role === 'user' ? 'You' : 'Assistant'}
                                </span>
                                <span className="timestamp">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="message-content">
                                {message.content}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message assistant">
                        <div className="message-bubble">
                            <div className="typing-indicator">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span>Analyzing academic documents</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}

export default ChatBox;