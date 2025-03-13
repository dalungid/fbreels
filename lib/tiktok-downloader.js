const axios = require('axios');

async function downloadTikTok(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl);
    
    if (response.data.code !== 0) throw new Error('Invalid TikTok URL');
    
    return {
      url: response.data.data.play || response.data.data.wmplay,
      title: response.data.data.title
    };
  } catch (e) {
    throw new Error('TikTok Download Error: ' + e.message);
  }
}

module.exports = { downloadTikTok };