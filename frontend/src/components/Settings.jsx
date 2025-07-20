import { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import './Settings.css';

function Settings({ settings, onSave, onClose }) {
  const [formData, setFormData] = useState({
    openai_api_key: '',
    anthropic_api_key: '',
    ollama_base_url: 'http://localhost:11434',
    default_provider: 'openai',
    default_model: 'gpt-3.5-turbo'
  });
  const [availableModels, setAvailableModels] = useState({});
  const [loadingModels, setLoadingModels] = useState(false);

  // Update form data when settings prop changes
  useEffect(() => {
    setFormData({
      openai_api_key: settings.openai_api_key || '',
      anthropic_api_key: settings.anthropic_api_key || '',
      ollama_base_url: settings.ollama_base_url || 'http://localhost:11434',
      default_provider: settings.default_provider || 'openai',
      default_model: settings.default_model || 'gpt-3.5-turbo'
    });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // If provider changed, fetch models for the new provider
    if (name === 'default_provider') {
      fetchModelsForProvider(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const fetchModelsForProvider = async (provider) => {
    setLoadingModels(true);
    try {
      const response = await fetch(`http://localhost:3001/api/models/${provider}`);
      const data = await response.json();
      
      setAvailableModels(prev => ({
        ...prev,
        [provider]: data.models
      }));
      
      // If current model is not in the new list, reset to first available model
      if (data.models.length > 0 && !data.models.includes(formData.default_model)) {
        setFormData(prev => ({
          ...prev,
          default_model: data.models[0]
        }));
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Keep fallback models on error
    } finally {
      setLoadingModels(false);
    }
  };

  const refreshModels = () => {
    fetchModelsForProvider(formData.default_provider);
  };

  const getModelOptions = () => {
    // Use fetched models if available, otherwise fallback to static list
    if (availableModels[formData.default_provider]) {
      return availableModels[formData.default_provider];
    }

    // Fallback models
    switch (formData.default_provider) {
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

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>API Keys</h3>
          
          <div className="form-group">
            <label htmlFor="openai_api_key">OpenAI API Key</label>
            <input
              type="password"
              id="openai_api_key"
              name="openai_api_key"
              value={formData.openai_api_key}
              onChange={handleChange}
              placeholder="sk-..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="anthropic_api_key">Anthropic API Key</label>
            <input
              type="password"
              id="anthropic_api_key"
              name="anthropic_api_key"
              value={formData.anthropic_api_key}
              onChange={handleChange}
              placeholder="sk-ant-..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="ollama_base_url">Ollama Base URL</label>
            <input
              type="url"
              id="ollama_base_url"
              name="ollama_base_url"
              value={formData.ollama_base_url}
              onChange={handleChange}
              placeholder="http://localhost:11434"
            />
          </div>
        </div>
        
        <div className="form-section">
          <h3>Default Settings</h3>
          
          <div className="form-group">
            <label htmlFor="default_provider">Default Provider</label>
            <select
              id="default_provider"
              name="default_provider"
              value={formData.default_provider}
              onChange={handleChange}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>
          
          <div className="form-group">
            <div className="model-selector-header">
              <label htmlFor="default_model">Default Model</label>
              {formData.default_provider !== 'ollama' && (
                <button 
                  type="button" 
                  className="refresh-models-btn"
                  onClick={refreshModels}
                  disabled={loadingModels}
                  title="Refresh available models"
                >
                  <RefreshCw size={16} className={loadingModels ? 'spinning' : ''} />
                </button>
              )}
            </div>
            
            {formData.default_provider === 'ollama' ? (
              <div className="ollama-model-input">
                <input
                  type="text"
                  id="default_model"
                  name="default_model"
                  value={formData.default_model}
                  onChange={handleChange}
                  placeholder="Enter Ollama model name (e.g., llama2, mistral, codellama)"
                  className="model-text-input"
                />
                <div className="model-suggestions">
                  <span>Popular models: </span>
                  {['llama2', 'llama2:13b', 'mistral', 'codellama', 'mixtral', 'phi', 'gemma'].map(model => (
                    <button
                      key={model}
                      type="button"
                      className="model-suggestion-btn"
                      onClick={() => setFormData(prev => ({ ...prev, default_model: model }))}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <select
                id="default_model"
                name="default_model"
                value={formData.default_model}
                onChange={handleChange}
                disabled={loadingModels}
              >
                {getModelOptions().map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
            
            {loadingModels && formData.default_provider !== 'ollama' && (
              <div className="loading-text">Loading models...</div>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="save-button">
            <Save size={20} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
