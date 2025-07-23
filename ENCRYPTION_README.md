# API Key Encryption Implementation

This document describes the encryption implementation for API keys in the ChatUI project.

## Overview

API keys for OpenAI and Anthropic are now encrypted before being stored in the SQLite database using AES encryption from the `crypto-js` library. This provides an additional layer of security to protect sensitive API keys.

## How It Works

### Encryption Process
1. When API keys are saved through the settings interface, they are encrypted using AES encryption
2. The encrypted keys are stored in the SQLite database
3. The original plain-text keys are never stored in the database

### Decryption Process
1. When API keys are needed (for API calls or displaying in settings), they are retrieved from the database
2. The encrypted keys are decrypted back to their original form
3. The decrypted keys are used for API calls or sent to the frontend

## Security Features

- **AES Encryption**: Uses industry-standard AES encryption from crypto-js
- **Environment Variable Key**: Encryption key can be set via environment variable
- **Fallback Protection**: If encryption/decryption fails, the system gracefully handles errors
- **No Plain-text Storage**: API keys are never stored in plain text in the database

## Configuration

### Setting the Encryption Key

1. **Development**: The system uses a default key if none is provided
2. **Production**: Set the `ENCRYPTION_KEY` environment variable

### Generating a Secure Key

You can generate a secure encryption key using Node.js:

```javascript
require('crypto').randomBytes(32).toString('hex')
```

## Implementation Details

### Files Modified
- `backend/server.js`: Added encryption/decryption functions and updated all API key handling
- `backend/.env.example`: Added example environment configuration

### Functions Added
- `encryptApiKey(apiKey)`: Encrypts an API key using AES
- `decryptApiKey(encryptedApiKey)`: Decrypts an encrypted API key

### Endpoints Updated
- `GET /api/settings`: Decrypts API keys before sending to frontend
- `POST /api/settings`: Encrypts API keys before storing in database
- `POST /api/chat`: Decrypts API keys before making API calls
- `GET /api/models/:provider`: Decrypts API keys before fetching models

## Migration

### Existing Installations
- Existing plain-text API keys will continue to work
- When settings are next saved, they will be automatically encrypted
- No manual migration is required

### New Installations
- All API keys will be encrypted from the first save

## Security Considerations

1. **Encryption Key Security**: Keep the encryption key secure and never commit it to version control
2. **Environment Variables**: Use environment variables for the encryption key in production
3. **Key Rotation**: Consider rotating the encryption key periodically
4. **Backup Considerations**: If you change the encryption key, existing encrypted data will become unreadable

## Dependencies

- `crypto-js`: ^4.2.0 (already included in package.json)
