
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  
  let output = "=== DEBUGGING MODE ===\n\n";
  output += "Current Directory: " + process.cwd() + "\n\n";
  
  output += "Files in Current Directory:\n";
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      output += "- " + file + "\n";
    });
  } catch (err) {
    output += "Error reading directory: " + err.message + "\n";
  }

  output += "\nChecking .next folder:\n";
  try {
    if (fs.existsSync('.next')) {
        output += ".next exists!\n";
        const nextFiles = fs.readdirSync('.next');
        nextFiles.forEach(file => {
            output += "  - " + file + "\n";
        });
        
        output += "\nChecking .next/server:\n";
        if (fs.existsSync('.next/server')) {
             const serverFiles = fs.readdirSync('.next/server');
             serverFiles.forEach(file => {
                output += "    - " + file + "\n";
             });
        } else {
            output += ".next/server NOT FOUND!\n";
        }

    } else {
        output += ".next folder NOT FOUND!\n";
    }
  } catch (err) {
      output += "Error reading .next: " + err.message + "\n";
  }

  res.end(output);
}).listen(port, () => {
  console.log(`> Debug server ready on port ${port}`);
});
