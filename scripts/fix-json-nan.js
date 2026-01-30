/**
 * One-off script: replace unquoted NaN in JSON with null so the file is valid JSON.
 * Run from project root: node scripts/fix-json-nan.js
 */

const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "..", "data", "State_City_Data_Final.json");
let text = fs.readFileSync(jsonPath, "utf8");

// Replace literal NaN (value) with null. In JSON, NaN appears after : or ,.
// Use regex to avoid replacing "NaN" inside strings.
const before = text.length;
text = text.replace(/: NaN\b/g, ": null").replace(/, NaN\b/g, ", null");
const replaced = (text.match(/: null\b|, null\b/g) || []).length;

fs.writeFileSync(jsonPath, text, "utf8");
console.log("Replaced NaN with null. File written to", jsonPath);

// Quick parse check
JSON.parse(text);
console.log("JSON.parse succeeded.");
