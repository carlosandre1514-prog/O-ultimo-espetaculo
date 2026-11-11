#!/usr/bin/env python3
"""Gera O Último Espetáculo em UM arquivo HTML (adaptado do MiniBlender) (abre direto no celular, sem servidor).

Embute os scripts (vendor/ e src/) no HTML e os demais arquivos (corpo do inimigo, textura,
modelos GLB) como data: URLs em OE_ASSETS. Abre direto no celular, sem servidor.
Uso: python3 tools/build_single.py [saida.html]
"""
import base64, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'dist', 'UltimoEspetaculo.html')
html = open(os.path.join(root, 'index.html'), encoding='utf-8').read()

def inline(m):
    code = open(os.path.join(root, m.group(1)), encoding='utf-8').read()
    # '</script' dentro do código fecharia a tag
    return '<script>/* ' + m.group(1) + ' */\n' + code.replace('</script', '<\\/script') + '\n</script>'
html, n = re.subn(r'<script src="([^"]+)"></script>', inline, html)

MIME = {'.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.json': 'application/json', '.glb': 'model/gltf-binary'}
import glob
assets = ['assets/enemy_body.bin', 'assets/skin_m_suit.jpg'] + sorted(p[len(root) + 1:] for p in glob.glob(os.path.join(root, 'assets', 'models', '*')))
entries = []
for a in assets:
    data = open(os.path.join(root, a), 'rb').read()
    entries.append('%r:"data:%s;base64,%s"' % (a, MIME[os.path.splitext(a)[1]], base64.b64encode(data).decode()))
html = html.replace('<head>', '<head>\n<script>window.OE_ASSETS={' + ','.join(entries) + '};</script>', 1)
# ícone e manifesto são arquivos separados; no arquivo único ficam de fora
html = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?', '', html)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('%s: %d scripts embutidos, %d arquivos, %.1f MB' % (out, n, len(assets), os.path.getsize(out) / 1e6))
