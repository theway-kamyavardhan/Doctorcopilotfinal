import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'public', 'icons', 'favicon.svg');
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Create background for maskable and apple-touch-icon
    const bgRect = Buffer.from(
      `<svg width="512" height="512"><rect width="100%" height="100%" fill="#02040a"/></svg>`
    );

    // icon-192.png
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsDir, 'icon-192.png'));
    console.log('Created icon-192.png');

    // icon-512.png
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon-512.png'));
    console.log('Created icon-512.png');

    // icon-maskable-512.png
    const resizedLogoMaskable = await sharp(svgBuffer).resize(360, 360).toBuffer();
    await sharp(bgRect)
      .composite([{ input: resizedLogoMaskable, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
    console.log('Created icon-maskable-512.png');

    // apple-touch-icon.png (180x180)
    const bgRectApple = Buffer.from(
      `<svg width="180" height="180"><rect width="100%" height="100%" fill="#02040a"/></svg>`
    );
    const resizedLogoApple = await sharp(svgBuffer).resize(140, 140).toBuffer();
    await sharp(bgRectApple)
      .composite([{ input: resizedLogoApple, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
    console.log('Created apple-touch-icon.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
