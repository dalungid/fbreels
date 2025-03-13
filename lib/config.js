const fs = require('fs');
const path = require('path');

const defaultConfig = {
  text: "FB: GameBoo",
  font_size: 24,
  font_color: "#FFFFFF",
  alpha: 0.7,
  shadow_offset: 1,
  access_token: "",
  page_id: ""
};

function getConfig() {
  try {
    const userConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
    return { ...defaultConfig, ...userConfig }; // Merge config
  } catch (e) {
    return defaultConfig;
  }
}

function updateConfig(newData) {
  const current = getConfig();
  const updated = { ...defaultConfig, ...current, ...newData }; // Pastikan default selalu dipakai
  fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(updated, null, 2));
}

module.exports = { getConfig, updateConfig };