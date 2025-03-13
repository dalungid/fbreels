const ytdl = require('ytdl-core');

async function downloadYouTube(url) {
  try {
    const info = await ytdl.getInfo(url);
    return {
      url: ytdl.chooseFormat(info.formats, { quality: 'highest' }).url,
      title: info.videoDetails.title
    };
  } catch (e) {
    throw new Error('YouTube Download Error: ' + e.message);
  }
}

module.exports = { downloadYouTube };