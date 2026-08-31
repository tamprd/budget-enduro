/* ============================================================
   BUDGET ENDURO — shared behaviour
   ============================================================ */
"use strict";

/* ---- DATA ------------------------------------------------
   Swap ALL_EVENTS for the ArgusIQ club API when it's ready.
   `type` is what keeps Track Days off this site.
   ---------------------------------------------------------- */
var ARGUS_ORIGIN = 'https://www.argusiq.io'; // -> https://enter.budgetenduro.com.au once the CNAME is live

var ALL_EVENTS = [
  { uuid:'f7473fb2-80a2-4a79-8d70-fbb3c2abf7ee', type:'enduro',
    date:'2026-09-13T09:00:00+10:00', venueSlug:'calder-park',
    name:'Raceworks Budget Enduro', price:'$1,021', status:'open',
    poster:'/assets/event-sep13.jpg' },
  { uuid:'590b3526-79c1-446f-ac7f-5ffa0b828522', type:'enduro',
    date:'2026-11-07T09:00:00+11:00', venueSlug:'calder-park',
    name:'Raceworks Budget Enduro', price:'$1,021', status:'open',
    poster:'/assets/event-nov07.jpg' },
  { uuid:'e6fd8775-ef34-4bdb-9cb6-6ec61cd6e209', type:'enduro',
    date:'2026-12-12T09:00:00+10:30', venueSlug:'mallala',
    name:'State of Origin 1', price:'$1,021', status:'open',
    poster:'/assets/event-dec12.jpg' },

  /* Track Days live in ArgusIQ too. They never render here. */
  { uuid:'8574ed4d-4cc9-4069-8a6e-b0088698d045', type:'trackday',
    date:'2026-09-13T09:00:00+10:00', venueSlug:'calder-park',
    name:'Tampered Motorsport Track Day', price:'$275.70', status:'open' },
  { uuid:'a33ac1b9-2aad-4bcb-a032-6420760248a2', type:'trackday',
    date:'2026-11-08T09:00:00+11:00', venueSlug:'calder-park',
    name:'Tampered Motorsport Track Day', price:'$275.70', status:'open' }
];

/* ---- Live events from the ArgusIQ club API, with the array above as a
   fallback seed. Stale-while-revalidate: render from cache (or seed) now,
   refresh the cache in the background for the next page load. ---- */
var BE_CACHE_KEY = 'be_events_v1';
function beCached(){
  try { var s = localStorage.getItem(BE_CACHE_KEY); var d = s ? JSON.parse(s) : null;
    return (d && d.length) ? d : null; } catch (e) { return null; }
}
function bePoster(uuid){
  for (var i = 0; i < ALL_EVENTS.length; i++){ if (ALL_EVENTS[i].uuid === uuid) return ALL_EVENTS[i].poster; }
  return '/assets/hero.jpg';
}
function beNormalize(list){
  return list.map(function(e){
    return {
      uuid: e.uuid,
      type: (e.type === 'track_day') ? 'trackday' : e.type,
      date: e.date,
      venueSlug: e.venue_slug,
      name: e.name,
      price: e.price_display,
      status: e.status,
      poster: bePoster(e.uuid),
      entry_url: e.entry_url
    };
  });
}
var _beLive = beCached();
var LIVE_EVENTS = _beLive ? beNormalize(_beLive) : ALL_EVENTS;
try {
  fetch(ARGUS_ORIGIN + '/api/public/clubs/budget-enduro/events?status=open')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){ if (d && d.events && d.events.length){ try { localStorage.setItem(BE_CACHE_KEY, JSON.stringify(d.events)); } catch (e) {} } })
    .catch(function(){});
} catch (e) {}

/* ---- Live venues for this club from the ArgusIQ club API, with venues.js as
   the seed. Same stale-while-revalidate approach as the events above: rebuild
   the VENUES list and VENUE lookup from cache now, refresh in the background. ---- */
