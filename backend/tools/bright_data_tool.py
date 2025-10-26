import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from brightdata import bdclient
from bs4 import BeautifulSoup

CUSTOMER_ID = 'hl_16f1d494'
PROXY_NAME = 'sdk_serp'
ZONE_PASSWORD = 'gypxy0lelm08' 

proxy_url = f'http://brd-customer-{CUSTOMER_ID}-zone-{PROXY_NAME}:{ZONE_PASSWORD}@brd.superproxy.io:33335'

proxies = {
    'http': proxy_url,
    'https': proxy_url
}

url = "https://www.google.com/search?q=figmaguide&num=10&brd_json=1"
response = requests.get(url, proxies=proxies, verify=False)
data = response.json()

links = [result['link'] for result in data.get('organic', [])]
print(links)

import json

client = bdclient(api_token="d88ddda820aab54aa356eeeda830f1c3be73c26b00f55fd3af20e801f64fd9b0")

results = []

for link in links:
    try:
        html = client.scrape(url=link)
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove unwanted tags
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe']):
            tag.decompose()
        
        # Extract main content
        main = soup.find('main') or soup.find('article') or soup.body
        text = main.get_text(separator='\n', strip=True) if main else soup.get_text(separator='\n', strip=True)
        
        results.append({
            'url': link,
            'content': text
        })
        
        print(f'✅ Scraped: {link}')
        
    except Exception as e:
        print(f'❌ Failed: {link} - {e}')
        results.append({
            'url': link,
            'error': str(e)
        })

# Save to text file
with open('scraped_results.txt', 'w', encoding='utf-8') as f:
    for item in results:
        f.write(f"{'='*80}\n")
        f.write(f"URL: {item['url']}\n")
        f.write(f"{'='*80}\n")
        if 'error' in item:
            f.write(f"ERROR: {item['error']}\n")
        else:
            f.write(item['content'])
        f.write(f"\n\n")

print(f'\n💾 Saved {len(results)} results to scraped_results.txt')
