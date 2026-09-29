"""Run: python check_static.py (Python standard library only)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET

class References(HTMLParser):
    def __init__(self):super().__init__();self.paths=[]
    def handle_starttag(self,tag,attrs):
        self.paths.extend(v for k,v in attrs if k in ('src','href') and v)

root=Path(__file__).parent
checked=0
for file in root.rglob('*.html'):
    parser=References();parser.feed(file.read_text('utf-8'))
    for ref in parser.paths:
        url=urlsplit(ref)
        if url.scheme or url.netloc or not url.path:continue
        target=file.parent/unquote(url.path)
        if target.is_dir():target=target/'index.html'
        assert target.exists(),f'Missing resource: {file.name} -> {ref}'
        checked+=1
for file in root.rglob('*.svg'):ET.parse(file)
print(f'PASS: {checked} local references; all SVG files valid XML')
