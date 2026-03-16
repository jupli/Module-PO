
const { exec } = require('child_process');
const http = require('http');

const commands = [
  'npx prisma generate',
  'npm run build'
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Fix process is running in background... check logs via Passenger log file.\n');
});

console.log('Starting Fix Process...');

const runCommand = (index) => {
  if (index >= commands.length) {
    console.log('✅ All commands completed successfully!');
    return;
  }

  const cmd = commands[index];
  console.log(`Running: ${cmd}`);
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error executing ${cmd}: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
    runCommand(index + 1);
  });
};

// Run commands immediately
runCommand(0);

// Keep server alive so cPanel doesn't kill it immediately
server.listen(process.env.PORT || 3000, () => {
  console.log('Fix Server running...');
});
