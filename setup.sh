#!/bin/bash

# Setup script for Chat & Video Call Application

set -e

echo "=================================="
echo "Chat & Video Call App Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect OS
OS="$(uname -s)"
echo -e "${BLUE}Detected OS: $OS${NC}"

# Function to install Homebrew on macOS
install_homebrew() {
    echo -e "${YELLOW}Homebrew not found. Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
}

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed.${NC}"
    if [[ "$OS" == "Darwin" ]]; then
        echo "Installing Python via Homebrew..."
        brew install python@3.11
    else
        echo "Please install Python 3.9 or higher manually."
        exit 1
    fi
fi

echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    if [[ "$OS" == "Darwin" ]]; then
        if ! command -v brew &> /dev/null; then
            install_homebrew
        fi
        echo "Installing Node.js via Homebrew..."
        brew install node
    else
        echo "Please install Node.js 16 or higher manually."
        exit 1
    fi
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check AWS CLI for DynamoDB access
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}AWS CLI not found.${NC}"
    if [[ "$OS" == "Darwin" ]]; then
        if ! command -v brew &> /dev/null; then
            install_homebrew
        fi
        echo -e "${BLUE}Installing AWS CLI via Homebrew...${NC}"
        brew install awscli
        echo -e "${GREEN}✓ AWS CLI installed${NC}"
        echo -e "${YELLOW}Run 'aws configure' to set up your credentials${NC}"
    else
        echo -e "${YELLOW}AWS CLI not found. Installing...${NC}"
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y awscli
        elif command -v yum &> /dev/null; then
            sudo yum install -y aws-cli
        else
            echo -e "${BLUE}Installing via pip...${NC}"
            pip3 install awscli
        fi
    fi
else
    echo -e "${GREEN}✓ AWS CLI found: $(aws --version)${NC}"
fi

# Check Terraform for infrastructure deployment
if ! command -v terraform &> /dev/null; then
    echo -e "${YELLOW}Terraform not found.${NC}"
    if [[ "$OS" == "Darwin" ]]; then
        if ! command -v brew &> /dev/null; then
            install_homebrew
        fi
        echo -e "${BLUE}Installing Terraform via Homebrew...${NC}"
        brew tap hashicorp/tap
        brew install hashicorp/tap/terraform
        echo -e "${GREEN}✓ Terraform installed${NC}"
    else
        echo -e "${YELLOW}Please install Terraform manually from: https://terraform.io/downloads${NC}"
    fi
else
    echo -e "${GREEN}✓ Terraform found: $(terraform --version | head -1)${NC}"
fi

echo ""
echo "Setting up Lambda Functions..."
echo "------------------------------"

# Lambda setup
cd lambda

# Install dependencies
echo "Installing Lambda dependencies..."

# Create package directory if it doesn't exist
mkdir -p ./package

# Detect Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
echo "Detected Python version: $PYTHON_VERSION"

# Check if we have a compatible Python version
PYTHON_CMD="python3"
if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
    echo "Using Python 3.11 (matches Lambda runtime)"
elif command -v python3.12 &> /dev/null; then
    PYTHON_CMD="python3.12"
    echo "Using Python 3.12"
elif [[ "$PYTHON_VERSION" == "3.14" ]] || [[ "$PYTHON_VERSION" > "3.13" ]]; then
    echo -e "${YELLOW}Warning: Python $PYTHON_VERSION is too new. Some packages may not have wheels.${NC}"
    echo -e "${YELLOW}Recommended: Install Python 3.11 or 3.12${NC}"
    echo ""
    
    # Try container approach for incompatible Python
    CONTAINER_CMD=""
    if command -v podman &> /dev/null; then
        CONTAINER_CMD="podman"
        echo -e "${BLUE}Using Podman to build Lambda packages (this avoids compatibility issues)...${NC}"
    elif command -v docker &> /dev/null; then
        CONTAINER_CMD="docker"
        echo -e "${BLUE}Using Docker to build Lambda packages (this avoids compatibility issues)...${NC}"
    fi
    
    if [ -n "$CONTAINER_CMD" ]; then
        $CONTAINER_CMD run --rm \
          --platform linux/amd64 \
          --entrypoint "" \
          -v "$PWD":/var/task:z \
          public.ecr.aws/lambda/python:3.11 \
          pip install -r requirements.txt -t /var/task/package 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Lambda dependencies installed via container${NC}"
            cd ..
            return 0
        else
            echo -e "${YELLOW}Container build failed, trying local installation...${NC}"
        fi
    else
        echo -e "${YELLOW}Podman/Docker not found. Install Podman or Python 3.11/3.12 for better compatibility.${NC}"
        echo "  Install Podman: brew install podman"
    fi
fi

# Upgrade pip
$PYTHON_CMD -m pip install --upgrade pip setuptools wheel -q 2>/dev/null

# Install dependencies with fallback
echo "Installing with $PYTHON_CMD..."

# Try installing (allow source builds if binary not available)
if $PYTHON_CMD -m pip install -r requirements.txt -t ./package 2>&1 | tee /tmp/pip_install.log; then
    echo -e "${GREEN}✓ Lambda dependencies installed${NC}"
