#!/bin/bash
# Quick Deployment Script for MediConnect
# Run this to prepare your project for deployment

echo "🚀 MediConnect Deployment Preparation"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  package.json not found. Are you in the project root?${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking Git Status${NC}"
git status

echo -e "\n${BLUE}Step 2: Checking Backend${NC}"
if [ -d "backend" ]; then
    echo "✅ Backend directory found"
    cd backend
    echo "   - Checking backend/.env..."
    if [ -f ".env" ]; then
        echo "   ✅ .env exists"
    else
        echo "   ${YELLOW}⚠️  .env not found - Copy from .env.production.example${NC}"
    fi
    cd ..
else
    echo "❌ Backend directory not found"
fi

echo -e "\n${BLUE}Step 3: Checking Frontend${NC}"
if [ -d "frontend" ]; then
    echo "✅ Frontend directory found"
    cd frontend
    echo "   - Checking frontend/.env..."
    if [ -f ".env" ]; then
        echo "   ✅ .env exists"
    else
        echo "   ${YELLOW}⚠️  .env not found - Copy from .env.production.example${NC}"
    fi
    cd ..
else
    echo "❌ Frontend directory not found"
fi

echo -e "\n${BLUE}Step 4: Deployment Checklist${NC}"
echo "Before deploying, ensure:"
echo "  ☐ MongoDB Atlas cluster created"
echo "  ☐ Database user created (username: mediconnect_user)"
echo "  ☐ IP whitelist configured (0.0.0.0/0)"
echo "  ☐ Twilio account setup"
echo "  ☐ Gmail app password generated"
echo "  ☐ Cloudinary account setup"
echo "  ☐ GitHub repository pushed to main branch"
echo "  ☐ Render account created"
echo "  ☐ Vercel account created"

echo -e "\n${GREEN}✨ Ready for Deployment!${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Create Render Web Service:"
echo "   - Connect GitHub repo"
echo "   - Set runtime to Node"
echo "   - Add environment variables"
echo ""
echo "2. Create Vercel Project:"
echo "   - Connect GitHub repo"
echo "   - Set Root Directory to 'frontend'"
echo "   - Add VITE_API_URL environment variable"
echo ""
echo "📖 Full guide: See DEPLOYMENT_GUIDE.md"
