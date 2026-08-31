CIRCUIT MAPS
============

One SVG per circuit, named to match the `map` field in build.py:

  calder-park.svg   DONE - traced from the supplied Calder track map
  mallala.svg       DONE - traced from the supplied Mallala outline
  sandown.svg       still needed
  broadford.svg     still needed
  carnell.svg       still needed

The two finished ones were produced by trace_tracks.py in the project root.
Drop a new source image in, add a few lines to that script and re-run it.

Until a file exists the venue card shows a labelled slot instead — nothing
breaks, and it's obvious which map is missing.

REQUIREMENTS
------------
- SVG, not PNG. It has to stay sharp on a poster and legible in a 250px card.
- Draw the racing line as a stroke, not a fill.
- Use stroke="currentColor" so the map inherits colour from wherever it sits
  (white on the dark card, black on a light event page). No hard-coded fills.
- Include a viewBox. Drop width/height so it scales.
- Keep it to the circuit outline. No labels, logos or north arrows baked in —
  those get added around it.
- Optional but useful: id the start/finish line and pit entry as separate
  paths, so ArgusTime can highlight sectors later.

The two traced maps use fill (not stroke) because they came from raster line
art — potrace outlines the ink, so the shape is filled with currentColor and
reads identically. Either approach is fine.

Minimal example:

  <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"
       fill="none" stroke="currentColor" stroke-width="6"
       stroke-linejoin="round" stroke-linecap="round">
    <path id="circuit" d="M ... Z"/>
    <path id="start-finish" d="M ..." stroke-width="10"/>
  </svg>

WHERE TO GET THEM
-----------------
Do NOT trace the outlines printed on the event posters. Those came out of
image generation and are decorative, not surveyed — they don't match the
real circuits.

Good sources, in order of preference:
1. The circuit operator. Most have a venue map in their competitor pack or
   media kit and will hand over a vector on request.
2. OpenStreetMap. The circuits are mapped as ways. Pull the geometry with
   Overpass, export to SVG, simplify. Attribution required (ODbL).
3. Trace a satellite image yourself in Inkscape or Illustrator. Slow, but
   you control the result and there's no licensing question.
