import { useState } from 'react';

function QueryInput({ onSend, disabled }) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim() && !disabled) {
            onSend(query);
            setQuery('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className='query-input'>
            <div className='input-container'>
                <textarea 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask an academically precise question about you documents..."
                    rows="2"
                    disabled={disabled}
                    className='query-textarea'
                />
                <button type='submit' disabled={disabled || !query.trim()} className='send-button'>
                    {disabled ? '⏳' : '➤'}
                </button>
            </div>
            <div className='input-hint'>
                Pro tip: Fine-tuned Gemini will provide academically rigorous responses using your documents.
            </div>
        </form>
    );
}

export default QueryInput;