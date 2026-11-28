"""Bundle the game into one self-contained HTML file (for Google Sites "Embed code").

Every non-ASCII character (emoji, accents, symbols) is written as an escape code,
so the file stays correct even if it is copied through a tool that mangles Unicode.
"""
import re, pathlib

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')

def esc_js(code):
    # \u{...} works inside JS strings/templates; in comments it is harmless
    return ''.join(c if ord(c) < 128 else '\\u{%x}' % ord(c) for c in code)

def esc_css(code):
    return ''.join(c if ord(c) < 128 else '\\%x ' % ord(c) for c in code)

def esc_html(text):
    return ''.join(c if ord(c) < 128 else '&#x%x;' % ord(c) for c in text)

css = (root / 'css' / 'style.css').read_text(encoding='utf-8')
# images referenced from the stylesheet are embedded as data URIs so the single file has no outside files
import base64
def embed_img(m):
    path = root / m.group(1).replace('../', '').split('?')[0]
    mime = {'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml'}[path.suffix[1:]]
    return "url('data:%s;base64,%s')" % (mime, base64.b64encode(path.read_bytes()).decode())
css = re.sub(r"url\('(\.\./img/[^']+)'\)", embed_img, css)
html = re.sub(r'<link rel="stylesheet" href="css/style\.css\?v=\d+">', lambda m: '<style>\n' + esc_css(css) + '\n</style>', html)

def inline(m):
    js = (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script>\n' + esc_js(js) + '\n</script>'

html = re.sub(r'<script src="(js/[a-z]+\.js)\?v=\d+"></script>', inline, html)
assert 'src="js/' not in html and 'css/style' not in html
# images referenced from the page or scripts (e.g. src="img/title.webp?v=1") are embedded too
def embed_ref(m):
    path = root / 'img' / m.group(2)
    mime = {'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml'}[path.suffix[1:]]
    return m.group(1) + 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())
html = re.sub(r'(src=")img/([\w.-]+?)(?:\?v=\d+)?(?=")', embed_ref, html)
# image paths written as plain JS strings, e.g. 'img/ar_opp_chili.webp?v=1'
def data_uri(name):
    path = root / 'img' / name  # name may include a sub-folder, e.g. 'col/arena.webp'
    mime = {'webp': 'image/webp', 'png': 'image/png', 'jpg': 'image/jpeg', 'svg': 'image/svg+xml'}[path.suffix[1:]]
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())
html = re.sub(r"(['\"])img/([\w.-]+?\.(?:webp|png|jpg|svg))(?:\?v=\d+)?\1", lambda m: m.group(1) + data_uri(m.group(2)) + m.group(1), html)
# images whose names are built at run time (room art: img/rm_<piece>.webp) go into a lookup table the code checks first
assets = {f'img/{p.name}': data_uri(p.name) for pat in ('rm_*.webp', 'bt_*.webp', 'ar_opp_*.webp', 'fd_*.webp', 'dc_*.webp', 'of_*.webp', 'cl_*.webp', 'sh_*.webp') for p in sorted((root / 'img').glob(pat))}
# the Coliseum battle art lives in img/col/ and is loaded by name at run time
assets.update({f'img/col/{p.name}': data_uri(f'col/{p.name}') for p in sorted((root / 'img' / 'col').glob('*.webp'))})
import json
left = sorted(set(re.findall(r'img/[\w.-]+\.(?:webp|png|jpg|svg)', re.sub(r'/\*.*?\*/', '', html, flags=re.S))))
assert not left, 'images not bundled: %s' % left
html = html.replace('<script>', '<script>window.DG_ASSETS = ' + json.dumps(assets) + ';</script>\n<script>', 1)
html = esc_html(html)  # only touches what is left outside the escaped code (none, normally)
out = root / 'my-pet-dumpling-single.html'
out.write_text(html, encoding='ascii')
print(f'Wrote {out.name}: {len(html):,} bytes, ASCII only')
