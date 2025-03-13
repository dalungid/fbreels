const axios = require('axios');
const fs = require('fs');
const { getConfig, updateConfig } = require('./config-manager');

const API_VERSION = 'v22.0';
let refreshInterval = null;

async function debugToken() {
  const { access_token } = getConfig();
  try {
    const response = await axios.get(
      `https://graph.facebook.com/debug_token?input_token=${access_token}&access_token=${access_token}`
    );
    return {
      valid: response.data.data.is_valid,
      expiresAt: new Date(response.data.data.expires_at * 1000),
      scopes: response.data.data.scopes
    };
  } catch (e) {
    return { valid: false, error: e.response.data.error };
  }
}

async function refreshToken() {
  const { access_token, app_id, app_secret } = getConfig();
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: app_id,
          client_secret: app_secret,
          fb_exchange_token: access_token
        }
      }
    );
    
    updateConfig({ access_token: response.data.access_token });
    return response.data.access_token;
  } catch (e) {
    throw new Error(`Refresh failed: ${e.response.data.error.message}`);
  }
}

function scheduleRefresh(expiresAt) {
  if (refreshInterval) clearInterval(refreshInterval);
  
  const refreshTime = expiresAt - Date.now() - 300000; // 5 menit sebelum expired
  if (refreshTime > 0) {
    refreshInterval = setInterval(async () => {
      console.log('🔄 Auto-refreshing token...');
      await refreshToken();
    }, refreshTime);
  }
}

async function initializeUploader() {
  const tokenInfo = await debugToken();
  if (!tokenInfo.valid) {
    throw new Error(`Token invalid: ${tokenInfo.error.message}`);
  }
  
  scheduleRefresh(tokenInfo.expiresAt);
  console.log(`✅ Token valid until: ${tokenInfo.expiresAt.toLocaleString()}`);
  return true;
}

async function uploadVideo(videoPath, description) {
  const { access_token, page_id, text } = getConfig();
  
  try {
    // Step 1: Initialize upload
    const initResponse = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${page_id}/video_reels`,
      {
        upload_phase: "start",
        access_token,
        file_size: fs.statSync(videoPath).size
      }
    );

    const { video_id, upload_url } = initResponse.data;

    // Step 2: Upload chunk
    const headers = {
      'Authorization': `OAuth ${access_token}`,
      'offset': '0',
      'file_size': fs.statSync(videoPath).size.toString(),
      'Content-Type': 'application/octet-stream'
    };

    await axios.post(upload_url, fs.createReadStream(videoPath), { headers });

    // Step 3: Publish
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
    const error = e.response?.data?.error || { code: 0, message: 'Unknown error' };
    throw new Error(`[${error.code}] ${error.message}`);
  }
}

module.exports = { initializeUploader, uploadVideo, debugToken, refreshToken };