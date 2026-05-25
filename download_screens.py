import json
import os
import urllib.request
import re

json_file = r"C:\Users\joaov\.gemini\antigravity\brain\01452fd6-978e-4fd4-90d3-775b8679a96a\.system_generated\steps\28\output.txt"
dest_dir = r"c:\Users\joaov\Desktop\TCC\.stitch\designs"

os.makedirs(dest_dir, exist_ok=True)

with open(json_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

for screen in data.get('screens', []):
    screen_id = screen.get('name', '').split('/')[-1]
    title = screen.get('title', 'Unknown').replace(' ', '_')
    # Remove invalid characters for filenames
    title = re.sub(r'[^a-zA-Z0-9_]', '', title)
    device = screen.get('deviceType', 'UNKNOWN')
    
    filename_base = f"{title}_{device}_{screen_id[:8]}"
    print(f"Downloading {filename_base}...")
    
    # Download Screenshot
    screenshot_url = screen.get('screenshot', {}).get('downloadUrl')
    if screenshot_url:
        try:
            req = urllib.request.Request(screenshot_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                with open(os.path.join(dest_dir, f"{filename_base}.png"), 'wb') as out_file:
                    out_file.write(response.read())
        except Exception as e:
            print(f"  -> Error downloading image: {e}")
            
    # Download HTML
    html_url = screen.get('htmlCode', {}).get('downloadUrl')
    if html_url:
        try:
            req = urllib.request.Request(html_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                with open(os.path.join(dest_dir, f"{filename_base}.html"), 'wb') as out_file:
                    out_file.write(response.read())
        except Exception as e:
            print(f"  -> Error downloading HTML: {e}")

print("All screens downloaded successfully.")
