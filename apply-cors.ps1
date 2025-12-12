# PowerShell script to apply CORS configuration to Firebase Storage
# Prerequisites: Google Cloud SDK must be installed (gcloud and gsutil)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Storage CORS Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gsutil is installed
$gsutilCheck = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilCheck) {
    Write-Host "ERROR: gsutil is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host "2. Run the installer and make sure to check 'Add to PATH'" -ForegroundColor White
    Write-Host "3. Restart PowerShell after installation" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "gsutil found" -ForegroundColor Green

# Check if cors.json exists
if (-not (Test-Path "cors.json")) {
    Write-Host "ERROR: cors.json file not found in current directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "cors.json found" -ForegroundColor Green
Write-Host ""

# Firebase Storage bucket
$bucket = "gs://minion-project-9bb87.firebasestorage.app"

Write-Host "Configuring CORS for bucket: $bucket" -ForegroundColor Cyan
Write-Host ""

# Check authentication
Write-Host "Checking authentication..." -ForegroundColor Yellow
try {
    $authCheck = gcloud auth list 2>&1
    if ($LASTEXITCODE -ne 0 -or $authCheck -match "No credentialed accounts") {
        Write-Host "Authentication required" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please run:" -ForegroundColor Yellow
        Write-Host "  gcloud auth login" -ForegroundColor White
        Write-Host "  gcloud config set project minion-project-9bb87" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Do you want to authenticate now? (y/n)"
        if ($continue -eq 'y' -or $continue -eq 'Y') {
            gcloud auth login
            gcloud config set project minion-project-9bb87
        } else {
            Write-Host "Please authenticate and run this script again." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "Authenticated" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not check authentication" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Applying CORS configuration..." -ForegroundColor Cyan

# Apply CORS configuration
try {
    gsutil cors set cors.json $bucket 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "CORS configuration applied successfully!" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Verifying configuration..." -ForegroundColor Cyan
        Write-Host ""
        gsutil cors get $bucket
        Write-Host ""
        
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "CORS is now configured to allow:" -ForegroundColor Green
        Write-Host "  http://localhost:3000" -ForegroundColor White
        Write-Host "  http://localhost:3001" -ForegroundColor White
        Write-Host "  http://127.0.0.1:3000" -ForegroundColor White
        Write-Host "  http://127.0.0.1:3001" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Refresh your browser (Ctrl+Shift+R)" -ForegroundColor White
        Write-Host "2. Images should now load correctly!" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Failed to apply CORS configuration" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "Make sure you're authenticated: gcloud auth login" -ForegroundColor White
        Write-Host "Check project: gcloud config set project minion-project-9bb87" -ForegroundColor White
        Write-Host "Verify bucket exists in Firebase Console" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you're authenticated with Google Cloud:" -ForegroundColor Yellow
    Write-Host "  gcloud auth login" -ForegroundColor White
    Write-Host "  gcloud config set project minion-project-9bb87" -ForegroundColor White
    exit 1
}
