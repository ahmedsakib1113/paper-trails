# Map data

Land outlines: Natural Earth, 1:110m land polygons (public domain).
https://www.naturalearthdata.com/about/terms-of-use/
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson

City coordinates: GeoNames cities15000, licensed CC BY 4.0.
https://www.geonames.org/export/
Source: https://download.geonames.org/export/dump/cities15000.zip
License: https://creativecommons.org/licenses/by/4.0/

The city data is reduced to city names, country codes, coordinates, and the ASCII name; coordinates are rounded to four decimal places. Larger populations take precedence when city names repeat within one country. The dataset includes cities with populations above 15,000 and certain capitals. Unsupported cities show an explanatory fallback instead of invented locations.

Rebuild with `python scripts/build-map-atlas.py`. Data was retrieved on 2026-10-31. No external requests or API keys are needed by the running app.
