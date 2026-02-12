/**
 * Fix private key format for OAuth2
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

// Read current .env
const currentEnv = fs.readFileSync(envPath, 'utf8');

// Extract and fix the private key format
const privateKeyMatch = currentEnv.match(/GOOGLE_PRIVATE_KEY="([^"]+)"/);
if (!privateKeyMatch) {
  console.log('❌ Could not find GOOGLE_PRIVATE_KEY in .env');
  process.exit(1);
}

const privateKey = privateKeyMatch[1];

// Fix the private key format - replace \n with actual newlines and remove extra quotes
const fixedPrivateKey = privateKey.replace(/\\n/g, '\n');

// Create new .env content
const newEnvContent = `GOOGLE_CLIENT_EMAIL=reachoutbot-service@ee-dots-monitoring.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="${fixedPrivateKey}"
GOOGLE_DRIVE_FOLDER_ID=1jTSfrurEvIr6_IWBq7aILI26iCfi9kGE`;

try {
  fs.writeFileSync(envPath, newEnvContent, 'utf8');
  console.log('\n✅ Private key format fixed!');
  console.log('\n🔑 The key now has proper newlines for OAuth2');
  console.log('\n🔄 Restart server and test connection again');
  console.log('\n🧪 Test: http://localhost:3000/api/google-drive/test');
} catch (error) {
  console.error('\n❌ Error fixing private key:', error.message);
}
