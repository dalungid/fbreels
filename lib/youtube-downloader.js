const ytdl = require('ytdl-core');

async function downloadYouTube(url) {
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestvideo',
      filter: format => format.hasVideo && format.hasAudio
    });
    
    return {
      url: format.url,
      title: info.videoDetails.title
    };
  } catch (e) {
    throw new Error(`Gagal mengunduh YouTube: ${e.message}`);
  }
}

module.exports = { downloadYouTube };