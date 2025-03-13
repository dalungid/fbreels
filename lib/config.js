const fs = require('fs');
const path = require('path');

const defaultConfig = {
  text: "FB: GameBoo",
  font_size: 24,
  font_color: "#FFFFFF",
  alpha: 0.7,
  shadow_offset: 1,
  access_token: "",
  page_id: "",
  app_id: "1136666327769765",
  app_secret: "7571e7d04635a55e6336823787d655a9"
};

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
  } catch (e) {
    return defaultConfig;
  }
}

function updateConfig(newData) {
  const current = getConfig();
  const updated = { ...current, ...newData };
  fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(updated, null, 2));
}

module.exports = { getConfig, updateConfig };