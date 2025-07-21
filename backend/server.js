const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());


// Initialize SQLite database
const db = new sqlite3.Database('./chat.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    provider TEXT DEFAULT 'openai',
    model TEXT DEFAULT 'gpt-3.5-turbo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add provider and model columns if they don't exist (for existing databases)
  db.run(`ALTER TABLE conversations ADD COLUMN provider TEXT DEFAULT 'openai'`, (err) => {
    // Ignore error if column already exists
  });
  
  db.run(`ALTER TABLE conversations ADD COLUMN model TEXT DEFAULT 'gpt-3.5-turbo'`, (err) => {
    // Ignore error if column already exists
  });

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    ollama_base_url TEXT DEFAULT 'http://localhost:11434',
    default_provider TEXT DEFAULT 'openai',
    default_model TEXT DEFAULT 'gpt-3.5-turbo'
  )`);
});

// API Routes

// Get all conversations
app.get('/api/conversations', (req, res) => {
  db.all('SELECT * FROM conversations ORDER BY updated_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create new conversation
app.post('/api/conversations', (req, res) => {
  const { title, provider, model } = req.body;
  db.run('INSERT INTO conversations (title, provider, model) VALUES (?, ?, ?)', 
    [title, provider || 'openai', model || 'gpt-3.5-turbo'], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ 
      id: this.lastID, 
      title, 
      provider: provider || 'openai',
      model: model || 'gpt-3.5-turbo',
      created_at: new Date().toISOString() 
    });
  });
});

// Update conversation
app.put('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  const { title, provider, model } = req.body;
  
  db.run('UPDATE conversations SET title = ?, provider = ?, model = ? WHERE id = ?', 
    [title, provider, model, id], function(err) {
    if (err) {
      console.error('Error updating conversation:', err);
      return res.status(500).json({ error: 'Failed to update conversation' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({ message: 'Conversation updated successfully' });
  });
});

// Delete conversation
app.delete('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  
  // Use a transaction to ensure both operations succeed or fail together
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // First delete all messages in the conversation
    db.run('DELETE FROM messages WHERE conversation_id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting messages:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to delete conversation messages' });
      }
      
      // Then delete the conversation
      db.run('DELETE FROM conversations WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting conversation:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to delete conversation' });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Conversation not found' });
        }
        
        // Commit the transaction
        db.run('COMMIT', function(err) {
          if (err) {
            console.error('Error committing transaction:', err);
            return res.status(500).json({ error: 'Failed to commit deletion' });
          }
          
          res.json({ message: 'Conversation deleted successfully' });
        });
      });
    });
  });
});

// Get messages for a conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  const conversationId = req.params.id;
  db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [conversationId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add message to conversation
app.post('/api/conversations/:id/messages', (req, res) => {
  const conversationId = req.params.id;
  const { role, content } = req.body;
  
  db.run('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)', 
    [conversationId, role, content], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Update conversation timestamp
    db.run('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
    
    res.json({ id: this.lastID, conversation_id: conversationId, role, content, timestamp: new Date().toISOString() });
  });
});

// Chat with AI
app.post('/api/chat', async (req, res) => {
  const { messages, provider, model } = req.body;
  
  try {
    // Get settings
    const settings = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });

    let response;
    
    switch (provider) {
      case 'openai':
        response = await callOpenAI(messages, model, settings.openai_api_key);
        break;
      case 'anthropic':
        response = await callAnthropic(messages, model, settings.anthropic_api_key);
        break;
      case 'ollama':
        response = await callOllama(messages, model, settings.ollama_base_url);
        break;
      default:
        throw new Error('Unsupported provider');
    }
    
    res.json({ content: response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings endpoints
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || {});
  });
});

app.post('/api/settings', (req, res) => {
  const { openai_api_key, anthropic_api_key, ollama_base_url, default_provider, default_model } = req.body;
  
  db.run(`INSERT OR REPLACE INTO settings (id, openai_api_key, anthropic_api_key, ollama_base_url, default_provider, default_model) 
          VALUES (1, ?, ?, ?, ?, ?)`, 
    [openai_api_key, anthropic_api_key, ollama_base_url, default_provider, default_model], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Settings saved successfully' });
    });
});

// Get available models for a provider
app.get('/api/models/:provider', async (req, res) => {
  const provider = req.params.provider;
  
  try {
    // Get settings
    const settings = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });

    let models = [];
    
    switch (provider) {
      case 'openai':
        models = await getOpenAIModels(settings.openai_api_key);
        break;
      case 'anthropic':
        models = await getAnthropicModels(settings.anthropic_api_key);
        break;
      case 'ollama':
        models = await getOllamaModels(settings.ollama_base_url);
        break;
      default:
        throw new Error('Unsupported provider');
    }
    
    res.json({ models });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Provider Functions
async function callOpenAI(messages, model, apiKey) {
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: model || 'gpt-3.5-turbo',
    messages: messages,
    max_tokens: 1000
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.choices[0].message.content;
}

async function callAnthropic(messages, model, apiKey) {
  if (!apiKey) throw new Error('Anthropic API key not configured');
  
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: model || 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: messages.filter(m => m.role !== 'system'),
    system: messages.find(m => m.role === 'system')?.content || ''
  }, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });
  
  return response.data.content[0].text;
}

async function callOllama(messages, model, baseUrl) {
  const response = await axios.post(`${baseUrl}/api/chat`, {
    model: model || 'llama2',
    messages: messages,
    stream: false
  });
  
  return response.data.message.content;
}

// Model fetching functions
async function getOpenAIModels(apiKey) {
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Filter for chat models and sort by name
    const chatModels = response.data.data
      .filter(model => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') &&
        !model.id.includes('edit') &&
        !model.id.includes('embedding') &&
        !model.id.includes('whisper') &&
        !model.id.includes('tts') &&
        !model.id.includes('dall-e')
      )
      .map(model => model.id)
      .sort();
    
    return chatModels;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error.message);
    // Return fallback models if API call fails
    return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
  }
}

async function getAnthropicModels(apiKey) {
  if (!apiKey) throw new Error('Anthropic API key not configured');
  
  // Anthropic doesn't have a public models endpoint, so return known models
  // These are the current available models as of 2024
  return [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];
}

async function getOllamaModels(baseUrl) {
  if (!baseUrl) baseUrl = 'http://localhost:11434';
  
  try {
    const response = await axios.get(`${baseUrl}/api/tags`);
    return response.data.models.map(model => model.name).sort();
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
    // Return fallback models if Ollama is not running
    return ['llama2', 'llama2:13b', 'llama2:70b', 'codellama', 'mistral', 'mixtral'];
  }
}


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
