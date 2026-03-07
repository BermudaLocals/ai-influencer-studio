# AI Influencer Studio - PowerShell Deployment Script
# Run this script in PowerShell after extracting the ZIP

Write-Host "🚀 AI Influencer Studio - GitHub Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Git is installed" -ForegroundColor Green
Write-Host ""

# Get GitHub username
$username = Read-Host "Enter your GitHub username"
if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ GitHub username is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📝 Initializing Git repository..." -ForegroundColor Yellow
git init

Write-Host "📦 Adding files..." -ForegroundColor Yellow
git add .

Write-Host "💾 Creating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit - AI Influencer Studio with updated pricing"

Write-Host "🔗 Adding GitHub remote..." -ForegroundColor Yellow
git remote add origin "https://github.com/$username/ai-influencer-studio.git"

Write-Host "🌿 Setting main branch..." -ForegroundColor Yellow
git branch -M main

Write-Host ""
Write-Host "⚠️  IMPORTANT: Before pushing, create the repository on GitHub:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://github.com/new" -ForegroundColor Cyan
Write-Host "   2. Repository name: ai-influencer-studio" -ForegroundColor Cyan
Write-Host "   3. Make it PRIVATE" -ForegroundColor Cyan
Write-Host "   4. DO NOT initialize with README" -ForegroundColor Cyan
Write-Host "   5. Click 'Create repository'" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Have you created the repository on GitHub? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "❌ Please create the repository first, then run this script again" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Go to: https://railway.app/dashboard" -ForegroundColor White
Write-Host "   2. Click 'New Project' → 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "   3. Select 'ai-influencer-studio'" -ForegroundColor White
Write-Host "   4. Add PostgreSQL and Redis databases" -ForegroundColor White
Write-Host "   5. Configure environment variables (see .env.example)" -ForegroundColor White
Write-Host "   6. Deploy!" -ForegroundColor White
Write-Host ""
Write-Host "💰 Revenue Target: $10,890/month with 50 customers!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
