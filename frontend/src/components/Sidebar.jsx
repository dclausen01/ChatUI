import { useState } from 'react';
import { Plus, Settings, MessageSquare, Edit2, Check, X, Moon, Sun, Trash2 } from 'lucide-react';
import './Sidebar.css';

function Sidebar({ conversations, activeConversation, onSelectConversation, onNewConversation, onUpdateConversation, onDeleteConversation, onShowSettings, isDarkMode, onToggleDarkMode }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEdit = async (conversationId, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      const conversation = conversations.find(c => c.id === conversationId);
      
      await onUpdateConversation(conversationId, { 
        title: editTitle.trim(),
        provider: conversation?.provider || 'openai',
        model: conversation?.model || 'gpt-3.5-turbo'
      });
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyPress = (e, conversationId) => {
    if (e.key === 'Enter') {
      saveEdit(conversationId, e);
    } else if (e.key === 'Escape') {
      cancelEdit(e);
    }
  };

  const handleDelete = (conversationId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      onDeleteConversation(conversationId);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={onNewConversation}>
          <Plus size={20} />
          New Chat
        </button>
      </div>
      
      <div className="conversations-list">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
            onClick={() => editingId !== conversation.id && onSelectConversation(conversation)}
          >
            <MessageSquare size={16} />
            {editingId === conversation.id ? (
              <div className="edit-container">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, conversation.id)}
                  className="edit-input"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="edit-actions">
                  <button
                    className="edit-action-btn save"
                    onClick={(e) => saveEdit(conversation.id, e)}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="edit-action-btn cancel"
                    onClick={cancelEdit}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="conversation-title">{conversation.title}</span>
                <div className="conversation-actions">
                  <button
                    className="edit-btn"
                    onClick={(e) => startEditing(conversation, e)}
                    title="Edit conversation"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(conversation.id, e)}
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onToggleDarkMode}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="settings-btn" onClick={onShowSettings}>
          <Settings size={20} />
          Settings
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
