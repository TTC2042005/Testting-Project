const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const envContents = fs.readFileSync(envPath, 'utf8');
  envContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const idx = line.indexOf('=');
    if (idx < 0) {
      return;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    process.env[key] = value;
  });
}

const config = require('./jira.config.js');
console.log(config);
