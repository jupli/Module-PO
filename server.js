const { createServer } = require('http'); 
const { parse } = require('url'); 
const next = require('next'); 

// Force production mode if not explicitly set to development
const dev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000; 

console.log(`Starting server in ${dev ? 'development' : 'production'} mode...`);

const app = next({ dev, conf: { distDir: '.next' } }); 
const handle = app.getRequestHandler(); 

app.prepare().then(() => { 
  createServer((req, res) => { 
    const parsedUrl = parse(req.url, true); 
    handle(req, res, parsedUrl); 
  }).listen(port, () => { 
    console.log(`> Ready on port ${port}`); 
  }); 
});
