#!/bin/bash

# LocaLedger Local Setup Script 🇦🇺
# Version: 1.0.0

echo "--------------------------------------------------"
echo "🦘 Setting up LocaLedger: The Australian Private Accountant"
echo "--------------------------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit
fi

# Check for Ollama
if ! command -v ollama &> /dev/null
then
    echo "⚠️  Ollama is not detected. For AI features, please install it at https://ollama.com/"
else
    echo "✅ Ollama detected."
    # Pull llama3 model
    echo "🤖 Pulling llama3 model..."
    ollama pull llama3
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Setup Environment
if [ ! -f .env ]; then
    echo "📄 Creating .env from template..."
    cp .env.example .env
    # Generate a random 32-byte key for encryption
    DB_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
    echo "DB_ENCRYPTION_KEY=\"$DB_KEY\"" >> .env
    echo "✅ .env created with a new encryption key."
else
    echo "✅ .env already exists."
fi

echo "--------------------------------------------------"
echo "✨ LocaLedger is ready!"
echo "🚀 Run 'npm run dev' to start your private accounting journey."
echo "--------------------------------------------------"
