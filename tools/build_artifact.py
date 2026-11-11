#!/usr/bin/env python3
"""Gera dist/artefato.html (versão para publicar como artefato do Claude) e a lista de arquivos.
Os binários (.bin/.glb) vão como base64 em dist/b64/*.txt (o servidor de artefatos só serve texto/mídia web)
e viram blob: URLs no navegador antes do jogo carregar. Uso: python3 tools/build_artifact.py"""
import re, glob, base64, os, json
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(root)
s = open('index.html', encoding='utf-8').read()
s = re.sub(r'<!DOCTYPE html>\s*<html[^>]*>\s*<head>', '', s); s = re.sub(r'<meta[^>]*>\s*', '', s); s = re.sub(r'<link[^>]*>\s*', '', s)
for t in ('</head>', '<body>', '</body>', '</html>'): s = s.replace(t, '')
s = s.replace('<title>O Último Espetáculo</title>', '<title>O Último Espetáculo</title>\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
s = s.replace('html,body{margin:0;height:100%;background:#000;', 'html,body{margin:0;height:100%;background:#000;color-scheme:dark;')
bins = ['assets/enemy_body.bin'] + sorted(glob.glob('assets/models/*.glb')) + sorted(glob.glob('assets/models/*/*.glb'))
for b in bins:
    o = 'dist/b64/' + b + '.txt'; os.makedirs(os.path.dirname(o), exist_ok=True)
    open(o, 'w').write(base64.b64encode(open(b, 'rb').read()).decode())
boot = """<script>
/* Artefato: os binários (.glb/.bin) vêm como base64 em .txt e são decodificados SOB DEMANDA (só o que o jogo pede:
   o personagem escolhido, não os seis). */
window.OE_ASSETS = window.OE_ASSETS || {}; window.OE_ARTIFACT = true;  // aqui não há WebRTC: online só no APK
const OE_B64 = new Set(%s), OE_LAZY = {};
window.OE_ASSET_LAZY = p => { if (!OE_B64.has(p)) return Promise.resolve(p); return OE_LAZY[p] || (OE_LAZY[p] = fetch('dist/b64/' + p + '.txt').then(r => r.text()).then(t => {
  const b = atob(t), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: 'application/octet-stream' })); })); };
</script>
""" % json.dumps(bins)
s = s.replace('<script src="vendor/three.min.js"></script>', boot + '<script src="vendor/three.min.js"></script>', 1)
os.makedirs('dist', exist_ok=True); open('dist/artefato.html', 'w', encoding='utf-8').write(s.strip() + '\n')
files = ['dist/b64/' + b + '.txt' for b in bins] + ['vendor/three.min.js', 'vendor/GLTFLoader.js', 'assets/skin_m_suit.jpg', 'assets/models/manifest.json'] + sorted(glob.glob('assets/retratos/*.png')) + sorted(glob.glob('src/**/*.js', recursive=True))
json.dump([{'path': f} for f in files], open('dist/artefato_files.json', 'w'))
print('dist/artefato.html +', len(files), 'arquivos,', round(sum(os.path.getsize(f) for f in files) / 1048576, 1), 'MB')