(function () {
  var BE_VENUES_KEY = 'be_venues_v1';
  function beVenuesCached() {
    try { var s = localStorage.getItem(BE_VENUES_KEY); var d = s ? JSON.parse(s) : null;
      return (d && d.length) ? d : null; } catch (e) { return null; }
  }
  function beVenuesNormalize(list) {
    return list.map(function (v) {
      return {
        slug: v.slug, name: v.name, short: v.short, state: v.state, address: v.address,
        lat: v.lat, lng: v.lng, min_lap: v.min_lap_seconds, length_km: v.length_km,
        turns: v.turns, direction: v.direction, pit_speed: v.pit_speed, map: v.map_svg_path
      };
    });
  }
  var _liveVenues = beVenuesCached();
  if (_liveVenues && typeof VENUES !== 'undefined' && typeof VENUE !== 'undefined') {
    VENUES.length = 0;
    Array.prototype.push.apply(VENUES, beVenuesNormalize(_liveVenues));
    for (var k in VENUE) { if (Object.prototype.hasOwnProperty.call(VENUE, k)) delete VENUE[k]; }
    VENUES.forEach(function (v) { VENUE[v.slug] = v; });
  }
  try {
    fetch(ARGUS_ORIGIN + '/api/public/clubs/budget-enduro/venues')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.venues && d.venues.length) { try { localStorage.setItem(BE_VENUES_KEY, JSON.stringify(d.venues)); } catch (e) {} } })
      .catch(function () {});
  } catch (e) {}
})();

var EVENTS = LIVE_EVENTS
  .filter(function(e){ return e.type === 'enduro'; })
  .sort(function(a,b){ return new Date(a.date) - new Date(b.date); });

var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var TRACK_SVG = '<svg class="ev-track" viewBox="0 0 120 70" fill="none" stroke="currentColor" ' +
  'stroke-width="3" aria-hidden="true"><path d="M14 46c-8-6-9-19 1-25C27 13 44 20 58 15c14-5 30-8 42 1 ' +
  '10 8 8 22-3 27-12 6-28 2-42 6-13 4-30 4-41-3z"/></svg>';

var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
  'aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

function venueOf(ev){ return (typeof VENUE !== 'undefined' && VENUE[ev.venueSlug]) || {}; }

function minLapText(v){ return v.min_lap ? v.min_lap + ' sec' : 'To be advised'; }

/* Circuit maps are injected inline rather than via <img> so fill="currentColor"
   inherits the surrounding colour — one file works white on dark and black on light. */
function mapEl(v){
  if (!v.map) return '<span class="ph">Map<br>coming soon</span>';
  return '<span class="map-slot ph" data-map="' + v.map + '">' + v.short + '<br>map loading</span>';
}

function hydrateMaps(root){
  root.querySelectorAll('[data-map]').forEach(function(slot){
    fetch(slot.dataset.map)
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function(svg){
        slot.innerHTML = svg;
        slot.classList.remove('ph');
      })
      .catch(function(){
        slot.classList.add('ph');
        slot.textContent = 'Map coming soon';
      });
  });
}

function localDate(ev){
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ev.date);
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}

function fmtDate(ev){
  var p = localDate(ev);
  return p.d + ' ' + MONTHS[p.m] + ' ' + p.y;
}

/* ---- event card markup ---- */
function eventCard(ev){
  var p = localDate(ev);
  var open = ev.status === 'open';
  var when = fmtDate(ev);

  var v = venueOf(ev);
  var venueName = v.short || v.name || '';

  if (ev.poster){
    return '<a class="ev-poster" href="enter#' + ev.uuid + '">' +
      '<img src="' + ev.poster + '" loading="lazy" alt="' + ev.name + ' at ' + venueName +
      ', ' + when + '. Entries open.">' +
      '<span class="sr-only">Enter the ' + ev.name + ' at ' + venueName + ' on ' + when +
      ', ' + ev.price + ' per team</span></a>';
  }

  // No artwork for this round yet, so build a card in the same idiom as the posters.
  var mapSlot = v.map ? '<span class="ev-fb-map" data-map="' + v.map + '"></span>' : '';

  return '<article class="ev-fallback">' +
      mapSlot +
      '<div class="ev-fb-date">' +
        '<span class="d">' + String(p.d).padStart(2, '0') + '</span>' +
        '<span class="m">' + MONTHS[p.m].toUpperCase() + '</span>' +
        '<span class="y">' + p.y + '</span>' +
      '</div>' +
      '<div class="ev-fb-rule"></div>' +
      '<div class="ev-fb-main">' +
        '<p class="ev-fb-venue">' + venueName + '</p>' +
        '<p class="ev-fb-name">' + ev.name + '</p>' +
        '<span class="ev-fb-status' + (open ? '' : ' closed') + '">' +
          (open ? 'Entries open' : 'Entries closed') + '</span>' +
        '<p class="ev-fb-price"><b>' + ev.price + '</b> per team</p>' +
        '<div class="ev-fb-actions">' +
          '<a class="ev-fb-btn ghost" href="rules">Event info ' + ARROW + '</a>' +
          '<a class="ev-fb-btn go" href="enter#' + ev.uuid + '">Enter now ' + ARROW + '</a>' +
        '</div>' +
      '</div>' +
    '</article>';
}

