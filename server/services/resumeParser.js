const pdfParse = require('pdf-parse');
const fs = require('fs');

const parseResume = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (err) {
    console.error('Resume parse error:', err.message);
    return null;
  }
};

module.exports = { parseResume };
