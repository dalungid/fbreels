const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { getConfig } = require('./config-manager');

const API_VERSION = 'v22.0';

async function checkTokenValidity() {
  const { access_token } = getConfig();
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/me`,
      { params: { access_token } }
    );
    return response.status === 200;
  } catch (e) {
    return false;
  }
}

async function uploadToFacebook(videoPath, description) {
  const { access_token, page_id, text } = getConfig();
  
  try {
    // Step 1: Start upload session
    const startUrl = `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`;
    const startResponse = await axios.post(startUrl, {
      upload_phase: "start",
      access_token
    });

    const { video_id, upload_url } = startResponse.data;
    
    // Step 2: Upload video
    const form = new FormData();
    const videoStream = fs.createReadStream(videoPath);
    form.append('video_file_chunk', videoStream);
    
    await axios.post(upload_url, form, {
      headers: form.getHeaders(),
      params: { access_token }
    });

    // Step 3: Finish upload
    const finishUrl = `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`;
    await axios.post(finishUrl, {
      upload_phase: "finish",
      video_id,
      description,
      title: text,
      access_token
    });

    return true;
  } catch (e) {
    throw new Error(`Upload gagal: ${e.response?.data?.error?.message || e.message}`);
  }
}

module.exports = { checkTokenValidity, uploadToFacebook };