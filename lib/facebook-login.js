const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getConfig } = require('./config');

puppeteer.use(StealthPlugin());

(async () => {
  const config = getConfig().chrome;
  
  console.log('🚀 Membuka browser untuk login Facebook...');
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: config.profile_path,
    executablePath: config.executable_path || undefined,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://facebook.com', {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });

    console.log('🔑 Silakan login ke Facebook di browser yang terbuka...');
    
    // Tunggu sampai login berhasil
    await page.waitForSelector('[aria-label="Profil Anda"]', { 
      timeout: 0 
    });

    console.log('✅ Login berhasil! Profil tersimpan di:', config.profile_path);
  } catch (e) {
    console.error('❌ Gagal login:', e.message);
  } finally {
    await browser.close();
  }
})();