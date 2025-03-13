const axios = require('axios');
const fs = require('fs');
const { getConfig } = require('./config');

const API_VERSION = 'v22.0';

async function uploadVideo(videoPath, title, description) {
  const { access_token, page_id } = getConfig();
  
  try {
    // Step 1: Initialize upload session
    const startUrl = `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`;
    const startRes = await axios.post(startUrl, {
      upload_phase: "start",
      access_token
    });

    if (startRes.status !== 200) {
      throw new Error(`Init failed: ${JSON.stringify(startRes.data)}`);
    }

    const { video_id, upload_url } = startRes.data;
    if (!video_id || !upload_url) {
      throw new Error("Invalid Facebook response");
    }

    // Step 2: Upload video
    const fileSize = fs.statSync(videoPath).size;
    const headers = {
      "Authorization": `OAuth ${access_token}`,
      "offset": "0",
      "file_size": fileSize.toString(),
      "Content-Type": "application/octet-stream"
    };

    const videoStream = fs.createReadStream(videoPath);
    const uploadRes = await axios.post(upload_url, videoStream, { headers });

    if (uploadRes.status !== 200) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadRes.data)}`);
    }

    // Step 3: Check upload status
    let uploadComplete = false;
    for (let i = 0; i < 10; i++) {
      const statusRes = await axios.get(
        `https://graph.facebook.com/${API_VERSION}/${video_id}`,
        { params: { access_token, fields: "status" } }
      );
      
      if (statusRes.data.status?.uploading_phase?.status === "complete") {
        uploadComplete = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!uploadComplete) {
      throw new Error("Upload timeout");
    }

    // Step 4: Publish
    const form = new FormData();
    form.append('access_token', access_token);
    form.append('video_id', video_id);
    form.append('upload_phase', 'finish');
    form.append('video_state', 'PUBLISHED');
    form.append('title', title);
    form.append('description', description);

    const publishRes = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`,
      form,
      { headers: form.getHeaders() }
    );

    return publishRes.data.id ? true : false;

  } catch (e) {
    const error = e.response?.data?.error || {};
    throw new Error(`Facebook Error [${error.code}]: ${error.message}`);
  }
}

module.exports = { uploadVideo };