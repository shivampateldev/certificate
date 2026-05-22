const fs = require('fs');
const path = require('path');

const getFontsDir = () => {
  const paths = [
    path.join(__dirname, '..', 'uploads', 'fonts'),
    path.join(__dirname, '..', '..', 'uploads', 'fonts'),
    path.join(process.cwd(), 'uploads', 'fonts'),
    path.join(process.cwd(), 'server', 'uploads', 'fonts')
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  
  const defaultPath = path.join(__dirname, '..', 'uploads', 'fonts');
  fs.mkdirSync(defaultPath, { recursive: true });
  return defaultPath;
};

const getCustomFonts = () => {
  try {
    const fontsDir = getFontsDir();
    const files = fs.readdirSync(fontsDir);
    const fonts = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.ttf' || ext === '.otf') {
        const name = path.basename(file, ext);
        const fontBuffer = fs.readFileSync(path.join(fontsDir, file));
        fonts.push({
          name,
          fileName: file,
          base64: fontBuffer.toString('base64'),
          format: ext === '.ttf' ? 'truetype' : 'opentype',
          path: path.join(fontsDir, file)
        });
      }
    }
    return fonts;
  } catch (error) {
    console.error('Error reading custom fonts:', error.message);
    return [];
  }
};

module.exports = { getCustomFonts, getFontsDir };
