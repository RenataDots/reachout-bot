/**
 * OAuth2 Setup Helper
 * 
 * This script helps extract OAuth2 credentials from the JSON file
 * downloaded from Google Cloud Console.
 */

const fs = require('fs');
const path = require('path');

// Read the service account JSON file
const serviceAccountPath = path.join(__dirname, 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('\n❌ Service account file not found!');
  console.log('\n📋 To set up OAuth2:');
  console.log('1. Go to Google Cloud Console → https://console.cloud.google.com/');
  console.log('2. Enable Google Drive API');
  console.log('3. Create Service Account credentials');
  console.log('4. Download the JSON key file');
  console.log('5. Save it as "service-account.json" in the project root');
  console.log('6. Share your Shared Drive with the service account email');
  console.log('\n📄 The JSON file should contain:');
  console.log('   - client_email (service account email)');
  console.log('   - private_key (RSA private key)');
  console.log('   - project_id');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  console.log('\n✅ Service account file found!');
  console.log('\n📧 Service Account Email:', serviceAccount.client_email);
  console.log('🔑 Project ID:', serviceAccount.project_id);
  
  console.log('\n📝 Add these to your .env file:');
  console.log('GOOGLE_CLIENT_EMAIL=' + serviceAccount.client_email);
  console.log('GOOGLE_PRIVATE_KEY="' + serviceAccount.private_key + '"');
  console.log('GOOGLE_DRIVE_FOLDER_ID=your-shared-drive-id');
  
  console.log('\n🔗 Next steps:');
  console.log('1. Copy the above lines to your .env file');
  console.log('2. Share your Shared Drive with: ' + serviceAccount.client_email);
  console.log('3. Give the service account "Content Manager" permissions');
  console.log('4. Restart the server');
  
} catch (error) {
  console.error('\n❌ Error reading service account file:', error.message);
  process.exit(1);
}
