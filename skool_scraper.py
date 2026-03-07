import re
import requests
from bs4 import BeautifulSoup

URL = "https://www.skool.com/freedom-in-time-9860/classroom/f8e9b18b?md=7536a446085f418aaab52cf1b41dcc55"

COOKIES = {
    "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDM1MzcxNTAsImlhdCI6MTc3MjAwMTE1MCwidXNlcl9pZCI6IjE4N2NiNTVhNDU0NjRlMjk4OTA3MmE4YzQ2MzRkOWI2In0.c4i6cD_P6BMnKwHt0HjUSYLvJyo7yxtYFNpCtJ0wm5Y",
    "client_id": "c525c7d3fc984ce196f2b3ee27990e40",
    "aws-waf-token": "7cafe1a2-bcc6-4d1a-beaf-d65303068bb8:EQoAbZQZPKmAAAAA:DtHAFL6vvmfZmiuRVC4G6wYomc7TVHAXAg+AUslPivxfCXJOHVNOgKHXaKRA+gleh8ln8dYlJLzd3D3+B+tu/splxmpwALWkloZyUyiLMC3Xmn/KL3g5TCNowBYwdWSvDInjRTSLyyun8Mpyq6hz5LWU6r2BhhQk22GQwh74+ean5hUxLuE0dVldRgbVlZaAhfComhA6hjyslbqa2tsh2m0Px3CL/LOC4ftkZYT6VjWPd3mxm2BsrHgpNv+FemvIPrldDg==",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.skool.com/",
}

SKIP_DOMAINS = [
    "skool.com","fonts.google","w3.org","googleapis.com",
    "twitter.com","instagram.com","linkedin.com","facebook.com",
    "youtube.com","youtu.be","ytimg.com","vimeo.com","vimeocdn.com",
    "loom.com","stripe.com","assets.skool","api2.skool","ct.skool",
]

print(f"Fetching page...")
resp = requests.get(URL, cookies=COOKIES, headers=HEADERS, timeout=30)
print(f"Status: {resp.status_code}")

if resp.status_code != 200:
    print("ERROR: Session may have expired. Re-copy aws-waf-token from browser.")
    exit(1)

soup = BeautifulSoup(resp.text, "html.parser")
all_links = set()

for tag in soup.find_all("a", href=True):
    href = tag["href"].strip()
    if href.startswith("http"):
        all_links.add(href)

for url in re.findall(r"https?://[^\s\"'<>\\]+", resp.text):
    all_links.add(url.rstrip("\\)/,;"))

def is_external(url):
    return not any(skip in url for skip in SKIP_DOMAINS)

external = sorted(filter(is_external, all_links))

download_keywords = [
    "drive.google","mega.nz","dropbox.com","mediafire",
    "canva.com/design","sellar.com","gumroad","payhip",
    ".zip",".pdf",".mp4",".rar",".docx",".pptx"
]

download_links = [u for u in external if any(k in u for k in download_keywords)]
other_links = [u for u in external if u not in download_links]

print(f"\n{'='*60}")
print(f"DOWNLOAD / RESOURCE LINKS ({len(download_links)} found)")
print(f"{'='*60}")
for link in download_links:
    print(link)

print(f"\n{'='*60}")
print(f"OTHER EXTERNAL LINKS ({len(other_links)} found)")
print(f"{'='*60}")
for link in other_links:
    print(link)

with open("plr_links.txt", "w") as f:
    f.write("DOWNLOAD / RESOURCE LINKS\n" + "="*60 + "\n")
    for link in download_links:
        f.write(link + "\n")
    f.write("\nOTHER EXTERNAL LINKS\n" + "="*60 + "\n")
    for link in other_links:
        f.write(link + "\n")

print(f"\nSaved to plr_links.txt — {len(external)} total links found.")