else
    echo -e "${YELLOW}Installation had issues. Checking log...${NC}"
    
    # Check if critical packages installed
    if [ -d "./package/boto3" ] && [ -d "./package/jose" ]; then
        echo -e "${GREEN}✓ Core packages installed successfully${NC}"
        echo -e "${YELLOW}Some optional packages may have failed, but that's OK${NC}"
    else
        echo -e "${RED}Failed to install required packages${NC}"
        echo ""
        echo "Quick fix options:"
        echo "1. Install Python 3.11: brew install python@3.11"
        echo "2. Install Podman: brew install podman"
        echo "3. Run: cd lambda && ./build-docker.sh"
        exit 1
    fi
fi

cd ..

echo ""
echo "Setting up Frontend..."
echo "---------------------"

# Frontend setup
cd mobile

# Install dependencies
echo "Installing Node.js dependencies..."
npm install --legacy-peer-deps

# Install web support dependencies
echo "Installing web support..."
npx expo install react-native-web@~0.19.6 react-dom@18.2.0 -- --yes

# Create .env if it doesn't exist (never overwrite existing)
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
API_BASE_URL=http://localhost:8000
WS_URL=ws://localhost:8000
EOL
    echo -e "${GREEN}✓ Frontend .env file created${NC}"
    echo -e "${YELLOW}Note: Update mobile/.env with your AWS API Gateway URLs after deployment${NC}"
else
    echo -e "${GREEN}✓ Frontend .env file already exists (preserved)${NC}"
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"
echo "  - Platform support: Web, iOS, Android"

cd ..

echo ""
echo "Setting up Terraform..."
echo "-----------------------"

cd terraform

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
    echo -e "${GREEN}✓ Terraform initialized${NC}"
else
    echo -e "${GREEN}✓ Terraform already initialized${NC}"
fi

# Create terraform.tfvars if it doesn't exist
if [ ! -f "terraform.tfvars" ]; then
    echo "Creating terraform.tfvars..."
    cat > terraform.tfvars << EOL
# AWS Configuration
aws_region   = "us-east-1"
project_name = "chatvideo"
environment  = "dev"

# S3 Configuration
cors_origins = [
  "http://localhost:19006",
  "http://localhost:3000"
]
recording_retention_days = 90

# JWT Secret (leave empty to auto-generate)
jwt_secret_key = ""

# CloudWatch
log_retention_days = 30
EOL
    echo -e "${GREEN}✓ terraform.tfvars created${NC}"
else
    echo -e "${GREEN}✓ terraform.tfvars already exists${NC}"
fi

cd ..

echo ""
echo "=================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}🚀 Serverless Deployment:${NC}"
echo ""
echo "1️⃣  Configure AWS credentials:"
echo "   ${GREEN}aws configure${NC}"
echo ""
echo "2️⃣  Package Lambda functions:"
echo "   ${GREEN}cd lambda && ./deploy.sh${NC}"
echo ""
echo "3️⃣  Deploy infrastructure to AWS:"
echo "   ${GREEN}cd terraform${NC}"
echo "   ${GREEN}terraform plan${NC}     # Preview changes"
echo "   ${GREEN}terraform apply${NC}    # Deploy!"
echo ""
echo "4️⃣  Get your API URLs:"
echo "   ${GREEN}terraform output api_gateway_url${NC}"
echo "   ${GREEN}terraform output websocket_url${NC}"
echo ""
echo "5️⃣  Update frontend with API URLs (copy output from step 4):"
echo "   ${GREEN}nano mobile/.env${NC}"
echo ""
echo "6️⃣  Start the frontend:"
echo "   ${GREEN}cd mobile && npm start${NC}"
echo "   - Press 'w' for web browser"
echo "   - Press 'i' for iOS simulator (Mac only)"
echo "   - Press 'a' for Android emulator"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Architecture: ${GREEN}ARCHITECTURE.md${NC}"
echo "   - Deployment: ${GREEN}SERVERLESS_DEPLOY.md${NC}"
echo "   - Terraform: ${GREEN}terraform/README.md${NC}"
echo ""
echo -e "${BLUE}💰 Cost Estimate:${NC}"
echo "   - Development: ${GREEN}\$0-5/month${NC} (within free tier)"
echo "   - Production: ${GREEN}\$10-30/month${NC} (light usage)"
echo ""
echo -e "${BLUE}🔧 Stack:${NC}"
echo "   - Compute: AWS Lambda (serverless)"
echo "   - Database: DynamoDB (NoSQL)"
echo "   - API: API Gateway (REST + WebSocket)"
echo "   - Storage: S3 (files & recordings)"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Run: ${GREEN}aws configure${NC} to set up AWS credentials"
echo "   2. Read: ${GREEN}SERVERLESS_DEPLOY.md${NC} for detailed deployment guide"
echo "   3. Deploy: Follow steps above to deploy to AWS"
echo ""
echo -e "${GREEN}No servers to manage! Auto-scaling! Pay per use! 🎉${NC}"
echo ""

