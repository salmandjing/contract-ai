#!/bin/bash
# Contract AI Platform V5 - Installation Script

echo "🚀 Installing Contract AI Platform V5..."

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python 3.8+ required. Found: $PYTHON_VERSION"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✅ Python version: $PYTHON_VERSION"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
if [ -f "requirements-minimal.txt" ]; then
    echo "Installing minimal dependencies first..."
    pip install -r requirements-minimal.txt
    
    if [ $? -eq 0 ]; then
        echo "✅ Minimal dependencies installed successfully"
        
        echo "Installing full dependencies..."
        pip install -r requirements.txt
        
        if [ $? -eq 0 ]; then
            echo "✅ All dependencies installed successfully"
        else
            echo "⚠️  Full installation failed, but minimal dependencies are installed"
            echo "You can still run the application with basic features"
        fi
    else
        echo "❌ Failed to install minimal dependencies"
        exit 1
    fi
else
    echo "Installing from requirements.txt..."
    pip install -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Verify installation
echo "🔍 Verifying installation..."
python3 -c "
try:
    import boto3
    import dotenv
    import PyPDF2
    import requests
    print('✅ Core dependencies verified')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Installation complete!"
    echo ""
    echo "Next steps:"
    echo "1. Set up credentials: ./setup_credentials.sh"
    echo "2. Start server: ./start_server.sh"
    echo "3. Open browser: http://localhost:8094"
    echo ""
    echo "To activate the virtual environment in the future:"
    echo "  source venv/bin/activate"
else
    echo "❌ Installation verification failed"
    exit 1
fi