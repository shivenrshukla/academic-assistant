function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>📚 Academic Assistant</h1>
          <span className="subtitle">Powered by Fine-tuned Gemini LLM</span>
        </div>
        <div className="status">
          <span className="status-indicator"></span>
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}

export default Header;