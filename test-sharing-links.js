/**
 * Test Local Template Functionality
 */

const testTemplates = [
  // Add your local template configurations here
  // Example: { name: "Partnership Template", content: "Template content here..." }
];

console.log("🧪 Testing local template functionality...");
console.log("\n📋 Example template format:");
console.log('{ name: "Template Name", content: "Template content..." }');
console.log("\n📝 To test:");
console.log("1. Replace testTemplates array with your actual templates");
console.log("2. Run: node test-sharing-links.js");
console.log("3. Or test via API: POST /api/templates");

console.log("\n🔗 Current test templates:");
testTemplates.forEach((template, index) => {
  console.log(`${index + 1}. ${template.name || "Unnamed template"}`);
});

if (testTemplates.length === 0) {
  console.log("\n⚠️  No templates configured");
  console.log("📝 Add your local templates to testTemplates array");
}
