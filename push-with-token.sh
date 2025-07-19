#!/bin/bash

echo "🚀 Pushing PaintPro Manager to GitHub with Personal Access Token..."
echo ""
echo "You'll be prompted for your GitHub credentials:"
echo "- Username: cindychcheng"
echo "- Password: [PASTE YOUR PERSONAL ACCESS TOKEN HERE]"
echo ""
echo "🔑 Make sure you've created a Personal Access Token at:"
echo "   https://github.com/settings/tokens"
echo ""

# Configure git to use the token
echo "Setting up git credentials..."
git remote set-url origin https://cindychcheng@github.com/cindychcheng/paintpro-manager.git

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Your repository: https://github.com/cindychcheng/paintpro-manager"
    echo ""
    echo "📊 Repository contains:"
    echo "   - Modern glassmorphism UI design"
    echo "   - Full-stack React + Express app"
    echo "   - SQLite database with estimates & invoices"
    echo "   - Terms and Notes functionality"
    echo "   - PDF generation capabilities"
    echo ""
    echo "🎯 Next step: Deploy to Railway"
    echo "   1. Go to https://railway.app"
    echo "   2. Sign in with GitHub"
    echo "   3. Click 'Start a New Project'"
    echo "   4. Select 'Deploy from GitHub repo'"
    echo "   5. Choose 'cindychcheng/paintpro-manager'"
    echo "   6. Railway will auto-deploy with your modern UI!"
else
    echo ""
    echo "❌ Push failed. Please check your Personal Access Token."
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Make sure you copied the full token"
    echo "   2. Token should have 'repo' scope enabled"
    echo "   3. Try creating a new token if needed"
fi