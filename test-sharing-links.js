/**
 * Test Google Drive sharing links functionality
 */

const testSharingLinks = [
  "https://docs.google.com/document/d/1lOLcYtD2saAtZln15Tl4iy-WKxfo7GtG43zhEXN0DSk/edit?usp=sharing",
];

console.log("🧪 Testing Google Drive sharing links...");
console.log("\n📋 Example sharing link format:");
console.log("https://drive.google.com/file/d/FILE_ID/view?usp=sharing");
console.log("\n📝 To test:");
console.log("1. Replace testSharingLinks array with your actual sharing links");
console.log("2. Run: node test-sharing-links.js");
console.log("3. Or test via API: POST /api/google-drive/templates/from-links");

console.log("\n🔗 Current test links:");
testSharingLinks.forEach((link, index) => {
  console.log(`${index + 1}. ${link}`);
});

if (testSharingLinks.length === 0) {
  console.log("\n⚠️  No sharing links configured");
  console.log(
    "📝 Add your Google Drive sharing links to testSharingLinks array",
  );
}
