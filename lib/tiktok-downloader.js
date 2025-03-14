const axios = require('axios');

async function downloadTikTok(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl);
    
    if (response.data.code !== 0) throw new Error('URL TikTok tidak valid');
    
    return {
      url: response.data.data.play || response.data.data.wmplay,
      title: response.data.data.title
    };
  } catch (e) {
    throw new Error(`Gagal mengunduh TikTok: ${e.message}`);
  }
}

module.exports = { downloadTikTok };