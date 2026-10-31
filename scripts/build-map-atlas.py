"""Rebuild the local map assets from Natural Earth and GeoNames open data."""
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / 'public' / 'maps'
target.mkdir(parents=True, exist_ok=True)

def source(local, url):
    path = target / local
    return path.read_bytes() if path.exists() else urllib.request.urlopen(url, timeout=90).read()

land = json.loads(source('land-source.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'))
paths = []
for feature in land['features']:
    geometry = feature['geometry']
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        for ring in polygon:
            points = [(round((p[0]+180)*1000/360, 2), round((90-p[1])*500/180, 2)) for p in ring]
            paths.append('M' + 'L'.join(f'{x},{y}' for x, y in points) + 'Z')
(target / 'land.json').write_text(json.dumps(''.join(paths), separators=(',', ':')), encoding='utf-8')

cities = []
archive = zipfile.ZipFile(io.BytesIO(source('cities-source.zip', 'https://download.geonames.org/export/dump/cities15000.zip')))
for line in archive.read('cities15000.txt').decode('utf-8').splitlines():
    row = line.split('\t')
    cities.append((int(row[14]), [row[1], row[8], round(float(row[4]), 4), round(float(row[5]), 4), list(dict.fromkeys([row[1], row[2]]))]))
cities.sort(key=lambda row: row[0], reverse=True)
(target / 'cities.json').write_text(json.dumps([row[1] for row in cities], ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Built land outlines and {len(cities):,} cities. See public/maps/NOTICE.md for attribution.')
