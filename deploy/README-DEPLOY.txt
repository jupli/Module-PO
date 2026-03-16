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

