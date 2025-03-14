const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getConfig } = require('./config');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

puppeteer.use(StealthPlugin());

async function uploadReels(videoPath, description) {
  const config = getConfig().chrome;
  const browser = await puppeteer.launch({
    headless: config.headless,
    userDataDir: path.resolve(config.profile_path),
    executablePath: config.executable_path || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=LockProfileCookieDatabase',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  try {
    // Bypass automation detection
    await page.evaluateOnNewDocument(() => {
      delete navigator.__proto__.webdriver;
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
    });

    // Navigate to Reels composer
    await page.goto('https://business.facebook.com/latest/reels_composer', {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });

    // Upload video
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('div[aria-label="Tambahkan Video"]')
    ]);
    await fileChooser.accept([path.resolve(videoPath)]);
    
    // Wait for upload
    await page.waitForSelector('text/Video Anda telah diunggah', { 
      timeout: config.timeout 
    });

    // Input description
    await page.type('div[aria-label="Jelaskan reel Anda"]', description);

    // Handle next steps
    const nextButtons = await page.$$x('//div[contains(text(), "Berikutnya")]');
    for(const btn of nextButtons) {
      await btn.click();
      await page.waitForTimeout(3000);
    }

    // Publish
    await page.click('div[aria-label="Bagikan Sekarang"]');
    await page.waitForSelector('text/Reels Anda sedang diproses', { 
      timeout: config.timeout 
    });

    return { success: true, id: uuidv4() };
  } catch (e) {
    const screenshotPath = `error-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath });
    return { 
      success: false, 
      error: e.message,
      screenshot: screenshotPath
    };
  } finally {
    await browser.close();
  }
}

module.exports = { uploadReels };