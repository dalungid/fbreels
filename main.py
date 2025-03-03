# -*- coding: utf-8 -*-
import os
import re
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from ffmpeg import FFmpeg
from dotenv import load_dotenv

load_dotenv()

class TikTokAutoUploader:
    def __init__(self):
        self.fb_page_id = os.getenv('FB_PAGE_ID')
        self.fb_token = os.getenv('FB_PAGE_TOKEN')
        self.driver = self.init_whatsapp()
        self.wait = WebDriverWait(self.driver, 30)

    def init_whatsapp(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('user-data-dir=./sessions')
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.get('https://web.whatsapp.com/')
        return driver

    def listen_messages(self):
        print('Menunggu pesan...')
        while True:
            try:
                unread = self.wait.until(EC.presence_of_element_located(
                    (By.XPATH, '//div[@class="_1pJ9J"]')))
                if unread:
                    self.process_new_messages()
            except:
                pass
            time.sleep(5)

    def process_new_messages(self):
        messages = self.driver.find_elements(
            By.XPATH, '//div[contains(@class,"message-in")]')
        
        for msg in messages[-5:]:  # Cek 5 pesan terakhir
            if not msg.get_attribute('data-id'):
                continue

            text_element = msg.find_element(By.CLASS_NAME, '_21Ahp')
            text = text_element.text
            
            if text.startswith(('!s', '!l')):
                self.handle_command(msg, text)

    def handle_command(self, msg, text):
        try:
            if text.startswith('!s'):
                parts = text.split(' ', 1)
                if len(parts) < 2:
                    raise ValueError("Format command salah")
                link = parts[1]
                self.process_single(link)
                self.reply(msg, '[SUKSES] Video berhasil diproses!')
                
            elif text.startswith('!l'):
                links = [ln for ln in text.split('\n')[1:] if ln.strip()]
                for link in links:
                    self.process_single(link)
                    time.sleep(30)
                reply_text = '[SUKSES] {} video selesai diproses!'.format(len(links))
                self.reply(msg, reply_text)
                
        except Exception as e:
            error_msg = '[ERROR] {}'.format(str(e))
            self.reply(msg, error_msg)

    def reply(self, msg, text):
        msg.click()
        input_box = self.driver.find_element(By.XPATH, '//div[@title="Ketikan pesan"]')
        input_box.send_keys(text + '\n')

    def download_tiktok(self, url):
        api_url = 'https://www.tikwm.com/api/'
        response = requests.post(api_url + 'ajax', json={
            'url': url,
            'count': 1,
            'hd': 1
        })
        
        data = response.json()['data']
        return {
            'video_url': data['play'],
            'description': data['title'],
            'author': data['author']['nickname']
        }

    def edit_metadata(self, input_path, metadata):
        output_path = './output/{}.mp4'.format(int(time.time()))
        
        ffmpeg = FFmpeg().option('y').input(
            input_path,
            **{'headers': 'Referer: https://www.tiktok.com/'}
        ).output(
            output_path,
            **{
                'metadata': 'title="{}"'.format(metadata['description']),
                'metadata:s:v': 'title="TikTok Video"',
                'metadata:s:a': 'title="TikTok Audio"',
                'metadata:g': [
                    'software=Wondershare Filmora',
                    'date={}'.format(time.strftime("%Y-%m-%d")),
                    'copyright=Original by {}'.format(metadata['author'])
                ],
                'c': 'copy'
            }
        )
        ffmpeg.execute()
        return output_path

    def upload_to_facebook(self, video_path, metadata):
        caption = "{}\n\nCredit: @{} #TikTok #Viral".format(
            metadata['description'],
            metadata['author']
        )
        
        with open(video_path, 'rb') as f:
            response = requests.post(
                'https://graph.facebook.com/{}/video_reels'.format(self.fb_page_id),
                files={'video_file': f},
                data={
                    'access_token': self.fb_token,
                    'caption': caption,
                    'published': 'true'
                }
            )
        return response.json()

    def process_single(self, url):
        # Download video
        data = self.download_tiktok(url)
        
        # Simpan video sementara
        temp_path = './temp_{}.mp4'.format(int(time.time()))
        with open(temp_path, 'wb') as f:
            f.write(requests.get(data['video_url']).content)
        
        # Edit metadata
        edited_path = self.edit_metadata(temp_path, data)
        
        # Upload ke Facebook
        self.upload_to_facebook(edited_path, data)
        
        # Bersihkan file
        os.remove(temp_path)
        os.remove(edited_path)

if __name__ == '__main__':
    bot = TikTokAutoUploader()
    bot.listen_messages()