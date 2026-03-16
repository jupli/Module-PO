const { createServer } = require('http');
const { exec } = require('child_process');

const port = process.env.PORT || 3000;

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.write('=== MEMULAI NPM INSTALL MANUAL ===\n');
  res.write('Tunggu sebentar, proses ini memakan waktu...\n\n');

  // Perintah install: Abaikan devDependencies, abaikan script sharp jika bermasalah
  // Kita coba install dependencies utama saja
  const cmd = 'npm install --omit=dev --no-audit --no-fund --verbose';
  
  res.write(`Menjalankan perintah: ${cmd}\n\n`);

  const proc = exec(cmd, { cwd: process.cwd() });

  proc.stdout.on('data', (data) => {
    res.write(data);
  });

  proc.stderr.on('data', (data) => {
    res.write('[STDERR] ' + data);
  });

  proc.on('close', (code) => {
    res.write(`\n\n=== SELESAI ===\nExit Code: ${code}\n`);
    if (code === 0) {
        res.write('Instalasi BERHASIL! Silakan ganti server.js kembali ke script Next.js.');
    } else {
        res.write('Instalasi GAGAL! Silakan copy log di atas untuk diperbaiki.');
    }
    res.end();
  });

}).listen(port, () => {
  console.log(`Installer server running on ${port}`);
});
