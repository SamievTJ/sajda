import urllib.request
import json

url = 'http://api.aladhan.com/v1/calendarByCity/2026?city=Dushanbe&country=Tajikistan&method=99&methodSettings=18,null,17&school=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    months = data['data']
    
    # We will build a JS object: const prayers2026 = { "1": { "1": { bomdod: "05:00", ...}, "2": {...} }, "2": {...} }
    js_content = "const prayers2026 = {\n"
    
    def add_mins(t_str, mins):
        h, m = map(int, t_str.split(':'))
        total = h * 60 + m + mins
        return f"{total // 60:02d}:{total % 60:02d}"

    for month, days in months.items():
        js_content += f"  '{month}': {{\n"
        for d in days:
            day_num = d['date']['gregorian']['day']
            t = d['timings']
            # Clean timings
            fajr = t['Fajr'].split(' ')[0]
            sunrise = t['Sunrise'].split(' ')[0]
            dhuhr = t['Dhuhr'].split(' ')[0]
            asr = t['Asr'].split(' ')[0]
            maghrib = t['Maghrib'].split(' ')[0]
            isha = t['Isha'].split(' ')[0]
            
            # Apply Shuroi Ulamo offsets
            # Based on May 19 data difference:
            # Fajr: +12, Sunrise: -9 (wait, 05:10 to 05:01 is -9. Let's just use +12 for Fajr, and Sunrise is Aladhan Sunrise - 9)
            # Actually, let's keep Sunrise closer to Aladhan Sunrise.
            fajr_adj = add_mins(fajr, 12)
            sun_adj = add_mins(sunrise, -9)
            dhuhr_adj = "12:40" # Fixed
            asr_adj = add_mins(asr, 13)
            mag_adj = add_mins(maghrib, 10)
            isha_adj = add_mins(isha, -1)
            
            js_content += f"    '{int(day_num)}': {{ bomdod: '{fajr_adj}', oftob: '{sun_adj}', peshin: '{dhuhr_adj}', asr: '{asr_adj}', shom: '{mag_adj}', khuftan: '{isha_adj}' }},\n"
        js_content += "  },\n"
    js_content += "};\n\n"
    
    js_content += "if (typeof module !== 'undefined' && module.exports) { module.exports = prayers2026; }\n"
    
    with open('prayers_2026.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print('Successfully generated prayers_2026.js')
except Exception as e:
    print('Error:', e)
