function FileUpload({ onUpload }) {
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    // Filter for document types
    const documentFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type.includes('text/') ||
      file.name.match(/\.(docx|doc|txt|md)$/)
    );
    onUpload(documentFiles);
    event.target.value = '';
  };

  return (
    <div className="file-upload-section">
      <label className="upload-area">
        <input
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx,.md"
          onChange={handleFileUpload}
          className="file-input"
        />
        <div className="upload-content">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p>Upload academic documents (PDF, DOCX, TXT)</p>
          <small>Supports RAG processing for context-aware responses</small>
        </div>
      </label>
    </div>
  );
}

export default FileUpload;