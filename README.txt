BUDGET ENDURO — website v2 (multi-page)
=======================================

Static site, no build tooling required to host it. Upload the folder.

  index.html          home
  events.html         all upcoming rounds
  how-it-works.html   the five steps, eligibility, race day
  rules.html          full 21-section regulations
  results.html        Hall of Fame by circuit
  gallery.html        photos
  faq.html            common questions
  contact.html        email, phone, eligibility enquiries
  enter.html          ArgusIQ entry embed
  assets/             artwork, be.css, be.js
  build.py            page generator

EDIT HERE, NOT IN THE HTML
---------------------------
The header, nav, footer and CTA band live once in build.py. Change them
there and run:

    python3 build.py

All nine pages regenerate. Editing a .html file directly works, but the
next build overwrites it.

  build.py     structure, nav, page copy
  assets/be.css   all styling
  assets/be.js    events data + behaviour

VENUES — SINGLE SOURCE OF TRUTH
--------------------------------
The VENUES list at the top of build.py is the only place circuit data is
written. Running build.py feeds it to three places at once:

  assets/venues.js          runtime — event cards, entry picker, venue cards
  rules.html section 18     the minimum lap time table
  events.html               the circuit comparison table

Minimum lap times used to be typed in all three. Change one now and every
page follows. Mirror these same fields as a `venues` table in Supabase and
ArgusIQ event setup can hydrate an event the moment a track is picked.

Fields: slug, name, short, state, address, lat, lng, min_lap, length_km,
turns, direction, pit_speed, map.

Circuit maps go in assets/tracks/ — see the README in there for format and
where to source them.

EVENTS
------
ALL_EVENTS at the top of assets/be.js holds the events. Each one carries a
venueSlug rather than repeating the venue name, state and lap time.
  - type:'enduro' renders. type:'trackday' never does.
  - an event with a poster: path renders as that poster, fully clickable.
  - an event without one renders as a data-built card, no artwork needed.
Cards sort by date. Home shows 3 (data-events="3"), events.html shows all
(data-events="all"). Replace the array with the ArgusIQ club API when
ready; the type filter moves server-side.

Event cards and Enter buttons link to enter.html#<uuid>, which preselects
that round in the embed.

YOUR ARTWORK — WHERE IT'S USED
-------------------------------
  be-logo.png        header + footer          (budget_enduro_racing_logo)
  hero.jpg           home hero                (budget_enduro_real_racing_action)
  how-it-works.jpg   home + how-it-works, wide screens only
  statement.jpg      home, links to gallery   (real_cars_real_racing)
  sponsors.jpg       home                     (racing_sponsors_promotional_banner)
  event-sep13.jpg    13 Sep card              (calder_park_budget_enduro_poster)
  event-dec12.jpg    12 Dec card              (mallala_motorsport_park_event_poster)
  og.jpg, favicon.png  generated

Dead margins were trimmed off each graphic. Originals untouched in the zip.
NOT USED: calder_park_track_day_2026.png — Track Days stay off this site.

STILL NEEDED
------------
  event-nov07.jpg   poster for the 7 Nov Calder round, same template as
                    13 Sep. Until then that round uses the data-built card.
  gallery-1.jpg .. gallery-6.jpg   real photos.
  Social URLs for the three footer icons (currently href="#").

BEFORE GO-LIVE
--------------
1. Point enter.budgetenduro.com.au at the ArgusIQ deployment, then change
   ARGUS_ORIGIN in assets/be.js. Fixes third-party cookies in Safari.
2. Add frame-ancestors to the CSP on /enter so only this site can embed it.
3. Implement argusiq:resize and argusiq:step postMessage on the ArgusIQ side.
4. Run a live card through the embed on a phone (Square 3DS in an iframe).
