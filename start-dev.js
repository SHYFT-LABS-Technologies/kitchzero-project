#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting KitchZero Development Environment...\n');

// Start API server
console.log('📡 Starting API server (Real Database)...');
const api = spawn('pnpm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps', 'api'),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

api.stdout.on('data', (data) => {
  process.stdout.write(`[API] ${data}`);
});

api.stderr.on('data', (data) => {
  process.stderr.write(`[API] ${data}`);
});

// Start Web frontend
console.log('🌐 Starting Web frontend...');
const web = spawn('pnpm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps', 'web'),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

web.stdout.on('data', (data) => {
  process.stdout.write(`[WEB] ${data}`);
});

web.stderr.on('data', (data) => {
  process.stderr.write(`[WEB] ${data}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...');
  api.kill();
  web.kill();
  process.exit();
});

api.on('close', (code) => {
  console.log(`[API] Process exited with code ${code}`);
});

web.on('close', (code) => {
  console.log(`[WEB] Process exited with code ${code}`);
});

console.log('\n✅ Development servers starting...');
console.log('📊 API Health: http://localhost:3001/health');
console.log('🌐 Web App: http://localhost:3000');
console.log('\n💡 Press Ctrl+C to stop all servers\n');