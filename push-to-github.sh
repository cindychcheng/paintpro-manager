#!/bin/bash

echo "🚀 Pushing PaintPro Manager to GitHub..."
echo ""
echo "You'll be prompted for your GitHub credentials:"
echo "- Username: cindychcheng"
echo "- Password: Your GitHub password or Personal Access Token"
echo ""

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Your repository: https://github.com/cindychcheng/paintpro-manager"
    echo ""
    echo "🎯 Next step: Deploy to Railway"
    echo "   1. Go to https://railway.app"
    echo "   2. Sign in with GitHub"
    echo "   3. Click 'Start a New Project'"
    echo "   4. Select 'Deploy from GitHub repo'"
    echo "   5. Choose 'cindychcheng/paintpro-manager'"
else
    echo ""
    echo "❌ Push failed. Please check your credentials."
    echo ""
    echo "💡 If you're using 2FA, you need a Personal Access Token instead of password:"
    echo "   1. Go to GitHub → Settings → Developer settings → Personal access tokens"
    echo "   2. Generate new token with 'repo' scope"
    echo "   3. Use the token as your password"
fi