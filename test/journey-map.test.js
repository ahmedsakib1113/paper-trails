import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findCity, journeyProgress, interpolateLocation, routeGeometry, mapPlaceholder } from '../public/journey-map.js';
import { createApp } from '../server.js';

const cities = JSON.parse(readFileSync(new URL('../public/maps/cities.json',import.meta.url)));
const from = findCity(cities,'Kuala Lumpur','Malaysia');
const to = findCity(cities,'Kyoto','Japan');

test('city lookup uses the country and resolves common aliases without inventing locations', () => {
  assert.equal(from.country,'MY');
  assert.equal(to.country,'JP');
  assert.equal(findCity(cities,'London','United Kingdom').country,'GB');
  assert.equal(findCity(cities,'London','Canada').country,'CA');
  assert.equal(findCity(cities,'New York','USA').name,'New York City');
  assert.equal(findCity(cities,'Atlantis','Malaysia'),null);
  assert.equal(findCity(cities,'Kyoto','Canada'),null);
  assert.equal(findCity(cities,'Kyoto','Unknown Country'),null);
});

test('the marker reaches the correct city at exact delivery boundaries', () => {
  const letter = {sent_at:1000,arrives_at:61000};
  assert.equal(journeyProgress(letter,0),0);
  assert.equal(journeyProgress(letter,1000),0);
  assert.equal(journeyProgress(letter,31000),.5);
  assert.equal(journeyProgress(letter,61000),1);
  assert.equal(journeyProgress(letter,100000),1);
  assert.deepEqual(interpolateLocation(from,to,0),{lat:from.lat,lon:from.lon});
  assert.deepEqual(interpolateLocation(from,to,1),{lat:to.lat,lon:to.lon});
  const halfway = interpolateLocation(from,to,.5);
  assert.ok(halfway.lat>from.lat && halfway.lat<to.lat);
  assert.ok(halfway.lon>from.lon && halfway.lon<to.lon);
});

test('date-line routes take the short path and stay within the route viewport', () => {
  const a={lat:0,lon:170},b={lat:0,lon:-170};
  assert.ok(Math.abs(interpolateLocation(a,b,.5).lon)>179);
  const geometry=routeGeometry(a,b);
  const [x,y,width,height]=geometry.viewBox;
  for(const point of geometry.points) {
    assert.ok(point.every(Number.isFinite));
    assert.ok(point[0]>=x && point[0]<=x+width);
    assert.ok(point[1]>=y && point[1]<=y+height);
  }
});

test('local and future-self letters stay in the same city', () => {
  const geometry=routeGeometry(from,from);
  assert.equal(geometry.sameCity,true);
  assert.deepEqual(interpolateLocation(from,from,.5),{lat:from.lat,lon:from.lon});
});

test('letter identifiers cannot inject markup into map placeholders', () => {
  const markup=mapPlaceholder({id:'"><script>alert(1)</script>'});
  assert.ok(!markup.includes('<script>'));
  assert.ok(markup.includes('&lt;script&gt;'));
});

test('the running app serves the map module and atlas through its existing asset restrictions', async t => {
  const app=await createApp({database:':memory:',seed:false});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>app.close());
  const base=`http://127.0.0.1:${app.server.address().port}`;
  const module=await fetch(`${base}/journey-map.js`);
  assert.equal(module.status,200);
  assert.match(module.headers.get('content-type'),/text\/javascript/);
  const land=await fetch(`${base}/maps/land.json`);
  assert.equal(land.status,200);
  assert.match(await land.json(),/^M/);
  const atlas=await fetch(`${base}/maps/cities.json`);
  assert.equal(atlas.status,200);
  assert.ok(findCity(await atlas.json(),'Kyoto','Japan'));
  assert.equal((await fetch(`${base}/maps/../server.js`)).status,404);
});
