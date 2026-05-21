import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html','r',encoding='utf-8') as f:
    html = f.read()

# Find all data-i18n keys used in HTML
keys = set(re.findall(r'data-i18n="([^"]+)"', html))
keys.update(re.findall(r'data-i18n-ph="([^"]+)"', html))

with open('lang.js','r',encoding='utf-8') as f:
    lang = f.read()

# Split into TJ and RU sections
tj_section = lang[:lang.find("ru:")]
ru_section = lang[lang.find("ru:"):]

print("=== HTML keys missing from lang.js ===")
for k in sorted(keys):
    in_tj = k in tj_section
    in_ru = k in ru_section
    if not in_tj or not in_ru:
        status = ""
        if not in_tj: status += " [MISSING TJ]"
        if not in_ru: status += " [MISSING RU]"
        print(f"  {k}{status}")

# Count keys per section
tj_keys = re.findall(r'^\s*(\w+)\s*:', tj_section, re.M)
ru_keys = re.findall(r'^\s*(\w+)\s*:', ru_section, re.M)
print(f"\nTJ keys count: {len(tj_keys)}")
print(f"RU keys count: {len(ru_keys)}")

# Check for keys in TJ but not RU and vice versa
tj_set = set(tj_keys)
ru_set = set(ru_keys)
# Remove non-translation items
for s in [tj_set, ru_set]:
    s.discard('tj')
    s.discard('ru')

only_tj = tj_set - ru_set
only_ru = ru_set - tj_set
if only_tj:
    print(f"\n=== Keys only in TJ, missing in RU ===")
    for k in sorted(only_tj):
        print(f"  {k}")
if only_ru:
    print(f"\n=== Keys only in RU, missing in TJ ===")
    for k in sorted(only_ru):
        print(f"  {k}")

# Check app.js for potential issues
with open('app.js','r',encoding='utf-8') as f:
    app = f.read()

print("\n=== Potential JS issues ===")
# Check getElementById calls
ids_in_js = re.findall(r'getElementById\(["\']([^"\']+)["\']\)', app)
for eid in ids_in_js:
    if eid not in html:
        print(f"  JS references element #{eid} but not found in HTML")

# Check for console.log left in
console_count = app.count('console.log')
if console_count > 0:
    print(f"  {console_count} console.log statements found in app.js")

# Check for TODO/FIXME
for fname in ['app.js', 'styles.css', 'index.html', 'lang.js']:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    todos = len(re.findall(r'TODO|FIXME|HACK|XXX', content, re.IGNORECASE))
    if todos:
        print(f"  {todos} TODO/FIXME markers in {fname}")

print("\n=== CSS checks ===")
with open('styles.css','r',encoding='utf-8') as f:
    css = f.read()

# Check for undefined CSS vars
css_vars_used = set(re.findall(r'var\(--([\w-]+)', css))
css_vars_defined = set(re.findall(r'--([\w-]+):', css))
undefined_vars = css_vars_used - css_vars_defined
for v in sorted(undefined_vars):
    print(f"  Undefined CSS var: --{v}")

print("\nDone.")
