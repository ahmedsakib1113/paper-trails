// Maps and city coordinates are bundled locally; no tracking or map API calls.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const radians = n => n * Math.PI / 180;
const degrees = n => n * 180 / Math.PI;
const clamp = n => Math.max(0, Math.min(1, n));
const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const shortLongitude = n => ((n + 540) % 360) - 180;
const countryNames = new Intl.DisplayNames(['en'], {type:'region'});
const countryCodes = new Map();
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), name = countryNames.of(code);
  if (name !== code) { countryCodes.set(normalize(name), code); countryCodes.set(code.toLowerCase(), code); }
}
for (const [name, code] of Object.entries({uk:'GB',unitedkingdom:'GB',greatbritain:'GB',england:'GB',scotland:'GB',wales:'GB',usa:'US',unitedstatesofamerica:'US',southkorea:'KR',northkorea:'KP',vietnam:'VN',russia:'RU',turkey:'TR',czechrepublic:'CZ',uae:'AE',hongkong:'HK',taiwan:'TW'})) countryCodes.set(name, code);

export function findCity(cities, city, country) {
  const code = countryCodes.get(normalize(country));
  if (!code) return null;
  const name = normalize(city);
  const alias = {kl:'kualalumpur',nyc:'newyorkcity',newyork:'newyorkcity',saigon:'hochiminhcity',melaka:'malacca',penang:'georgetown'}[name] || name;
  // Higher population first disambiguates cities with the same name in a country.
  const match = cities.find(row => row[1] === code && row[4].some(n => normalize(n) === alias));
  return match ? {name:match[0], country:match[1], lat:match[2], lon:match[3]} : null;
}

export function journeyProgress(letter, now) {
  const duration = letter.arrives_at - letter.sent_at;
  if (duration <= 0) return now >= letter.arrives_at ? 1 : 0;
  return clamp((now - letter.sent_at) / duration);
}

// Follow the shortest arc on the globe, including routes over the date line.
export function interpolateLocation(from, to, fraction) {
  const t = clamp(fraction);
  if (from.lat === to.lat && from.lon === to.lon) return {lat:from.lat, lon:from.lon};
  if (t === 0) return {lat:from.lat, lon:from.lon};
  if (t === 1) return {lat:to.lat, lon:to.lon};
  const vector = p => [Math.cos(radians(p.lat)) * Math.cos(radians(p.lon)), Math.cos(radians(p.lat)) * Math.sin(radians(p.lon)), Math.sin(radians(p.lat))];
  const a = vector(from), b = vector(to);
  const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((sum,n,i) => sum+n*b[i],0))));
  if (Math.abs(Math.sin(angle)) < .000001) return {lat:from.lat+(to.lat-from.lat)*t, lon:shortLongitude(from.lon+shortLongitude(to.lon-from.lon)*t)};
  const weights = [Math.sin((1-t)*angle)/Math.sin(angle), Math.sin(t*angle)/Math.sin(angle)];
  const v = a.map((n,i) => n*weights[0]+b[i]*weights[1]);
  return {lat:degrees(Math.atan2(v[2],Math.hypot(v[0],v[1]))), lon:degrees(Math.atan2(v[1],v[0]))};
}

export function routeGeometry(from, to) {
  const center = from.lon + shortLongitude(to.lon-from.lon)/2;
  const project = point => [500 + shortLongitude(point.lon-center)*1000/360, (90-point.lat)*500/180];
  const points = Array.from({length:101},(_,i) => project(interpolateLocation(from,to,i/100)));
  const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
  const width = Math.min(1000, Math.max(450, Math.max(...xs)-Math.min(...xs)+160, (Math.max(...ys)-Math.min(...ys)+130)*1.9));
  const height = Math.min(500, width/1.9);
  const x = (Math.min(...xs)+Math.max(...xs)-width)/2;
  const y = Math.max(0,Math.min(500-height,(Math.min(...ys)+Math.max(...ys)-height)/2));
  return {center, project, points, viewBox:[x,y,width,height], sameCity:Math.hypot(from.lat-to.lat,shortLongitude(from.lon-to.lon)) < .02};
}

