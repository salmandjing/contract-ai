#!/bin/bash
# Secure server startup script
# Loads credentials from .env file or local_credentials.sh

echo "🚀 Starting Contract AI Platform..."

# Check for credentials in order of preference
if [ -f .env ]; then
    echo "✅ Using .env file for credentials"
    # Check if python-dotenv is installed
    if ! python3 -c "import dotenv" 2>/dev/null; then
        echo "📦 Installing python-dotenv..."
        pip3 install python-dotenv
    fi
    python3 frontend_server.py ${1:-8094}
elif [ -f ../local_credentials.sh ]; then
    echo "✅ Using local_credentials.sh for credentials"
    source ../local_credentials.sh
    python3 frontend_server.py ${1:-8094}
else
    echo "❌ Error: No credential file found!"
    echo ""
    echo "Please create credentials using one of these methods:"
    echo ""
    echo "Method 1 - .env file (recommended):"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your AWS credentials"
    echo ""
    echo "Method 2 - Environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your_key"
    echo "  export AWS_SECRET_ACCESS_KEY=your_secret"
    echo "  export AWS_DEFAULT_REGION=us-east-1"
    echo ""
    exit 1
fi
