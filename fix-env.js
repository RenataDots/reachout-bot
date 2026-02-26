/**
 * Fix .env file format for XAI_API_KEY
 */

const fs = require('fs');

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Fix the XAI_API_KEY line - it's currently broken across lines
envContent = envContent.replace('XAI_API_KEY\n=xai-', 'XAI_API_KEY=xai-');

// Write back the fixed content
fs.writeFileSync('.env', envContent);

console.log('✅ Fixed .env file format');
console.log('🔑 XAI_API_KEY is now properly formatted');
