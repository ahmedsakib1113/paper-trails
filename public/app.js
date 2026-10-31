import { mapPlaceholder, mountJourneyMaps } from './journey-map.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paths = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7m-18 12 6-6m12 6-6-6"/>',
  feather: '<path d="M20 3c-6-1-13 4-13 10v3h3c6 0 11-7 10-13Z"/><path d="m4 21 12-13M7 16h5m-2-3V8"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  inbox: '<path d="M5 4h14l3 11v5H2v-5Z"/><path d="M2 15h6l2 3h4l2-3h6"/>',
  send: '<path d="m21 3-7 18-4-7-7-4Z"/><path d="m10 14 6-6"/>',
  route: '<circle cx="5" cy="18" r="3"/><circle cx="19" cy="6" r="3"/><path d="M8 18h7a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h5"/>',
  draft: '<path d="M14 3H5v18h14V8Z"/><path d="M14 3v5h5M8 12h8m-8 4h5"/>',
  archive: '<path d="M4 8h16v13H4Z"/><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M9 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-3 3-1 7 8 14 9-7 11-11 8-14Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  bell: '<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Zm5 4h4"/>',
  pin: '<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  leaf: '<path d="M19 3C8 3 3 8 6 15s15 3 13-12ZM4 21 15 9m-7 8v-6m3 3h5"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/><path d="m18 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"/>',
  sunrise: '<path d="M3 18h18M5 15h14a7 7 0 0 0-14 0ZM12 2v3m-8 1 2 2m14-2-2 2M2 12h2m16 0h2M5 21h14"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  logout: '<path d="M10 3H4v18h6m5-15 6 6-6 6m-8-6h14"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6"/>',
  book: '<path d="M12 5C8 2 3 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-1-1-6-2-10 1Zm0 0v15"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.mail}</svg>`;
