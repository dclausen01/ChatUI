import { useState, useEffect, useRef } from 'react';
import { Send, Settings, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import './ChatArea.css';

function ChatArea({ messages, onSendMessage, activeConversation, onUpdateConversation }) {
  const [inputValue, setInputValue] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const modelSelectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && activeConversation && !isLoading) {
      onSendMessage(inputValue.trim(), setIsLoading);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const [availableModels, setAvailableModels] = useState({});

  const getModelOptions = (provider) => {
    // Use fetched models if available, otherwise fallback to static list
    if (availableModels[provider]) {
      return availableModels[provider];
    }

    // Fallback models
    switch (provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      case 'ollama':
        return ['llama2', 'llama2:13b', 'llama2:70b', 'codellama', 'mistral', 'mixtral'];
      default:
        return [];
    }
  };

  const fetchModelsForProvider = async (provider) => {
    try {
      const response = await fetch(`http://localhost:3001/api/models/${provider}`);
      const data = await response.json();
      
      setAvailableModels(prev => ({
        ...prev,
        [provider]: data.models
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      // Keep fallback models on error
    }
  };

  const handleProviderChange = (provider) => {
    const defaultModels = {
      'openai': 'gpt-3.5-turbo',
      'anthropic': 'claude-3-5-sonnet-20241022',
      'ollama': 'llama2'
    };
    
    // Fetch models for the new provider
    fetchModelsForProvider(provider);
    
    onUpdateConversation(activeConversation.id, {
      title: activeConversation.title,
      provider: provider,
      model: defaultModels[provider]
    });
  };

  const handleModelChange = (model) => {
    onUpdateConversation(activeConversation.id, {
      title: activeConversation.title,
      provider: activeConversation.provider,
      model: model
    });
  };

  const handleCopyMessage = async (messageId, content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!activeConversation) {
    return (
      <div className="chat-area">
        <div className="welcome-screen">
          <h2>Welcome to ChatUI</h2>
          <p>Select a conversation or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="header-left">
          <h3>{activeConversation.title}</h3>
        </div>
        <div className="header-right">
          <div className="model-selector" ref={modelSelectorRef}>
            <button 
              className="model-selector-btn"
              onClick={() => setShowModelSelector(!showModelSelector)}
            >
              <Settings size={16} />
              {activeConversation.provider || 'openai'} / {activeConversation.model || 'gpt-3.5-turbo'}
            </button>
            {showModelSelector && (
              <div className="model-dropdown">
                <div className="dropdown-section">
                  <label>Provider:</label>
                  <select 
                    value={activeConversation.provider || 'openai'}
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div className="dropdown-section">
                  <label>Model:</label>
                  {(activeConversation.provider || 'openai') === 'ollama' ? (
                    <input
                      type="text"
                      value={activeConversation.model || 'llama2'}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder="Enter model name (e.g., llama2, mistral)"
                      className="model-text-input-small"
                    />
                  ) : (
                    <select 
                      value={activeConversation.model || 'gpt-3.5-turbo'}
                      onChange={(e) => handleModelChange(e.target.value)}
                    >
                      {getModelOptions(activeConversation.provider || 'openai').map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 && (
          <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
            No messages yet. Start a conversation!
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-wrapper">
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
              {message.role === 'assistant' && (
                <button
                  className="copy-button"
                  onClick={() => handleCopyMessage(message.id, message.content)}
                  title="Copy message"
                >
                  {copiedMessageId === message.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              )}
            </div>
            <div className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form className="message-input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLoading ? "AI is responding..." : "Type your message..."}
            rows={1}
            className="message-input"
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={!inputValue.trim() || isLoading}>
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatArea;
