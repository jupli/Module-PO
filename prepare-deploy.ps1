
$ErrorActionPreference = "Stop"

Write-Host "Cleaning up previous build artifacts..."
if (Test-Path "deploy") { Remove-Item "deploy" -Recurse -Force }
if (Test-Path "project.zip") { Remove-Item "project.zip" -Force }

Write-Host "Creating deploy directory..."
New-Item -ItemType Directory -Path "deploy" | Out-Null

Write-Host "Copying Next.js build artifacts..."
New-Item -ItemType Directory -Path "deploy/.next" -Force | Out-Null

# Copy essential build artifacts only
Copy-Item -Path ".next/server" -Destination "deploy/.next" -Recurse -Force
Copy-Item -Path ".next/static" -Destination "deploy/.next" -Recurse -Force
Copy-Item -Path ".next/BUILD_ID" -Destination "deploy/.next/BUILD_ID" -Force
Copy-Item -Path ".next/prerender-manifest.json" -Destination "deploy/.next/prerender-manifest.json" -Force
Copy-Item -Path ".next/routes-manifest.json" -Destination "deploy/.next/routes-manifest.json" -Force
Copy-Item -Path ".next/required-server-files.json" -Destination "deploy/.next/required-server-files.json" -Force

if (Test-Path ".next/server-reference-manifest.json") {
    Copy-Item -Path ".next/server-reference-manifest.json" -Destination "deploy/.next/server-reference-manifest.json" -Force
}
if (Test-Path ".next/package.json") {
    Copy-Item -Path ".next/package.json" -Destination "deploy/.next/package.json" -Force
}

Write-Host "Copying public files..."
New-Item -ItemType Directory -Path "deploy/public" -Force | Out-Null
Copy-Item -Path "public/*" -Destination "deploy/public" -Recurse -Force

Write-Host "Copying prisma schema..."
New-Item -ItemType Directory -Path "deploy/prisma" -Force | Out-Null
Copy-Item -Path "prisma/*" -Destination "deploy/prisma" -Recurse -Force

Write-Host "Copying configuration files..."
Copy-Item -Path "package.json" -Destination "deploy/package.json" -Force
if (Test-Path "next.config.ts") {
    Copy-Item -Path "next.config.ts" -Destination "deploy/next.config.ts" -Force
}
Copy-Item -Path "server.js" -Destination "deploy/server.js" -Force

Write-Host "Copying setup scripts..."
Copy-Item -Path "seed-user.js" -Destination "deploy/seed-user.js" -Force
Copy-Item -Path "setup-db.js" -Destination "deploy/setup-db.js" -Force

Write-Host "Creating deployment instructions..."
@"
PANDUAN DEPLOYMENT (cPanel) - UPDATE
====================================

1. UPLOAD
   - Upload file 'project.zip' ke folder aplikasi anda (misal: public_html).
   - Extract (Timpa file lama jika ada).

2. SETUP NODE.JS APP
   - Pastikan 'Application Startup File' diisi: server.js
   - Pastikan versi Node.js minimal v18 atau v20.
   - Klik 'Run NPM Install' (Jika belum pernah, atau jika node_modules error).

3. DATABASE & ENV
   - Pastikan file .env sudah ada dan berisi:
     DATABASE_URL="mysql://user:pass@localhost:3306/db_name"
     AUTH_SECRET="secret_random"
     PORT=3000

4. STARTUP
   - Jika sudah, klik 'Restart'.
   - Jika masih error 500, cek log di cPanel.

5. PERBAIKAN ERROR SEBELUMNYA
   - Versi ini menggunakan 'server.js' custom yang lebih stabil di cPanel.
   - Tidak menggunakan 'standalone' mode yang menyebabkan error symlink.
   - Pastikan anda sudah menjalankan 'node setup-db.js' lewat terminal jika belum.

"@ | Out-File -FilePath "deploy/README-DEPLOY.txt" -Encoding utf8

Write-Host "Zipping deployment package..."
Compress-Archive -Path "deploy/*" -DestinationPath "project.zip" -Force

Write-Host "✅ project.zip created successfully!"
