# ChatUI - Multi-Provider AI Chat Interface

A beautiful and simple chat interface that supports multiple AI providers including OpenAI, Anthropic, and Ollama.

## Features

- 🎨 Clean and modern UI with sidebar navigation
- 💬 Support for multiple conversations
- ✏️ **Rename conversations** - Click the edit icon to rename any conversation
- 🔄 Switch between OpenAI, Anthropic, and Ollama models
- 🎯 **Per-conversation model selection** - Choose different AI models for each conversation
- 🔄 **Dynamic model fetching** - Automatically fetch the latest available models from each provider
- 💾 SQLite database for persistent conversation storage
- ⚙️ Easy-to-use settings panel with refresh button for models
- 📱 Responsive design
- ⏳ **Loading indicators** - Visual feedback when AI is responding
- 🖥️ **Full-screen layout** - Chat interface uses the entire browser window
- 🖥️ **Desktop App** - Cross-platform Electron app with single executable
- 🔒 **Privacy-focused** - All data stored locally, API keys never leave your device

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation & Setup

1. **Clone or download the project**

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

### Option 1: Desktop App (Recommended)

**Run the Electron desktop app:**
```bash
./start-electron.sh
```
This will build the frontend and launch the desktop app - no browser needed!

**Build a distributable executable:**
```bash
./build-electron.sh
```
This creates a single executable file in the `dist` folder that you can share or install.

### Option 2: Web Development Mode

**For first-time setup:**
```bash
./start.sh
```
This will install dependencies and start both servers.

**For development (after initial setup):**
```bash
./start-dev.sh
```
This quickly starts both servers without reinstalling dependencies.

### Option 3: Manual startup

1. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```
   The backend will run on `http://localhost:3001`

2. **Start the frontend development server:**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Open your browser and navigate to `http://localhost:5173`**

## Configuration

### API Keys

You can configure your API keys in two ways:

1. **Via the Settings UI (Recommended):**
   - Click the "Settings" button in the sidebar
   - Enter your API keys for the providers you want to use
   - Select your default provider and model
   - Click "Save Settings"

2. **Via Environment Variables:**
   - Create a `.env` file in the backend directory
   - Add your API keys:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     OLLAMA_BASE_URL=http://localhost:11434
     ```

### Supported Providers

#### OpenAI
- **Models:** gpt-3.5-turbo, gpt-4, gpt-4-turbo-preview, gpt-4o
- **API Key:** Get from [OpenAI Platform](https://platform.openai.com/api-keys)

#### Anthropic
- **Models:** claude-3-sonnet-20240229, claude-3-opus-20240229, claude-3-haiku-20240307
- **API Key:** Get from [Anthropic Console](https://console.anthropic.com/)

#### Ollama
- **Models:** Any locally installed Ollama model (enter manually via text input)
- **Popular models:** llama2, llama2:13b, mistral, codellama, mixtral, phi, gemma
- **Setup:** Install [Ollama](https://ollama.ai/) locally and pull your desired models
- **Default URL:** http://localhost:11434
- **Note:** Use text input to specify any model name - no need to fetch from API

## Project Structure

```
ChatUI/
├── backend/
│   ├── server.js          # Express server with API routes
│   ├── package.json       # Backend dependencies
│   ├── .env              # Environment variables
│   └── chat.db           # SQLite database (created automatically)
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ChatArea.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── *.css     # Component styles
│   │   ├── App.jsx       # Main App component
│   │   └── App.css       # Global styles
│   └── package.json      # Frontend dependencies
└── README.md
```

## Database

The application uses SQLite for data persistence with the following tables:

- **conversations:** Stores conversation metadata
- **messages:** Stores individual messages
- **settings:** Stores API keys and configuration

The database file (`chat.db`) is created automatically in the backend directory when you first run the server.

## Development

### Backend API Endpoints

- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `POST /api/conversations/:id/messages` - Add message to conversation
- `POST /api/chat` - Send message to AI provider
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Save settings

### Frontend Components

- **App.jsx:** Main application component with state management
- **Sidebar.jsx:** Left sidebar with conversation list and navigation
- **ChatArea.jsx:** Main chat interface with message display and input
- **Settings.jsx:** Settings panel for API configuration

## Troubleshooting

1. **Backend won't start:**
   - Make sure you're in the backend directory
   - Check if port 3001 is available
   - Verify all dependencies are installed

2. **Frontend won't connect to backend:**
   - Ensure backend is running on port 3001
   - Check for CORS issues in browser console

3. **AI responses not working:**
   - Verify API keys are correctly configured
   - Check network connectivity
   - For Ollama, ensure the service is running locally

## License

MIT License - feel free to use this project for your own purposes.
