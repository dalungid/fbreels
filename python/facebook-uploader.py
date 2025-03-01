import sys
import os
import re
import requests
from urllib.parse import quote

FB_PAGE_ID = os.getenv('FB_PAGE_ID')
FB_TOKEN = os.getenv('FB_PAGE_TOKEN')

def clean_text(text):
    # Hapus emoji dan karakter tidak valid
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    # Hapus karakter khusus
    return text.strip()[:2200]

def extract_hashtags(text):
    hashtags = re.findall(r'#\w+', text)
    return ' '.join(hashtags[:5])  # Ambil maksimal 5 hashtag

def upload_to_reels(video_path, description, author):
    try:
        # Bersihkan deskripsi
        clean_desc = clean_text(description)
        hashtags = extract_hashtags(clean_desc)
        
        # Format caption
        caption = f"{clean_desc}\n\nCredit: @{author}\n{hashtags} #TikTok #Viral #FYP"
        
        url = f'https://graph.facebook.com/{FB_PAGE_ID}/video_reels'
        
        with open(video_path, 'rb') as video_file:
            files = {'video_file': video_file}
            data = {
                'access_token': FB_TOKEN,
                'caption': caption,
                'published': 'true'
            }
            
            response = requests.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        print(f"Upload error: {str(e)}")
        return None

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python facebook-uploader.py <video_path> <description> <author>")
        sys.exit(1)
        
    video_path = sys.argv[1]
    description = sys.argv[2]
    author = sys.argv[3] if len(sys.argv) > 3 else "Unknown"
    
    result = upload_to_reels(video_path, description, author)
    if result:
        print(f"Successfully uploaded! ID: {result.get('id', 'Unknown')}")
    else:
        print("Upload failed")