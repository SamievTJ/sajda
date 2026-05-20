import urllib.request
import json

url = 'http://api.aladhan.com/v1/timingsByCity/19-05-2026?city=Dushanbe&country=Tajikistan&method=99&methodSettings=18,null,17&school=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    t = data['data']['timings']
    print(f"Aladhan Custom: Fajr {t['Fajr']}, Dhuhr {t['Dhuhr']}, Asr {t['Asr']}, Maghrib {t['Maghrib']}, Isha {t['Isha']}")
except Exception as e:
    print('Error:', e)
