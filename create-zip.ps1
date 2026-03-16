
Get-ChildItem -Path . | Where-Object { $_.Name -notin @("node_modules", ".next", ".git", ".vscode", "dist", "build", "project-upload.zip", ".gitattributes", ".gitignore") } | Compress-Archive -DestinationPath "project-upload.zip" -Force
Write-Host "File 'project-upload.zip' siap di-upload ke cPanel!"
