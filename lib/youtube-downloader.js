const ytdl = require('ytdl-core');

async function downloadYouTube(url) {
  try {
    const info = await ytdl.getInfo(url);
    return {
      url: ytdl.chooseFormat(info.formats, { quality: 'highest' }).url,
      title: info.videoDetails.title
    };
  } catch (e) {
    throw new Error('Gagal mengunduh video YouTube');
  }
}

module.exports = { downloadYouTube };