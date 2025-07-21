import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchSettings();
    loadDarkModePreference();
  }, []);

  useEffect(() => {
    // Apply dark mode class to body
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/conversations');
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: 'New Conversation',
          provider: settings.default_provider || 'openai',
          model: settings.default_model || 'gpt-3.5-turbo'
        }),
      });
      const newConversation = await response.json();
      setConversations(prevConversations => [newConversation, ...prevConversations]);
      setActiveConversation(newConversation);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const updateConversation = async (conversationId, updates) => {
    try {
      await fetch(`http://localhost:3001/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      // Update local state with proper immutability
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId ? { ...conv, ...updates } : conv
        )
      );
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(prevActive => ({ ...prevActive, ...updates }));
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete conversation');
      }

      // Remove from local state
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== conversationId)
      );

      // If the deleted conversation was active, clear the active conversation and messages
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert(`Failed to delete conversation: ${error.message}`);
    }
  };

  const deleteAllConversations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/conversations', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete all conversations');
      }

      // Clear all local state
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
    } catch (error) {
      console.error('Error deleting all conversations:', error);
      alert(`Failed to delete all conversations: ${error.message}`);
    }
  };

  const sendMessage = async (content, setIsLoading) => {
    if (!activeConversation) return;

    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`http://localhost:3001/api/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      const savedUserMessage = await response.json();
      setMessages(prev => [...prev, savedUserMessage]);

      // Get AI response
      const allMessages = [...messages, savedUserMessage];
      const chatResponse = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          provider: activeConversation.provider || settings.default_provider || 'openai',
          model: activeConversation.model || settings.default_model || 'gpt-3.5-turbo'
        }),
      });

      const aiResponseData = await chatResponse.json();
      
      // Save AI response
      const aiMessage = {
        role: 'assistant',
        content: aiResponseData.content,
        timestamp: new Date().toISOString()
      };

      const aiResponse = await fetch(`http://localhost:3001/api/conversations/${activeConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiMessage),
      });

      const savedAiMessage = await aiResponse.json();
      setMessages(prev => [...prev, savedAiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const loadDarkModePreference = () => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(JSON.parse(savedDarkMode));
    }
  };

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newDarkMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
      return newDarkMode;
    });
  }, []);

  // Expose toggleDarkMode to Electron main process (for future use)
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onToggleDarkMode(() => {
        toggleDarkMode();
      });
    }
  }, [toggleDarkMode]);

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={setActiveConversation}
        onNewConversation={createNewConversation}
        onUpdateConversation={updateConversation}
        onDeleteConversation={deleteConversation}
        onDeleteAllConversations={deleteAllConversations}
        onShowSettings={() => setShowSettings(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />
      <div className="main-content">
        {showSettings ? (
          <Settings
            settings={settings}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
          />
        ) : (
          <ChatArea
            messages={messages}
            onSendMessage={sendMessage}
            activeConversation={activeConversation}
            onUpdateConversation={updateConversation}
          />
        )}
      </div>
    </div>
  );
}

export default App;
