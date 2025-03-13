const axios = require('axios');
const fs = require('fs');
const { getConfig } = require('./config-manager');

const API_VERSION = 'v22.0';

async function checkTokenValidity() {
  const { access_token } = getConfig();
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/me/accounts`,
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
    // Step 1: Initialize upload session
    const startResponse = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`,
      {
        upload_phase: "start",
        access_token,
        file_size: fs.statSync(videoPath).size
      }
    );

    const { video_id, upload_url } = startResponse.data;
    
    // Step 2: Upload video chunk
    const headers = {
      'Authorization': `OAuth ${access_token}`,
      'offset': '0',
      'file_size': fs.statSync(videoPath).size.toString(),
      'Content-Type': 'application/octet-stream'
    };

    const videoStream = fs.createReadStream(videoPath);
    await axios.post(upload_url, videoStream, { headers });
    
    // Step 3: Publish reel
    const publishParams = new URLSearchParams({
      access_token,
      video_id,
      upload_phase: "finish",
      video_state: "PUBLISHED",
      description,
      title: text
    });

    await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`,
      publishParams,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return true;
  } catch (e) {
    let errorMessage = 'Unknown error';
    if (e.response) {
      errorMessage = e.response.data.error?.message || JSON.stringify(e.response.data);
    }
    throw new Error(`Facebook Upload Error: ${errorMessage}`);
  }
}

module.exports = { checkTokenValidity, uploadToFacebook };