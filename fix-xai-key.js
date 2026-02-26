/**
 * Fix XAI_API_KEY in .env file
 */

const fs = require('fs');

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Fix the XAI_API_KEY - add proper newline
envContent = envContent.replace('GOOGLE_DRIVE_FOLDER_ID=1jTSfrurEvIr6_IWBq7aILI26iCfi9kGEXAI_API_KEY=xai-', 'GOOGLE_DRIVE_FOLDER_ID=1jTSfrurEvIr6_IWBq7aILI26iCfi9kGE\nXAI_API_KEY=xai-');

// Write back the fixed content
fs.writeFileSync('.env', envContent);

console.log('✅ Fixed XAI_API_KEY format in .env');
console.log('🔑 XAI_API_KEY is now on its own line');
