# Finds every Squarespace image URL in saved pages, downloads it once,
# writes reference/image-map.json (cdn url without query -> local site path).
import re, json, os, glob, urllib.request, urllib.parse, html
os.makedirs('site/assets/img', exist_ok=True)
urls = set()
for f in glob.glob('reference/html/*.html'):
    t = html.unescape(open(f, encoding='utf-8').read())
    for u in re.findall(r'https?://(?:images\.squarespace-cdn\.com|static1\.squarespace\.com/static)/[^\s"\'()<>,]+', t):
        u = u.split('?')[0]
        if re.search(r'\.(jpe?g|png|gif|webp|svg)$', u, re.I):
            urls.add(u)
m, used = {}, set()
for u in sorted(urls):
    name = urllib.parse.unquote(u.rsplit('/', 1)[1]).replace(' ', '-').replace('+', '-')
    name = re.sub(r'[^A-Za-z0-9._-]', '', name) or 'img'
    base, ext = os.path.splitext(name); n = 1
    while name.lower() in used:
        name = f'{base}-{n}{ext}'; n += 1
    used.add(name.lower())
    dest = f'site/assets/img/{name}'
    try:
        src = u + ('?format=2500w' if 'images.squarespace-cdn' in u and not u.endswith('.svg') else '')
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
        open(dest, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
        m[u] = 'assets/img/' + name
    except Exception as e:
        print('FAIL', u, e)
json.dump(m, open('reference/image-map.json', 'w'), indent=1)
print(len(m), 'images saved')
