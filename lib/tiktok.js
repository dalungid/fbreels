const ytdl = require('ytdl-core');

async function downloadYouTube(url) {
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    return {
      url: format.url,
      title: info.videoDetails.title
    };
  } catch (e) {
    throw new Error(`YouTube download failed: ${e.message}`);
  }
}

module.exports = { downloadYouTube };