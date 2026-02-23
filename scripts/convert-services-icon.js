/**
 * Converts assets/images/services.svg to PNG for use in the native tab bar.
 * Run: node scripts/convert-services-icon.js
 */
const path = require("path");
const fs = require("fs");

const svgPath = path.join(__dirname, "../assets/images/services.svg");
const pngPath = path.join(__dirname, "../assets/images/services.png");

async function convert() {
  try {
    const sharp = require("sharp");
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(pngPath);
    console.log("Created assets/images/services.png");
  } catch (err) {
    console.error("Conversion failed. Ensure sharp is installed: npm install --save-dev sharp");
    console.error(err.message);
    process.exit(1);
  }
}

convert();