export function mapPlaceholder(letter, compact = false) {
  return `<div class="postal-map${compact?' postal-map-compact':''}" data-map-letter="${escapeHtml(letter.id)}" aria-label="Virtual postal route"><div class="map-loading">Unfolding the map…</div></div>`;
}

let atlasPromise;
function loadAtlas() {
  if (!atlasPromise) atlasPromise = Promise.all(['/maps/land.json','/maps/cities.json'].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Map unavailable');
    return response.json();
  })).then(([land,cities]) => ({land,cities})).catch(error => { atlasPromise = null; throw error; });
  return atlasPromise;
}

function progressLabel(progress, city, sameCity) {
  if (progress >= 1) return `Delivered to ${city}`;
  if (sameCity) return `Resting in ${city}`;
  if (progress < .2) return 'Leaving the sender’s post office';
  if (progress < .7) return 'Somewhere along the scenic route';
  return `Approaching ${city}`;
}

function routePath(points) {
  // Separate any projection seam rather than drawing a line across the map.
  return points.map((p,i) => `${i===0 || Math.abs(p[0]-points[i-1][0])>500?'M':'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}

const activeMaps = new Map();
let clock = () => Date.now();

function updateMap(element, map) {
  const progress = journeyProgress(map.letter,clock());
  const point = map.geometry.project(interpolateLocation(map.from,map.to,progress));
  const line = element.querySelector('.map-route-complete');
  // The path uses a normalized length so elapsed time fills it consistently.
  if (line) line.setAttribute('stroke-dasharray',`${progress*100} 100`);
  element.querySelector('.map-letter')?.setAttribute('transform',`translate(${point[0]} ${point[1]})`);
  const label = progressLabel(progress,map.letter.recipient_city,map.geometry.sameCity);
  element.querySelector('[data-map-status]').textContent = label;
  element.querySelector('[data-map-progress]').textContent = `${Math.floor(progress*100)}% of the journey`;
  const bar = element.querySelector('[role="progressbar"]');
  bar.setAttribute('aria-valuenow',String(Math.floor(progress*100)));
  bar.setAttribute('aria-valuetext',label);
  element.classList.toggle('map-delivered',progress >= 1);
  const eta = element.querySelector('[data-map-eta]');
  const remaining = Math.max(0,map.letter.arrives_at-clock());
  eta.textContent = progress >= 1 ? 'Safe in their mailbox' : remaining < 60_000 ? 'Arriving in under a minute' : remaining < 3_600_000 ? `About ${Math.ceil(remaining/60_000)} min to go` : `Arrives ${new Date(map.letter.arrives_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`;
  const stops = element.parentElement.querySelectorAll('.journey-stop');
  const step = progress >= 1 ? 3 : progress >= .7 ? 2 : progress >= .2 ? 1 : 0;
  stops.forEach((stop,i) => {stop.classList.toggle('done',i<=step); stop.classList.toggle('current',i===step);});
}

function renderMap(element, letter, atlas) {
  const from = findCity(atlas.cities,letter.sender_city,letter.sender_country);
  const to = findCity(atlas.cities,letter.recipient_city,letter.recipient_country);
  if (!from || !to) {
    element.innerHTML = `<div class="map-unavailable"><span class="eyebrow">A LITTLE OFF THE MAP</span><p>We couldn’t locate ${escapeHtml(!from ? letter.sender_city : letter.recipient_city)} in our city atlas.</p><small>Your letter is still on its way. Follow its delivery progress below.</small></div>`;
    return;
  }
  const geometry = routeGeometry(from,to);
  const [sx,sy] = geometry.points[0], [ex,ey] = geometry.points.at(-1);
  const d = routePath(geometry.points);
  const grid = Array.from({length:13},(_,i)=>`M${i*100} 0V500`).join(' ')+' '+Array.from({length:6},(_,i)=>`M-500 ${i*100}H1500`).join(' ');
  const shift = -geometry.center*1000/360;
  const land = [-1000,0,1000].map(offset=>`<path d="${atlas.land}" transform="translate(${shift+offset} 0)"/>`).join('');
  const title = `${letter.sender_city} to ${letter.recipient_city}. Virtual letter journey.`;
  element.innerHTML = `<div class="map-heading"><span class="eyebrow">${geometry.sameCity?'A MOMENT, KEPT FOR LATER':'THE LONG WAY, WITH LOVE'}</span><span class="map-live"><i></i>VIRTUAL JOURNEY</span></div><div class="map-canvas"><svg class="route-map-svg" viewBox="${geometry.viewBox.join(' ')}" role="img" aria-label="${escapeHtml(title)}"><rect x="-1000" width="3000" height="500" class="map-water"/><path d="${grid}" class="map-grid"/><g class="map-land">${land}</g>${geometry.sameCity?`<circle cx="${sx}" cy="${sy}" r="32" class="map-local-loop"/>`:`<path d="${d}" class="map-route-shadow"/><path d="${d}" class="map-route-dotted"/><path d="${d}" class="map-route-complete" pathLength="100" stroke-dasharray="0 100"/>`}<g class="map-station"><circle cx="${sx}" cy="${sy}" r="7"/><circle cx="${ex}" cy="${ey}" r="7"/>${!geometry.sameCity?`<text x="${sx}" y="${sy+23}" text-anchor="${sx>ex?'end':'start'}">${escapeHtml(letter.sender_city)}</text>`:''}<text x="${ex}" y="${ey+23}" text-anchor="${sx>ex?'start':'end'}">${escapeHtml(letter.recipient_city)}</text></g><g class="map-letter" transform="translate(${sx} ${sy})"><circle class="map-pulse" r="21"/><circle class="map-marker-halo" r="17"/><rect x="-13" y="-9" width="26" height="18" rx="3" class="map-envelope"/><path d="m-12-7 12 9 12-9m-24 14 8-7m16 7-8-7" class="map-envelope-fold"/></g></svg><span class="map-compass" aria-hidden="true">N<br>↑</span><div class="map-key"><span><i class="map-key-sent"></i>Travelled</span><span><i></i>Still to wander</span></div></div><div class="map-status" role="progressbar" aria-label="Letter delivery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div><strong data-map-status></strong><small data-map-eta></small></div><span data-map-progress></span></div><div class="map-caption">An imagined postal journey, timed to your letter’s arrival.<span>Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · Cities: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a></span></div>`;
  const map = {letter,from,to,geometry};
  activeMaps.set(element,map);
  updateMap(element,map);
}

export async function mountJourneyMaps(letters, now) {
  clock = now;
  for (const element of activeMaps.keys()) if (!element.isConnected) activeMaps.delete(element);
  const elements = [...document.querySelectorAll('[data-map-letter]')];
  if (!elements.length) return;
  try {
    const atlas = await loadAtlas();
    for (const element of elements) {
      if (!element.isConnected) continue;
      const letter = letters.find(l=>l.id===element.dataset.mapLetter);
      if (letter) renderMap(element,letter,atlas);
    }
  } catch {
    for (const element of elements) if (element.isConnected) element.innerHTML = '<div class="map-unavailable"><p>The map couldn’t be unfolded.</p><small>Your letter is safe. Refresh to try again, or follow the timeline below.</small></div>';
  }
}

// Update the position without rebuilding the page or interrupting keyboard focus.
if (typeof document !== 'undefined') setInterval(() => {
  if (document.hidden) return;
  for (const [element,map] of activeMaps) {
    if (!element.isConnected) {activeMaps.delete(element); continue;}
    updateMap(element,map);
  }
},1000);
