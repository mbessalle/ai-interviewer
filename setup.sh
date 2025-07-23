#!/bin/bash

# AI-Interviewer Setup Script
# This script sets up the development environment for the AI-Interviewer platform

echo "🤖 Setting up AI-Interviewer development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn is not installed. Installing Yarn..."
    npm install -g yarn
fi

echo "📦 Installing dependencies..."
yarn install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating template..."
    cat > .env.local << EOL
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Voice AI (Retell)
RETELL_API_KEY=your_retell_api_key
NEXT_PUBLIC_RETELL_APP_ID=your_retell_app_id

# Application URL
NEXT_PUBLIC_LIVE_URL=ai-interviewer-neon.vercel.app

# Avatar Integration (Optional)
ENABLE_AVATARS=false
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_WS_URL=your_livekit_ws_url
LIVEKIT_URL=your_livekit_url
AVATAR_PROVIDER=hedra
HEDRA_API_KEY=your_hedra_api_key
DEFAULT_INTERVIEW_MODE=voice
EOL
    echo "📝 Please edit .env.local with your actual API keys before continuing."
fi

echo "🗄️  Setting up database schema..."
echo "📋 Make sure to run the SQL commands in supabase_schema.sql in your Supabase dashboard."

echo "🧹 Setting up code quality tools..."
echo "✅ Prettier and ESLint are already configured in package.json"

# Run initial formatting and linting
echo "🔍 Running initial code formatting and linting..."
npx prettier --write .
yarn lint --fix

echo "🚀 Setup complete! To start development:"
echo "   1. Edit .env.local with your API keys"
echo "   2. Run the SQL schema in your Supabase dashboard"
echo "   3. Start the development server with: yarn dev"
echo ""
echo "⚠️  IMPORTANT: Always run 'npx prettier --write . && yarn lint --fix' before committing!"
echo ""
echo "📚 See CONTEXT_MEMORY.md for project overview and current status."