#!/usr/bin/env python3
"""Gera casa-hiro-hostinger.zip só com o que vai para a Hostinger (sem dados, sem testes, sem código-fonte do app)."""
import os, zipfile
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCL = ['server.js', 'package.json', 'schema.sql', '.env.example', 'README.md', 'lib', 'public', 'tools']
out = os.path.join(RAIZ, 'casa-hiro-hostinger.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for item in INCL:
        p = os.path.join(RAIZ, item)
        if os.path.isfile(p): z.write(p, item)
        elif os.path.isdir(p):
            for d, _, fs in os.walk(p):
                for f in fs:
                    if f.endswith('.pyc') or f.startswith('.env'): continue
                    full = os.path.join(d, f); z.write(full, os.path.relpath(full, RAIZ))
    z.writestr('data/.gitkeep', '')
print(out, os.path.getsize(out))