const brand = () => `<button class="brand" data-go="home" aria-label="Paper Trails home"><span class="brand-mark">${icon('mail')}</span><span><span class="brand-name">Paper Trails</span><span class="brand-caption" style="display:block">LET WORDS WANDER.</span></span></button>`;
const art = () => `<div class="desk-art" aria-hidden="true"><svg viewBox="0 0 470 285" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#414633" flood-opacity=".12"/></filter><pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#738461" stroke-opacity=".065"/></pattern></defs><rect width="470" height="285" fill="url(#grid)"/><path d="M5 228C50 244 38 156 98 163S166 239 207 206 199 156 245 135 322 166 366 100" fill="none" stroke="#9ba383" stroke-dasharray="4 6" stroke-width="1.4"/><path d="m359 96 12 0-5 11" fill="none" stroke="#9ba383"/><g opacity=".5" fill="none" stroke="#a0aa8b" stroke-width="1.2"><path d="M70 103c-8-25-30-24-31-12s18 10 21 5m-9 31c-25-6-24-25-13-25s11 14 6 18"/><path d="M358 239c12-32 18-46 27-53m-19 33c-21-10-18-27-16-27 18 0 21 15 16 27m5-15c21 4 32-8 29-14-17-4-24 2-29 14m10-13c-11-8-9-20-5-22 11 2 12 13 5 22"/></g><g transform="translate(112 29) rotate(-12 112 100)" filter="url(#shadow)"><rect width="208" height="206" rx="2" fill="#fbf7e9"/><path d="M24 29h91m-91 14h154M24 72h151M24 88h151M24 104h151M24 120h151M24 136h151M24 152h106" stroke="#dcd7c6"/><path d="M26 30c15-6 16 5 29 0s22-2 27 0" stroke="#8a8a74" fill="none"/><path d="M25 72c19-5 18 4 37-1s22-2 35 1m-72 16c15-3 23 5 37 0s27-4 33 1" fill="none" stroke="#a7a38b"/><path d="M139 170c16-9 23-4 19 5 9-10 17-3 11 3" stroke="#9e9b83" fill="none"/></g><g transform="translate(110 108) rotate(8 120 70)" filter="url(#shadow)"><rect width="232" height="142" rx="3" fill="#e9d9ba"/><path d="m0 0 116 83L232 0" fill="#f1e5cc" stroke="#d0bfa0" stroke-width=".8"/><path d="m0 142 84-64m148 64-84-64" stroke="#cdbb9b" stroke-width=".8"/><circle cx="116" cy="84" r="20" fill="#a74c32"/><circle cx="116" cy="84" r="16.5" fill="none" stroke="#c37654"/><path d="M108 88c-2-10 7-15 15-15-1 8-3 15-11 15m-5 7 12-16" fill="none" stroke="#d99c75" stroke-width="1.3"/><g transform="translate(181 12)"><path d="M0 0h35v44H0Z" stroke="#f8f3de" stroke-width="5" stroke-dasharray="2 2" fill="#a0aa83"/><rect x="3" y="3" width="29" height="37" fill="none" stroke="#d7dfbc" stroke-width=".6"/><path d="M17 31V12m0 7c-11-2-9-9-9-9 10 0 9 9 9 9m0 6c11-3 10-9 10-9-10 1-10 9-10 9" stroke="#e4e8cb" fill="none"/><text x="17" y="38" font-size="4" fill="#f7f2d7" text-anchor="middle" font-family="Georgia">PAPER TRAILS</text></g><g transform="translate(158 22) rotate(-17)" opacity=".5" stroke="#7e8069" fill="none"><circle r="21"/><circle r="17" stroke-width=".5"/><path d="M-14 0h28"/><text y="-5" font-family="Arial" font-size="5" fill="#7e8069" stroke="none" text-anchor="middle">SENT WITH</text><text y="10" font-family="Arial" font-size="5" fill="#7e8069" stroke="none" text-anchor="middle">A LITTLE LOVE</text><path d="M20-10c15-7 20 7 35 0m-35 6c15-7 20 7 35 0m-35 6c15-7 20 7 35 0"/></g></g><g transform="translate(361 27) rotate(28)"><rect x="0" y="0" width="9" height="153" rx="3" fill="#797b62"/><path d="M0 137h9l-4.5 15Z" fill="#d8c5a3"/><path d="m3 147 1.5 5 1.5-5" fill="#494b3f"/><rect width="9" height="12" rx="2" fill="#baa688"/><path d="M2 15v118" stroke="#9fa086" stroke-width="1"/></g><g transform="translate(59 192) rotate(-14)"><path d="M0 5h35v43H0Z" fill="#f6f0dc" stroke="#faf7ea" stroke-width="4" stroke-dasharray="3 2"/><rect x="3" y="8" width="29" height="35" fill="#b5bd9a"/><path d="M9 33c5-15 12-20 18-17-3 10-6 16-15 17m-4 5 15-18" fill="none" stroke="#ebedcf"/><text x="17" y="45" text-anchor="middle" font-size="4" fill="#737c5b">LETTERS TRAVEL</text></g></svg></div>`;
const state = { user: null, letters: [], drafts: [], page: 'home', filter: 'all', search: '', composer: null, offset: 0, authMode: 'login', menu: false, busy: false, demoAvailable: true };
let saveTimer, recipientTimer, toastTimer;
const clockNow = () => Date.now() + state.offset;
const date = (value, long = false) => new Date(value).toLocaleDateString('en-GB', long ? { day:'numeric', month:'long', year:'numeric' } : { day:'numeric', month:'short' });
const arrival = value => {
  const ms = value-clockNow();
  if (ms <= 0) return 'Delivered';
  if (ms < 60_000) return 'Arrives in under a minute';
  if (ms < 3_600_000) return `Arrives in ${Math.ceil(ms/60_000)} minutes`;
  if (ms < 86_400_000) return `Arrives in ${Math.ceil(ms/3_600_000)} hours`;
  return `Arrives ${date(value)}`;
};
const initials = name => name.split(' ').map(p=>p[0]).slice(0,2).join('');
const incoming = () => state.letters.filter(l => l.recipient_id === state.user.id && l.status === 'delivered' && !l.archived);
const unread = () => incoming().filter(l => !l.opened_at).length;
const travelling = () => state.letters.filter(l => l.status === 'travelling');
async function api(path, method = 'GET', data) {
  const res = await fetch(`/api${path}`, { method, credentials:'same-origin', headers: data ? { 'Content-Type':'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'The post office is unavailable. Please try again.');
  return result;
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('visible'), 4200);
}
async function loadMail() {
  const result = await api('/mail');
  state.letters = result.letters; state.drafts = result.drafts; state.offset = result.now-Date.now();
}
function stamp(type = 'botanical') {
  return `<span class="stamp ${esc(type)}"><span class="stamp-inner">${icon(type === 'botanical' ? 'leaf' : type)}<small>POSTAGE · 01</small></span></span>`;
}
function envelope(letter, name, isNew = false) {
  return `<div class="envelope ${esc(letter.paper)}">${isNew ? '<span class="new-badge">UNOPENED</span>' : ''}<div class="envelope-to"><small>A LETTER FOR</small>${esc(name)}</div>${stamp(letter.stamp)}<span class="postmark">PAPER<br>TRAILS<br>POST</span></div>`;
}
function card(letter, mode = 'inbox') {
  const received = mode !== 'sent';
  const person = received ? letter.sender_name : letter.recipient_name;
  return `<button class="letter-card" data-letter="${esc(letter.id)}" aria-label="${esc(letter.subject)} — ${received ? 'from' : 'to'} ${esc(person)}">${envelope(letter, received ? state.user.name.split(' ')[0] : person.split(' ')[0], received && !letter.opened_at)}<div class="letter-info"><div class="letter-by"><span class="mini-dot"></span>${received ? 'From' : 'To'} ${esc(person)}</div><h3>${esc(letter.subject)}</h3><div class="letter-bottom"><span>${icon('pin')}${esc(received ? letter.sender_city : letter.recipient_city)}</span><span>${letter.status === 'travelling' ? arrival(letter.arrives_at) : date(letter.arrives_at)}</span></div></div></button>`;
}
function track(letter) {
  const progress = Math.max(0, Math.min(1, (clockNow()-letter.sent_at)/(letter.arrives_at-letter.sent_at)));
  const step = progress >= 1 ? 3 : progress >= .7 ? 2 : progress >= .2 ? 1 : 0;
  return `<div class="journey-track">${['Posted','On the journey','Local post office','Delivered'].map((s,i)=>`<div class="journey-stop ${i<=step?'done':''} ${i===step?'current':''}"><i></i>${s}</div>`).join('')}</div>`;
}
function empty(title, message, action = 'write', label = 'Write a letter', symbol = 'mail') {
  return `<div class="empty">${icon(symbol)}<h2>${esc(title)}</h2><p>${esc(message)}</p>${action ? `<button class="primary" data-go="${action}">${label}${icon('arrow')}</button>` : ''}</div>`;
}
const pageNames = { home:'Your post office', inbox:'Your mailbox', sent:'Sent letters', travelling:'On the journey', drafts:'Unfinished thoughts', keepsakes:'Your keepsake box', write:'The writing desk', account:'Your postal address', capsule:'A letter to the future' };
function render() {
  if (!state.user) return renderAuth();
  const nav = [['home','home','Post office'],['inbox','inbox','Mailbox'],['sent','send','Sent letters'],['travelling','route','On the journey'],['drafts','draft','Drafts'],['keepsakes','archive','Keepsakes']];
  $('#app').innerHTML = `<div class="shell ${state.menu?'menu-open':''}"><button class="mobile-backdrop" data-action="menu" aria-label="Close navigation"></button><aside class="sidebar" id="main-navigation" aria-label="Post office navigation"><button class="mobile-close icon-button" data-action="menu" aria-label="Close navigation">${icon('close')}</button>${brand()}<button class="compose-button" data-go="write">${icon('feather')}Write a letter</button><div class="nav-label">YOUR LITTLE POST OFFICE</div><nav aria-label="Main navigation">${nav.map(([page,symbol,label])=>`<button class="nav-item ${state.page===page?'active':''}" data-go="${page}" ${state.page===page?'aria-current="page"':''}>${icon(symbol)}${label}${page==='inbox'&&unread()?`<span class="count">${unread()}</span>`:page==='drafts'&&state.drafts.length?`<span class="count">${state.drafts.length}</span>`:''}</button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="sidebar-note">${icon('leaf')}<p>A little less instant.<br>A little more meaningful.</p><small>THAT’S THE PAPER TRAILS WAY.</small></div><button class="profile" data-go="account"><span class="avatar">${esc(initials(state.user.name))}</span><span><strong>${esc(state.user.name)}</strong><small>@${esc(state.user.username)}</small></span>${icon('down')}</button></aside><main class="main"><header class="topbar"><div class="breadcrumb"><button class="mobile-menu" data-action="menu" aria-label="Open navigation" aria-controls="main-navigation" aria-expanded="${state.menu}">${icon('menu')}</button><span class="breadcrumb-brand">Paper Trails</span> ${icon('chevron')}<b>${pageNames[state.page] || pageNames.home}</b></div><div class="top-actions"><span class="today">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span><button class="notification" data-go="inbox" aria-label="${unread()} unopened letters">${icon('bell')}${unread()?'<span class="dot"></span>':''}</button><span class="avatar" aria-hidden="true">${esc(initials(state.user.name))}</span></div></header><div class="content">${pageContent()}<footer class="footer"><span>${icon('heart')}Made for words worth waiting for.</span><span>Paper Trails © ${new Date().getFullYear()} · Take your time.</span></footer></div></main></div>`;
  syncNavigation();
  mountJourneyMaps(state.letters,clockNow);
}
// Keep the phone drawer separate from the page without rebuilding a draft form.
const mobileNavigation = window.matchMedia('(max-width:700px)');
function syncNavigation() {
  const open = state.menu && mobileNavigation.matches;
  $('.shell')?.classList.toggle('menu-open',open);
  if ($('.main')) $('.main').inert = open;
  if ($('.sidebar')) $('.sidebar').inert = mobileNavigation.matches && !open;
  $('.mobile-menu')?.setAttribute('aria-expanded',String(open));
}
function setMenu(open) {
  state.menu = open && mobileNavigation.matches;
  syncNavigation();
  $(state.menu ? '.mobile-close' : '.mobile-menu')?.focus();
}
mobileNavigation.addEventListener('change',() => {
  const focusInSidebar = $('.sidebar')?.contains(document.activeElement);
  const focusOnMenu = document.activeElement?.matches('.mobile-menu');
  state.menu = false;
  syncNavigation();
  if (mobileNavigation.matches && focusInSidebar) $('.mobile-menu')?.focus();
  if (!mobileNavigation.matches && focusOnMenu) $('.nav-item.active')?.focus();
});
document.addEventListener('keydown',event => {
  if (!state.menu || !mobileNavigation.matches) return;
  if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
  if (event.key === 'Tab') {
    const buttons = [...document.querySelectorAll('.sidebar button')].filter(b=>!b.disabled && b.getClientRects().length);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
function pageContent() {
  if (state.page === 'home') return homePage();
  if (['inbox','sent','keepsakes'].includes(state.page)) return mailboxPage();
  if (state.page === 'travelling') return journeyPage();
  if (state.page === 'drafts') return draftsPage();
  if (state.page === 'write' || state.page === 'capsule') return composePage();
  if (state.page === 'account') return accountPage();
  return homePage();
}
function homePage() {
  const first = state.user.name.split(' ')[0];
  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const mail = incoming().slice(0,3);
  const transit = travelling()[0];
  const sent = state.letters.filter(l=>l.sender_id===state.user.id).length;
  return `<div class="greeting"><div><h1>${greeting}, <span>${esc(first)}.</span></h1><p>A quieter corner of the internet. A little closer to the people you love.</p></div><div class="postal-date">${icon('pin')}${esc(state.user.city.toUpperCase())} POST OFFICE</div></div><section class="hero"><div class="hero-copy"><div class="eyebrow">SOME THINGS DESERVE A LETTER</div><h2>Good things take<br><em>a little time.</em></h2><p>A thought. A story. A little piece of your day.<br>Send it on a journey to someone who matters.</p><button class="primary" data-go="write">Write your next letter ${icon('arrow')}</button></div>${art()}</section><section class="stats" aria-label="Your postal activity"><div class="stat"><span class="stat-symbol">${icon('inbox')}</span><div><strong>${unread().toString().padStart(2,'0')}</strong><small>Letters waiting to be opened</small></div><span class="arrow">↗</span></div><div class="stat"><span class="stat-symbol">${icon('route')}</span><div><strong>${travelling().length.toString().padStart(2,'0')}</strong><small>Letters on the journey</small></div><span class="arrow">↗</span></div><div class="stat"><span class="stat-symbol">${icon('heart')}</span><div><strong>${sent.toString().padStart(2,'0')}</strong><small>Little moments sent</small></div><span class="arrow">↗</span></div></section><section><div class="section-heading"><div><h2>A little something for you</h2><p>Your mailbox. Full of words, from their world to yours.</p></div><button class="text-button" data-go="inbox">View mailbox ${icon('arrow')}</button></div><div class="letters-grid home-letters">${mail.length ? mail.map(l=>card(l)).join('') : empty('Your next little surprise belongs here.', 'Share your postal address with a friend. Their words will find their way to this mailbox.', 'account', 'Find my address', 'inbox')}</div></section><div class="bottom-grid"><section class="journey-panel"><div class="journey-title"><h2>Words on their way</h2>${transit?'<span class="pill">IN TRANSIT</span>':''}</div>${transit?`<div class="journey-summary"><span class="tiny-envelope">${icon('mail')}</span><div><strong>${esc(transit.subject)}</strong><small>To ${esc(transit.recipient_name)} · ${arrival(transit.arrives_at)}</small></div><button class="text-button" data-go="travelling" style="margin-left:auto" aria-label="Track letter">${icon('arrow')}</button></div>${mapPlaceholder(transit,true)}${track(transit)}`:`<div class="journey-summary"><span class="tiny-envelope">${icon('route')}</span><div><strong>Every letter has a journey.</strong><small>Your next one starts with a few words.</small></div></div><button class="text-button" data-go="write" style="margin-top:18px">Send a little something ${icon('arrow')}</button>`}</section><aside class="quote-card"><div class="eyebrow">A SMALL REMINDER</div><blockquote>“Letters are a way of being<br>there, from somewhere else.”</blockquote><small>Even a few words can make someone’s day.</small></aside></div>${state.user.demo?'<div class="demo-banner" style="margin-top:22px">You’re exploring a sample post office. <button class="text-button" data-action="create-account">Create your own postal address</button> to start writing your story.</div>':''}`;
}
function filteredLetters() {
  let list = state.page==='sent' ? state.letters.filter(l=>l.sender_id===state.user.id) : state.page==='keepsakes' ? state.letters.filter(l=>l.recipient_id===state.user.id&&l.archived&&l.status==='delivered') : incoming();
  if (state.filter === 'unopened') list = list.filter(l=>!l.opened_at);
  if (state.filter === 'opened') list = list.filter(l=>l.opened_at);
  if (state.filter === 'travelling') list = list.filter(l=>l.status==='travelling');
  if (state.search) { const q = state.search.toLowerCase(); list = list.filter(l=>[l.subject,l.sender_name,l.recipient_name,l.sender_city,l.recipient_city].some(v=>v.toLowerCase().includes(q))); }
  return list;
}
function listMarkup() {
  const letters = filteredLetters();
  const titles = { inbox:['A quiet mailbox, for now.', 'When a letter arrives, it will be waiting right here.'], sent:['Your first letter is waiting to be written.', 'A few thoughtful words can travel a long way.'], keepsakes:['Some letters are worth keeping.', 'Open a received letter and choose “Keep this letter” to save it here.'] };
  return letters.length ? letters.map(l=>card(l,state.page)).join('') : state.search || state.filter !== 'all' ? empty('No letters found.', 'Try another name, title, or filter.', null, '', 'search') : empty(...titles[state.page], state.page==='keepsakes'?'inbox':'write', state.page==='keepsakes'?'Visit mailbox':'Write a letter', state.page==='keepsakes'?'archive':'mail');
}
function mailboxPage() {
  const labels = { inbox:['Your mailbox', 'Small envelopes. Whole worlds inside.'], sent:['Letters you’ve sent', 'Little pieces of you, finding their way to someone else.'], keepsakes:['The keepsake box', 'The words you want to come back to, again and again.'] };
  const [title, sub] = labels[state.page];
  const filters = state.page==='inbox' ? [['all','All letters'],['unopened','Unopened'],['opened','Opened']] : state.page==='sent' ? [['all','All letters'],['travelling','On the journey']] : [];
  return `<div class="greeting"><div><h1>${title}</h1><p>${sub}</p></div><button class="secondary" data-action="refresh">${icon('refresh')}Refresh</button></div><div class="toolbar"><label class="search-box">${icon('search')}<span class="visually-hidden">Search letters</span><input id="mail-search" type="search" placeholder="Find a letter or a familiar name…" value="${esc(state.search)}"></label>${filters.length?`<div class="filter-tabs" aria-label="Filter letters">${filters.map(([id,name])=>`<button data-filter="${id}" class="${state.filter===id?'active':''}" aria-pressed="${state.filter===id}">${name}</button>`).join('')}</div>`:''}</div><div class="letters-grid page-letters" id="letter-list">${listMarkup()}</div>`;
}
function journeyPage() {
  const letters = [...travelling(), ...state.letters.filter(l=>l.status==='delivered' && l.sender_id===state.user.id).slice(0,5)];
  return `<div class="greeting"><div><h1>Every letter has a journey.</h1><p>From their corner of the world to yours. One post office at a time.</p></div><button class="secondary" data-action="refresh">${icon('refresh')}Refresh</button></div><div class="transit-list">${letters.length?letters.map(l=>`<article class="transit-card"><div class="transit-top"><span class="tiny-envelope">${icon('mail')}</span><div class="transit-copy"><h3>${esc(l.subject)}</h3><p>${l.sender_id===state.user.id?'To '+esc(l.recipient_name):'From '+esc(l.sender_name)} · Posted ${date(l.sent_at)}</p></div><span class="pill">${arrival(l.arrives_at).toUpperCase()}</span></div><div class="transit-route"><span><strong>${esc(l.sender_city)}</strong><br><small>${esc(l.sender_country)}</small></span>${icon('arrow')}<span><strong>${esc(l.recipient_city)}</strong><br><small>${esc(l.recipient_country)}</small></span><small style="margin-left:auto">${l.delivery==='express'?'A one-minute little journey':l.delivery==='capsule'?'A letter to the future':'Taking the scenic route'}</small></div>${mapPlaceholder(l)}${track(l)}</article>`).join(''):empty('All your letters have found their way.', 'Send another little piece of your world. We’ll take care of the journey.', 'write','Write a letter','route')}</div><p class="settings-note">Your letter’s position follows its delivery time. This is a virtual postal journey, with city-centre locations rather than GPS tracking. Recent delivered letters stay here so you can see where they arrived.</p>`;
}
function draftsPage() {
  return `<div class="greeting"><div><h1>Unfinished thoughts.</h1><p>No rush. The right words will find you.</p></div><button class="primary" data-go="write">${icon('feather')}A fresh page</button></div><div class="draft-list">${state.drafts.length?state.drafts.map(d=>`<article class="draft-row">${icon('draft')}<div class="draft-copy"><h3>${esc(d.subject||'A letter in the making')}</h3><p>${d.recipient?'To @'+esc(d.recipient.replace(/^@/,'')):'No address yet'} · Saved ${date(d.updated_at)}</p></div><button class="text-button" data-draft="${esc(d.id)}">Keep writing ${icon('arrow')}</button><button class="icon-button" data-delete-draft="${esc(d.id)}" aria-label="Delete draft ${esc(d.subject||'Untitled')}">${icon('trash')}</button></article>`).join(''):empty('A fresh page is a good place to start.', 'Your letters save here as you write, ready for whenever inspiration returns.', 'write','Start a letter','feather')}</div>`;
}
function newComposer(capsule = false) {
  return { recipient:'', subject:'', body:'', paper:'cream', stamp:'botanical', delivery:capsule?'capsule':'tomorrow', arrivesAt:null, id:null, dirty:false };
}
function composePage() {
  if (!state.composer) state.composer = newComposer(state.page==='capsule');
  const c = state.composer;
  return `<div class="greeting"><div><h1>A few words. A whole lot of meaning.</h1><p>Find a quiet moment. Think of someone. Let the words come.</p></div></div><form id="compose-form"><div class="compose-layout"><section class="writing-paper ${esc(c.paper)}" id="writing-paper"><div class="paper-top"><div><div class="eyebrow">FROM THE DESK OF ${esc(state.user.name.toUpperCase())}</div><div class="paper-date">${date(clockNow(),true)}</div></div><div id="paper-stamp">${stamp(c.stamp)}</div></div><div class="field" id="recipient-field" ${c.delivery==='capsule'?'hidden':''}><label class="input-label" for="recipient">To · Their postal address</label><input id="recipient" name="recipient" placeholder="e.g. @a_familiar_name" value="${esc(c.recipient)}" autocomplete="off" maxlength="40" ${c.delivery==='capsule'?'':'required'}><span class="recipient-feedback" id="recipient-feedback">${state.user.demo?'Try @june.demo, or visit Account to switch demo mailboxes.':'Your friend needs an account on this Paper Trails website.'}</span></div><div class="field"><label class="visually-hidden" for="subject">Letter title</label><input class="subject-input" id="subject" name="subject" placeholder="Give your letter a little title…" maxlength="120" value="${esc(c.subject)}" required></div><label class="visually-hidden" for="letter-body">Your letter</label><textarea class="letter-body" id="letter-body" name="body" placeholder="Dear someone,&#10;&#10;I’ve been meaning to tell you…" maxlength="20000" required>${esc(c.body)}</textarea><div class="writing-bottom"><span id="word-count">${wordCount(c.body)} words · No need to hurry.</span><span id="draft-status" role="status">${c.id?'Draft saved':'Your words will save as you write.'}</span></div></section><aside class="compose-settings"><div class="settings-card"><h3>Make it yours</h3><div class="input-label">A little stationery</div><div class="swatches" role="group" aria-label="Paper colour">${[['cream','Warm cream'],['sage','Garden sage'],['rose','Dusty rose']].map(([id,name])=>`<button class="swatch ${id} ${c.paper===id?'selected':''}" type="button" data-paper="${id}" aria-label="${name}" aria-pressed="${c.paper===id}" title="${name}"></button>`).join('')}</div><div class="input-label">Choose a stamp</div><div class="stamp-options" role="group" aria-label="Postage stamp">${[['botanical','Botanical'],['moon','Midnight moon'],['sunrise','Golden sunrise']].map(([id,name])=>`<button class="stamp-option ${c.stamp===id?'selected':''}" data-stamp="${id}" type="button" aria-label="${name}" aria-pressed="${c.stamp===id}" title="${name}">${stamp(id)}</button>`).join('')}</div><p class="settings-note">A little detail makes an ordinary envelope feel like a little treasure.</p></div><div class="settings-card"><h3>Let it take its time</h3>${[['express','The little journey','Arrives in 1 minute · Try it out'],['tomorrow','A day to look forward to','Arrives in 24 hours'],['three-days','The scenic route','Arrives in 3 days'],['capsule','To my future self','Pick a day worth remembering']].map(([id,name,detail])=>`<label class="delivery-option"><input type="radio" name="delivery" value="${id}" ${c.delivery===id?'checked':''}><span><strong>${name}</strong><small>${detail}</small></span></label>`).join('')}<div class="capsule-date" id="capsule-date" ${c.delivery!=='capsule'?'hidden':''}><label class="input-label" for="arrival-date">Open on this date</label><input type="datetime-local" id="arrival-date" value="${c.arrivesAt?localDatetime(c.arrivesAt):''}" min="${localDatetime(clockNow()+60_000)}" ${c.delivery==='capsule'?'required':''}></div><p class="settings-note">Sealed letters can’t be changed. Your recipient can open yours once it arrives.</p></div></aside></div><div class="compose-actions"><button class="secondary" type="button" data-action="save-draft">${icon('draft')}Save for later</button><button class="primary" type="submit">Seal & send ${icon('send')}</button></div><p class="form-error" id="compose-error" role="alert"></p></form>`;
}
function wordCount(value) { return value.trim()?value.trim().split(/\s+/).length:0; }
function localDatetime(value) { const d=new Date(value); return new Date(d.getTime()-d.getTimezoneOffset()*60_000).toISOString().slice(0,16); }
function accountPage() {
  return `<div class="greeting"><div><h1>Your little place in the world.</h1><p>A postal address for your thoughts, stories, and everyday wonders.</p></div></div>${state.user.demo?'<span class="demo-label">SAMPLE POST OFFICE</span>':''}<section class="address-card"><div><div class="eyebrow">YOUR PAPER TRAILS ADDRESS</div><h2>@${esc(state.user.username)}</h2><p>${esc(state.user.name)} · ${esc(state.user.city)}, ${esc(state.user.country)}</p></div><button class="secondary" data-action="copy-address">${icon('copy')}Copy address</button></section><div class="account-grid"><section class="settings-card"><h3>A letter to your future self</h3><p>A reminder of where you are now. A wish for where you’ll be. Write it today and choose when it finds you.</p><button class="text-button" data-go="capsule">Create a time capsule ${icon('arrow')}</button></section><section class="settings-card"><h3>${state.user.demo?'Try both sides of the mailbox':'Your post office'}</h3><p>${state.user.demo?'Send a one-minute letter to @june.demo, then visit June’s mailbox to watch it arrive. Demo mailboxes are shared sample spaces.':'Give your @address to a friend who has an account here. Letters are stored by this running server and are available when you sign back in.'}</p>${state.user.demo?`<button class="secondary" data-persona="alex">Alex’s mailbox</button><button class="secondary" data-persona="june">June’s mailbox</button><button class="text-button" data-action="create-account" style="margin-top:15px">Create my own account ${icon('arrow')}</button>`:`<div class="notice">Keep this website running to visit it. Access from outside this computer needs hosting before friends can join remotely.</div>`}</section></div><section class="settings-card"><h3>A slower kind of connection</h3><p>Delivery stops are a virtual postal journey. Your letters stay sealed until their arrival time. No email notifications are sent; visit your mailbox to find what’s new.</p><p style="margin-top:10px">Letters and accounts are saved on this server. This first version does not provide end-to-end encryption or password recovery.</p></section><button class="secondary" data-action="logout">${icon('logout')}${state.user.demo?'Leave the sample post office':'Sign out'}</button>`;
}
function renderAuth() {
  const signup = state.authMode==='register';
  $('#app').innerHTML = `<main class="auth-page"><section class="auth-story">${brand()}<div class="eyebrow">A SLOWER KIND OF CONNECTION</div><h1>Some things<br>deserve <em>a letter.</em></h1><p>For the stories that don’t fit in a text.<br>For the people who deserve a little more.<br>Let your words take the scenic route.</p>${art()}</section><section class="auth-panel"><div class="auth-inner"><div class="eyebrow">YOUR LITTLE POST OFFICE AWAITS</div><h2>${signup?'A mailbox of your own.':'Welcome back, letter writer.'}</h2><p>${signup?'Pick your postal address. Your next chapter starts here.':'Your letters are right where you left them.'}</p><form id="auth-form">${signup?'<div class="field"><label class="input-label" for="name">Your name</label><input id="name" name="name" placeholder="How shall we address you?" maxlength="70" autocomplete="name" required></div>':''}<div class="field"><label class="input-label" for="username">Your postal address</label><input id="username" name="username" placeholder="${signup?'e.g. alex_morgan':'Your username'}" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" autocomplete="username" required>${signup?'<small class="settings-note">3–24 letters, numbers, or underscores. Friends find you by this address.</small>':''}</div><div class="field"><label class="input-label" for="password">Password</label><input id="password" name="password" type="password" minlength="8" maxlength="200" autocomplete="${signup?'new-password':'current-password'}" placeholder="At least 8 characters" required></div>${signup?'<div class="field-grid"><div class="field"><label class="input-label" for="city">City</label><input id="city" name="city" placeholder="Your town" maxlength="60" autocomplete="address-level2" required></div><div class="field"><label class="input-label" for="country">Country</label><input id="country" name="country" placeholder="Your country" maxlength="60" autocomplete="country-name" required></div></div>':''}<button class="primary" type="submit">${signup?'Open my post office':'Step into my post office'} ${icon('arrow')}</button><p class="form-error" id="auth-error" role="alert"></p></form><div class="auth-switch">${signup?'Already have an address?':'New around here?'}<button data-action="auth-switch">${signup?'Sign in':'Create an account'}</button></div><div class="auth-divider">OR TAKE A LITTLE LOOK AROUND</div><button class="secondary" data-persona="alex">${icon('mail')}Visit the sample post office</button><p class="auth-footnote">Digital letters. Real thoughtfulness. A little time in between.</p></div></section></main>`;
  if (!state.demoAvailable) {
    $('.auth-divider')?.remove();
    $('[data-persona]')?.remove();
  }
}
function showModal(content) { $('#modal-content').innerHTML=content; if (!$('#modal').open) $('#modal').showModal(); }
const modalHead = label => `<div class="modal-header"><span>${label}</span><button class="icon-button" data-action="close-modal" aria-label="Close">${icon('close')}</button></div>`;
async function showLetter(id, unseal = false) {
  const letter = state.letters.find(l=>l.id===id);
  if (!letter) return;
  const received = letter.recipient_id===state.user.id;
  if (letter.status==='travelling') { go('travelling'); toast('A little patience. This letter is still finding its way.'); return; }
  if (received && !letter.opened_at && !unseal) {
    showModal(`${modalHead('A LETTER HAS FOUND ITS WAY TO YOU')}<div class="sealed-view">${envelope(letter,state.user.name.split(' ')[0])}<h2>Someone thought of you.</h2><p>A letter from ${esc(letter.sender_name)}, all the way from ${esc(letter.sender_city)}.</p><button class="primary" data-unseal="${esc(id)}">Break the seal ${icon('mail')}</button></div>`);
    return;
  }
  if (received && !letter.opened_at) {
    await api(`/letters/${id}/open`,'POST',{}); letter.opened_at=clockNow(); render();
  }
  showModal(`${modalHead(received?'A LITTLE PIECE OF THEIR WORLD':'A LITTLE PIECE OF YOUR WORLD')}<article class="reader ${esc(letter.paper)}"><div class="eyebrow">${received?'FROM '+esc(letter.sender_city.toUpperCase()):'TO '+esc(letter.recipient_city.toUpperCase())}, WITH LOVE</div><h2>${esc(letter.subject)}</h2><div class="reader-meta"><span>${received?'From '+esc(letter.sender_name)+' · @'+esc(letter.sender_username):'To '+esc(letter.recipient_name)+' · @'+esc(letter.recipient_username)}</span><span>${date(letter.sent_at,true)}</span></div><div class="reader-body">${esc(letter.body)}</div></article><div class="reader-actions">${received?`<button class="secondary" data-archive="${esc(id)}">${icon('archive')}${letter.archived?'Return to mailbox':'Keep this letter'}</button><button class="primary" data-reply="${esc(id)}">Write back ${icon('feather')}</button>`:`<span class="settings-note">${letter.opened_at?'Opened with care on '+date(letter.opened_at):'Delivered · Waiting to be opened'}</span><button class="secondary" data-action="close-modal">Back to my post office</button>`}</div>`);
}
function syncComposer() {
  if (!state.composer || !$('#compose-form')) return;
  state.composer.recipient=$('#recipient').value;
  state.composer.subject=$('#subject').value;
  state.composer.body=$('#letter-body').value;
  state.composer.delivery=$('input[name="delivery"]:checked').value;
  state.composer.arrivesAt=$('#arrival-date').value?new Date($('#arrival-date').value).getTime():null;
}
let savingPromise = null;
async function saveDraft(silent = false) {
  clearTimeout(saveTimer); syncComposer();
  const c=state.composer;
  if (!c || (!c.body.trim() && !c.subject.trim() && !c.recipient.trim())) return;
  if (savingPromise) { await savingPromise; if (c.dirty) return saveDraft(silent); return; }
  const snapshot=JSON.stringify({ ...c, dirty:false });
  const save = async () => {
    const result = await api('/drafts','POST',c);
    c.id=result.id;
    c.dirty = JSON.stringify({ ...c, id:null, dirty:false }) !== JSON.stringify({ ...JSON.parse(snapshot), id:null, dirty:false });
    if ($('#draft-status')) $('#draft-status').textContent=c.dirty?'Saving your words…':'Draft saved';
    if (!silent) toast('Your words are tucked away for later.');
  };
  savingPromise=save();
  try { await savingPromise; } finally { savingPromise=null; }
}
async function go(page) {
  if (!state.user) { state.authMode='login'; renderAuth(); return; }
  if (state.composer?.dirty) {
    try { await saveDraft(true); } catch(error) { toast(`Draft not saved: ${error.message}`); return; }
  }
  if (page==='write' || page==='capsule') state.composer=newComposer(page==='capsule');
  else { clearTimeout(saveTimer); state.composer=null; }
  state.page=Object.hasOwn(pageNames,page)?page:'home'; state.filter='all'; state.search=''; state.menu=false;
  history.pushState({},'',`#${state.page}`);
  try { await loadMail(); render(); window.scrollTo({top:0}); } catch(error) { toast(error.message); }
}
async function submitLetter() {
  if (state.busy) return;
  state.busy=true;
  const button=$('#confirm-send'); if(button) {button.disabled=true; button.textContent='Posting your letter…';}
  try {
    clearTimeout(saveTimer);
    if (savingPromise) await savingPromise;
    const c=state.composer;
    const result=await api('/letters','POST',{...c,draftId:c.id});
    state.composer=null; state.page='travelling'; history.pushState({},'','#travelling');
    await loadMail(); render();
    showModal(`${modalHead('SIGNED, SEALED, ON ITS WAY')}<div class="success-content"><div class="success-seal">${icon('check')}</div><div class="eyebrow">A LITTLE MOMENT, SENT</div><h2>Your words are on their way.</h2><p>We’ve tucked your letter into its envelope and sent it on a little journey. It will be ready to open on <strong>${date(result.arrives_at,true)}</strong> at <strong>${new Date(result.arrives_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</strong>.</p><button class="primary" data-action="close-modal">Follow the journey ${icon('route')}</button><button class="secondary" data-action="write-another">Write another</button></div>`);
  } catch(error) { $('#modal').close(); if ($('#compose-error')) $('#compose-error').textContent=error.message; toast(error.message); }
  finally { state.busy=false; }
}

document.addEventListener('click', async event => {
  const button=event.target.closest('button'); if(!button) return;
  try {
    if (button.dataset.go) return await go(button.dataset.go);
    if (button.dataset.filter) { state.filter=button.dataset.filter; render(); return; }
    if (button.dataset.letter) return await showLetter(button.dataset.letter);
    if (button.dataset.unseal) return await showLetter(button.dataset.unseal,true);
    if (button.dataset.reply) {
      const l=state.letters.find(l=>l.id===button.dataset.reply); $('#modal').close();
      await go('write'); state.composer={...newComposer(),recipient:l.sender_username,subject:l.subject.startsWith('Re:')?l.subject:`Re: ${l.subject}`,dirty:false}; render(); return;
    }
    if (button.dataset.archive) {
      await api(`/letters/${button.dataset.archive}/archive`,'POST',{}); $('#modal').close(); await loadMail(); render(); toast('Letter moved with care.'); return;
    }
    if (button.dataset.draft) {
      const d=state.drafts.find(d=>d.id===button.dataset.draft); await go('write'); state.composer={...d,dirty:false}; render(); return;
    }
    if (button.dataset.deleteDraft) {
      showModal(`${modalHead('MAKE A LITTLE ROOM')}<div class="success-content"><h2>Let this draft go?</h2><p>This unfinished letter will be permanently removed.</p><button class="primary" data-confirm-delete="${esc(button.dataset.deleteDraft)}">Delete draft</button><button class="secondary" data-action="close-modal">Keep writing later</button></div>`); return;
    }
    if (button.dataset.confirmDelete) { await api(`/drafts/${button.dataset.confirmDelete}`,'DELETE'); $('#modal').close(); await loadMail(); render(); toast('Draft removed.'); return; }
    if (button.dataset.paper) {
      state.composer.paper=button.dataset.paper; $('#writing-paper').className=`writing-paper ${button.dataset.paper}`;
      document.querySelectorAll('[data-paper]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}); changed(); return;
    }
    if (button.dataset.stamp) {
      state.composer.stamp=button.dataset.stamp; $('#paper-stamp').innerHTML=stamp(button.dataset.stamp);
      document.querySelectorAll('[data-stamp]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}); changed(); return;
    }
    if (button.dataset.persona) {
      if (state.composer?.dirty) await saveDraft(true);
      button.disabled=true; state.user=(await api('/demo','POST',{persona:button.dataset.persona})).user; state.composer=null;
      localStorage.setItem('pt-visited','yes'); await go('home'); toast(`Welcome to ${state.user.name.split(' ')[0]}’s sample post office.`); return;
    }
    switch(button.dataset.action) {
      case 'menu': setMenu(!state.menu); break;
      case 'close-modal': if(!state.busy) $('#modal').close(); break;
      case 'write-another': $('#modal').close(); await go('write'); break;
      case 'save-draft': button.disabled=true; try { await saveDraft(); await loadMail(); } finally {button.disabled=false;} break;
      case 'refresh': button.disabled=true; await loadMail(); render(); toast('Your post office is up to date.'); break;
      case 'create-account': state.authMode='register'; await api('/auth/logout','POST',{}); state.user=null; state.composer=null; renderAuth(); window.scrollTo({top:0}); break;
      case 'logout': await api('/auth/logout','POST',{}); state.user=null; state.composer=null; state.authMode='login'; history.replaceState({},'','#welcome'); renderAuth(); break;
      case 'auth-switch': state.authMode=state.authMode==='login'?'register':'login'; renderAuth(); break;
      case 'copy-address': await navigator.clipboard.writeText(`@${state.user.username}`); toast('Postal address copied. Share it with someone you miss.'); break;
      case 'confirm-send': await submitLetter(); break;
    }
  } catch(error) { toast(error.message); if(button.isConnected)button.disabled=false; }
});
function changed() {
  syncComposer(); if (!state.composer) return;
  state.composer.dirty=true; if($('#draft-status'))$('#draft-status').textContent='Saving your words…';
  clearTimeout(saveTimer); saveTimer=setTimeout(()=>saveDraft(true).catch(error=>{ if($('#draft-status'))$('#draft-status').textContent='Not saved. Please try again.'; toast(error.message); }),1200);
}
document.addEventListener('input', event => {
  if(event.target.id==='mail-search') { state.search=event.target.value; $('#letter-list').innerHTML=listMarkup(); return; }
  if(event.target.closest('#compose-form')) {
    changed(); if($('#word-count'))$('#word-count').textContent=`${wordCount($('#letter-body').value)} words · No need to hurry.`;
    if(event.target.id==='recipient') {
      clearTimeout(recipientTimer); const value=event.target.value;
      recipientTimer=setTimeout(async()=>{
        try { const {people}=await api(`/people?q=${encodeURIComponent(value)}`); const feedback=$('#recipient-feedback'); if(feedback&&$('#recipient').value===value) feedback.textContent=people.length?`Address found: ${people[0].name} · ${people[0].city}`:value?'No mailbox found yet. Check the address with your friend.':''; } catch { /* Sending validates the address again. */ }
      },450);
    }
  }
});
document.addEventListener('change', event => {
  if(event.target.name==='delivery') {
    const capsule=event.target.value==='capsule'; $('#capsule-date').hidden=!capsule; $('#arrival-date').required=capsule;
    $('#recipient-field').hidden=capsule; $('#recipient').required=!capsule; changed();
  }
});
document.addEventListener('submit', async event => {
  event.preventDefault();
  if(event.target.id==='auth-form') {
    const button=$('button[type="submit"]',event.target); button.disabled=true; $('#auth-error').textContent='';
    try {const data=Object.fromEntries(new FormData(event.target)); state.user=(await api(`/auth/${state.authMode}`,'POST',data)).user; localStorage.setItem('pt-visited','yes'); await go('home');}
    catch(error) { $('#auth-error').textContent=error.message; button.disabled=false; }
  }
  if(event.target.id==='compose-form') {
    syncComposer(); const c=state.composer; const capsule=c.delivery==='capsule';
    if(capsule&&(!c.arrivesAt||c.arrivesAt<=clockNow())) {$('#compose-error').textContent='Choose a date and time in the future.';return;}
    $('#compose-error').textContent='';
    showModal(`${modalHead('ONE LAST LOOK BEFORE IT LEAVES')}<div class="success-content"><div class="success-seal">${icon('mail')}</div><h2>Ready to let your words wander?</h2><p><strong>${esc(c.subject)}</strong><br>${capsule?'A letter to your future self':'Addressed to @'+esc(c.recipient.replace(/^@/,''))}<br>${capsule?'Opens '+date(c.arrivesAt,true):c.delivery==='express'?'A little one-minute journey':c.delivery==='tomorrow'?'Arrives in 24 hours':'Arrives in three days'}<br>Once posted, your letter stays sealed until it arrives.</p><button class="primary" id="confirm-send" data-action="confirm-send">Post my letter ${icon('send')}</button><button class="secondary" data-action="close-modal">Keep writing</button></div>`);
  }
});
$('#modal').addEventListener('click', event => {if(event.target===$('#modal')&&!state.busy)$('#modal').close();});
$('#modal').addEventListener('cancel', event=>{if(state.busy)event.preventDefault();});
window.addEventListener('beforeunload',event=>{if(state.composer?.dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('popstate',async()=>{
  if(state.composer?.dirty){try{await saveDraft(true);}catch(error){toast(error.message);return;}}
  const page=location.hash.slice(1); state.page=Object.hasOwn(pageNames,page)?page:'home'; state.composer=null; state.search='';state.filter='all'; state.menu=false;
  if(state.user){await loadMail();render();}
});
async function boot() {
  try {
    const session = await api('/session');
    state.user=session.user; state.demoAvailable=session.demoAvailable;
    if(!state.user&&state.demoAvailable&&!localStorage.getItem('pt-visited')&&location.hash!=='#welcome') {
      state.user=(await api('/demo','POST',{persona:'alex'})).user; localStorage.setItem('pt-visited','yes');
    }
    if(state.user){const page=location.hash.slice(1);state.page=Object.hasOwn(pageNames,page)?page:'home';await loadMail();}
    render();
  } catch(error) {$('#app').innerHTML=`<div class="error-page"><h1>The post office is taking a moment.</h1><p>${esc(error.message)}</p><button class="primary" id="retry">Try again</button></div>`;$('#retry').addEventListener('click',boot);}
}
setInterval(async()=>{
  if(!state.user||document.hidden||state.composer||$('#modal').open)return;
  try { const before=JSON.stringify(state.letters); await loadMail(); if(before!==JSON.stringify(state.letters)||state.page==='travelling')render(); } catch { /* Manual refresh also reports connection errors. */ }
},10_000);
boot();
