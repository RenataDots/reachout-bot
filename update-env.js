/**
 * Update .env with OAuth2 credentials and folder ID
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

const newEnvContent = `GOOGLE_CLIENT_EMAIL=reachoutbot-service@ee-dots-monitoring.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/n8ZZAu5SEU66
NexbKmfyWf6K4/zdVNdHSDoKwf4Qg5JQevLhkg84fmm24kZKuwbiax9oWTQ46cKo
mmn0ASEjfTud7A+Df01gSC8orleVt1e3/RDwEaf668AhGmvMk1pbXm/XINijOYKP
SECCSXvVGs8bjQcJzQPY8xqlH9tkGjeivmFbp4HdEWeftU3VyxbYCj86rCk0bwOO
ZM5Nk8RZNuMwpHxSVfASPaQqNassIwXXXqqDowuSI0xsdXBIrQtbSd3o7WK0glTY
wNnd/gmN8XX4KxFfXtZc2HivpknxdViqX/caUQPQ7h+azUVdAVyon66dpqp3Ajc6
1AkwVh7jAgMBAAECggEAGzN7/XCsEdxBF6/F4F8RqFZcCq04XNbJRGYdTx+giAmV
QHVjet+352YSbZKLNdp8rLFWIQLgpd+Q8UwSFEAAyz/gsZcr0JfGjQ9SGm09I5SG
ECkNOXbYKIdEm65bdQvJvMSYDaqs9eaZAOvZtGTn/iUzFw8a26pNjINd2ei+xOOw
6e0FDXtwNRxo3HPZdMW/otzONQyDVu7hcc5k+dDUowJnlDUjjpY8GTv6e5/k2Qgn
9MKlmaXy4l0+aSGuznMiOyPGDwc6otYsOY7La/YYsbOYxkKSA5Lp0WLbAeRdE+0G
rO2/Tri+xx6Uu/NPnuHFmSt1q1GZ02hzm3IsJtvGKQKBgQDmdJr9DvvilPWkh2u1
ufT8Vc57E/tSNSLQbYSzEJmdYt8z2XQoMkcr59JJCbTEyT0kVkQac4Ut+TZoEOt
l2C0fXWU6cGJhPQ2+mnbdXiZsbUh8REZPyo32+SnSQ5Xk2Lr5D3OVxgUQVd47Z8h
gNDxj94f5GqdwRPLf6vVtrB8tRwKBgQDU3UrMVM1eKLGEDg8J0tNQH984o4wz4sF
jdWpHwayfHDvSDSxRRVmtzuRxZmONgVUxCJ0EBAVqO7fmBp23xY87CyEQCOwLH6aV
rO2/Tri+xx6Uu/NPnuHFmSt1q1GZ02hzm3IsJtvGKQKBgQCHHWahZ9+WgO9kf2FPMq/
IIiblUlnPYQgAW7WpptnpxMZIh/3qc0/3FfvchqxNlA8c9tcHCyPSSIL1kLXzCEOsV/
25vZpwmHMuhTGbqE+u0oPlF8KBlaiWXI+Aj8+aVNeKntyNu4PMiAu7mKWKghXGJqK6E
j6JPGOJlSBAJOJCkQKBgBlYG77GXglW+QPLFLlLs8M3eEFrH5dR6UqpQTU39xCesP
SqgttOUYYjOwnRcgr4GieTafZ/cBGc+KFXqlGmIQ6bnZ0mIsyUQSZY0fzScxsBZqhV
HwdxMP2AonZcS8uDaphLKMp4lFvRDpBbB7G4A8ylOmOhGlZvWyTGgXvV25xtAoGBAM
EXqU7LZcaQSWIJ5zpNOZ29x8o9TvGJWzl5/WbWcoUVAUds5hl5jnTkihEjlXJCrg
aOfftF7gZ+9tGr0hUkMfjeZnoBdJ36BGX6IAAc2IsPNQ1NqWtrcQ2dEQK7hW/2c
N2KSFwTZR5zrlHslbiLiLQsRcs0bhe7Yxw128xIIL1
-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID=1jTSfrurEvIr6_IWBq7aILI26iCfi9kGE`;

try {
  fs.writeFileSync(envPath, newEnvContent, 'utf8');
  console.log('\n✅ .env file updated successfully!');
  console.log('\n📋 Added:');
  console.log('   ✅ GOOGLE_CLIENT_EMAIL');
  console.log('   ✅ GOOGLE_PRIVATE_KEY');
  console.log('   ✅ GOOGLE_DRIVE_FOLDER_ID');
  console.log('\n🔗 Next steps:');
  console.log('1. Share your Shared Drive with: reachoutbot-service@ee-dots-monitoring.iam.gserviceaccount.com');
  console.log('2. Give service account "Content Manager" permissions');
  console.log('3. Restart server and test connection');
  console.log('\n🧪 Test endpoints:');
  console.log('   http://localhost:3000/api/google-drive/test');
  console.log('   http://localhost:3000/api/google-drive/templates');
} catch (error) {
  console.error('\n❌ Error updating .env file:', error.message);
  console.log('\n📝 Please manually copy these lines to your .env file:');
  console.log(newEnvContent);
}
