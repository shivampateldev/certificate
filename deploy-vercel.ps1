# Vercel Deployment Script for Certificate Management Platform

Write-Host "🚀 Starting Vercel Deployment..." -ForegroundColor Green

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

# Check if we're in the right directory
if (-not (Test-Path "vercel.json")) {
    Write-Host "❌ vercel.json not found. Make sure you're in the project root directory." -ForegroundColor Red
    exit 1
}

# Build the client first
Write-Host "🔨 Building React client..." -ForegroundColor Yellow
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install client dependencies" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build client" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "✅ Client built successfully" -ForegroundColor Green

# Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment completed!" -ForegroundColor Green
    Write-Host "🎉 Your app is now live on Vercel!" -ForegroundColor Cyan
    Write-Host "💰 Cost: $0/month (100% FREE)" -ForegroundColor Green

    Write-Host "`n📋 Next Steps for OAuth Setup:" -ForegroundColor Yellow
    Write-Host "1. Go to your Vercel Dashboard → Settings → Environment Variables"
    Write-Host "2. Add these environment variables:"
    Write-Host "   - GOOGLE_CLIENT_ID=your_google_client_id"
    Write-Host "   - GOOGLE_CLIENT_SECRET=your_google_client_secret"
    Write-Host "3. Redeploy after adding environment variables"
    Write-Host "4. Test the Mass Mailer OAuth authentication"
    Write-Host ""
    Write-Host "🔗 OAuth Redirect URI for Google Cloud Console:" -ForegroundColor Cyan
    Write-Host "https://certificate-management-platform.vercel.app/api/mass-mail/auth/callback"
    Write-Host ""
    Write-Host "🔗 API Endpoints Available:" -ForegroundColor Cyan
    Write-Host "  - /api/health (Health check)"
    Write-Host "  - /api/certificates (Certificate management)"
    Write-Host "  - /api/reports (Analytics and reports)"
    Write-Host "  - /api/emails (Email campaigns)"
    Write-Host "  - /api/mass-mail (Mass mailer with OAuth)"
} else {
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
    exit 1
}