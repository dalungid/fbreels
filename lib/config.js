const fs = require('fs');
const path = require('path');

const defaultConfig = {
  chrome: {
    profile_path: "./lib/data",
    executable_path: "",
    headless: false,
    timeout: 120000
  },
  watermark: {
    text: "FB: GameBoo",
    font_size: 24,
    color: "#FFFFFF",
    opacity: 0.7,
    shadow_offset: 1
  }
};

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
  } catch (e) {
    return defaultConfig;
  }
}

module.exports = { getConfig };