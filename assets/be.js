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
    poster:'assets/event-sep13.jpg' },
  { uuid:'590b3526-79c1-446f-ac7f-5ffa0b828522', type:'enduro',
    date:'2026-11-07T09:00:00+11:00', venueSlug:'calder-park',
    name:'Raceworks Budget Enduro', price:'$1,021', status:'open' },
  { uuid:'e6fd8775-ef34-4bdb-9cb6-6ec61cd6e209', type:'enduro',
    date:'2026-12-12T09:00:00+10:30', venueSlug:'mallala',
    name:'State of Origin 1', price:'$1,021', status:'open',
    poster:'assets/event-dec12.jpg' },

  /* Track Days live in ArgusIQ too. They never render here. */
  { uuid:'8574ed4d-4cc9-4069-8a6e-b0088698d045', type:'trackday',
    date:'2026-09-13T09:00:00+10:00', venueSlug:'calder-park',
    name:'Tampered Motorsport Track Day', price:'$275.70', status:'open' },
  { uuid:'a33ac1b9-2aad-4bcb-a032-6420760248a2', type:'trackday',
    date:'2026-11-08T09:00:00+11:00', venueSlug:'calder-park',
    name:'Tampered Motorsport Track Day', price:'$275.70', status:'open' }
];

var EVENTS = ALL_EVENTS
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
  return '<span class="ph" data-map="' + v.map + '">' + v.short + '<br>map loading</span>';
}

function hydrateMaps(root){
  root.querySelectorAll('[data-map]').forEach(function(slot){
    fetch(slot.dataset.map)
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function(svg){ slot.outerHTML = svg; })
      .catch(function(){
        slot.textContent = 'Map coming soon';
      });
  });
}

function fmtDate(d){ return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

/* ---- event card markup ---- */
function eventCard(ev){
  var d = new Date(ev.date);
  var open = ev.status === 'open';
  var when = fmtDate(d);

  var v = venueOf(ev);
  var venueName = v.short || v.name || '';

  if (ev.poster){
    return '<a class="ev-poster" href="enter#' + ev.uuid + '">' +
      '<img src="' + ev.poster + '" loading="lazy" alt="' + ev.name + ' at ' + venueName +
      ', ' + when + '. Entries open.">' +
      '<span class="sr-only">Enter the ' + ev.name + ' at ' + venueName + ' on ' + when +
      ', ' + ev.price + ' per team</span></a>';
  }

  return '<article class="ev ev-fallback">' + TRACK_SVG +
      '<div class="ev-body">' +
        '<div class="ev-date">' +
          '<span class="d">' + String(d.getDate()).padStart(2,'0') + '</span>' +
          '<span class="m">' + MONTHS[d.getMonth()] + '</span>' +
          '<span class="y">' + d.getFullYear() + '</span>' +
        '</div>' +
        '<div class="ev-meta">' +
          '<h3>' + venueName + '</h3>' +
          '<div class="ev-name">' + ev.name + '</div>' +
          '<div class="ev-status' + (open ? '' : ' closed') + '">' +
            '<span class="dot"></span>' + (open ? 'Entries open' : 'Entries closed') + '</div>' +
          '<div class="ev-price"><b>' + ev.price + '</b> per team</div>' +
        '</div>' +
      '</div>' +
      '<div class="ev-actions">' +
        '<a class="btn btn-ghost btn-sm" href="rules">Event info</a>' +
        '<a class="btn btn-primary btn-sm" href="enter#' + ev.uuid + '">Enter now ' + ARROW + '</a>' +
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
      var d = new Date(ev.date);
      return '<button role="tab" aria-selected="' + (i === 0) + '" data-uuid="' + ev.uuid + '">' +
        d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + (venueOf(ev).short || '') + '</button>';
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
          fmtDate(new Date(ev.date)) + ' · ' + ev.price + ' per team';
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