document.addEventListener('DOMContentLoaded', function(){

  /* ---- mobile nav ---- */
  var toggle = document.getElementById('navToggle'), nav = document.getElementById('siteNav');
  if (toggle && nav){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function(e){
      if (e.target.closest('a')){
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded','false');
      }
    });
  }

  /* ---- event grids (home shows 3, events page shows all) ---- */
  document.querySelectorAll('[data-events]').forEach(function(grid){
    var limit = parseInt(grid.dataset.events, 10);
    var list = isNaN(limit) ? EVENTS : EVENTS.slice(0, limit);
    grid.innerHTML = list.map(eventCard).join('');
    hydrateMaps(grid);
  });

  /* ---- venue cards ---- */
  var vg = document.getElementById('venueGrid');
  if (vg && typeof VENUES !== 'undefined'){
    vg.innerHTML = VENUES.map(function(v){
      return '<article class="venue">' +
        '<div class="venue-map">' + mapEl(v) + '</div>' +
        '<h3>' + v.short + '</h3>' +
        '<div class="st">' + v.state + '</div>' +
        '<dl>' +
          '<dt>Length</dt><dd>' + v.length_km.toFixed(2) + ' km</dd>' +
          '<dt>Turns</dt><dd>' + v.turns + '</dd>' +
          '<dt>Direction</dt><dd>' + v.direction + '</dd>' +
          '<dt>Minimum lap</dt><dd>' + minLapText(v) + '</dd>' +
          '<dt>Pit lane</dt><dd>' + v.pit_speed + ' km/h</dd>' +
        '</dl></article>';
    }).join('');
    hydrateMaps(vg);
  }

  /* ---- results tabs ---- */
  var vbtns = document.querySelectorAll('.venues button');
  vbtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      vbtns.forEach(function(b){
        b.setAttribute('aria-selected','false');
        document.getElementById('pane-' + b.dataset.pane).hidden = true;
      });
      btn.setAttribute('aria-selected','true');
      document.getElementById('pane-' + btn.dataset.pane).hidden = false;
    });
  });

  /* ---- gallery placeholders ---- */
  var gal = document.getElementById('galleryGrid');
  if (gal){
    var CAPTIONS = ['Into turn one','Driver change','Pit lane','Working on the car',
                    'Paddock','Chequered flag'];
    gal.innerHTML = CAPTIONS.map(function(cap, i){
      return '<figure class="shot" style="margin:0">' +
        '<span class="ph">' + cap + '<br>gallery-' + (i+1) + '.jpg</span>' +
        '<img src="assets/gallery-' + (i+1) + '.jpg" alt="' + cap +
        ' at a Budget Enduro round" loading="lazy" onerror="this.remove()">' +
      '</figure>';
    }).join('');
  }

  /* ---- entry page: picker + ArgusIQ embed ---- */
  var frame = document.getElementById('be-entry');
  if (frame){
    var picker   = document.getElementById('picker');
    var fallback = document.getElementById('fallbackLink');
    var heading  = document.getElementById('entryHeading');

    picker.innerHTML = EVENTS.map(function(ev, i){
      var p = localDate(ev);
      return '<button role="tab" aria-selected="' + (i === 0) + '" data-uuid="' + ev.uuid + '">' +
        p.d + ' ' + MONTHS[p.m] + ' · ' + (venueOf(ev).short || '') + '</button>';
    }).join('');

    function loadEvent(uuid){
      var ev = EVENTS.filter(function(e){ return e.uuid === uuid; })[0] || EVENTS[0];
      var base = ARGUS_ORIGIN + '/events/' + ev.uuid + '/enter';
      frame.style.height = '';
      frame.src = base + '?embed=1';
      fallback.href = base;
      if (heading){
        var v = venueOf(ev);
        heading.textContent = ev.name + ' — ' + (v.short || '') + ', ' +
          fmtDate(ev) + ' · ' + ev.price + ' per team';
      }
      Array.prototype.forEach.call(picker.children, function(b){
        b.setAttribute('aria-selected', String(b.dataset.uuid === ev.uuid));
      });
      if (history.replaceState) history.replaceState(null, '', '#' + ev.uuid);
    }

    picker.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (b) loadEvent(b.dataset.uuid);
    });

    var fromHash = location.hash.replace('#','');
    loadEvent(fromHash || (EVENTS[0] && EVENTS[0].uuid));

    window.addEventListener('message', function(e){
      if (e.origin !== ARGUS_ORIGIN) return;
      var d = e.data || {};
      if (d.type === 'argusiq:resize' && typeof d.height === 'number'){
        frame.style.height = Math.max(420, d.height) + 'px';
      }
      if (d.type === 'argusiq:step'){
        frame.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  }
});
