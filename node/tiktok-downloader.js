const axios = require('axios');
const { execSync } = require('child_process');
const { editMetadata } = require('./metadata-editor');
const fs = require('fs');
const path = require('path');

const API_ENDPOINT = 'https://www.tikwm.com/api/';

async function downloadTikTok(url) {
    try {
        const response = await axios.post(API_ENDPOINT + 'ajax', {
            url: url,
            count: 1,
            hd: 1
        });
        
        const data = response.data.data;
        return {
            videoUrl: data.play,
            description: data.title,
            author: data.author.nickname
        };
    } catch (error) {
        throw new Error('Gagal download TikTok: ' + error.message);
    }
}

async function processSingle(link) {
    try {
        const videoData = await downloadTikTok(link);
        const editedData = await editMetadata(videoData);
        
        const pythonCmd = `python ${path.join(__dirname, '../python/facebook-uploader.py')} \
            "${editedData.outputPath}" \
            "${editedData.description}" \
            "${editedData.author}"`;
        
        execSync(pythonCmd, { stdio: 'inherit' });
        return true;
    } catch (error) {
        throw error;
    }
}

async function processBatch(links) {
    for(const [index, link] of links.entries()) {
        try {
            await processSingle(link);
            if(index < links.length-1) {
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        } catch (error) {
            console.error(`Gagal memproses ${link}:`, error.message);
        }
    }
}

module.exports = { processSingle, processBatch };