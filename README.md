# astrology-accuracy-benchmark

Measures what an astrology API actually returns for planetary longitudes, against
Astrodienst's own `swetest`, and reports the difference in arcseconds.

Runs against any provider. Adding one is a 30-line adapter.

## Why this exists

Accuracy claims in this market are unfalsifiable by design. Providers publish a
number with no sample, no reference and no way to re-run it, and buyers have no
way to tell 0.001 arcseconds from 30. This harness exists so the claim can be
checked instead of believed, including ours.

We publish it because we would rather be measured than trusted. If it shows
something bad about our own API, that is the harness working.

## Running it

Node 18 or newer, no dependencies.

```bash
git clone https://github.com/astroway/astrology-accuracy-benchmark
cd astrology-accuracy-benchmark

ASTROWAY_API_KEY=aw_test_... node benchmark.mjs --provider astroway
node benchmark.mjs --provider astroway --json > result.json
```

A sandbox key is free and enough: <https://api.astroway.info/sandbox/>

## What it does

For each of 10 birth moments spread from 1900 to 2050, it asks the provider and
the reference for the same instant, then compares 13 bodies: the ten classical
planets, the true Node, the mean Apogee (Lilith) and Chiron.

The reference is [Astrodienst's swetest CGI](https://www.astro.com/cgi/swetest.cgi),
queried live. Astrodienst wrote the Swiss Ephemeris, which makes their own service
about as close to authoritative as anything queryable without a licence.

## Reading the result

```
130 samples over 10 charts
median 0.0013"   max 0.561" (Chiron, 1900-epoch)
```

One arcsecond is 1/3600 of a degree. For deciding a sign or a house, anything
under a few arcminutes is invisible. It starts to matter for **timing**: the
instant a planet changes sign, an exact aspect perfects, or an eclipse contact
falls. There, an arcsecond of position is seconds to minutes of clock time for a
fast body, and hours for a slow one.

So read the number against what you are building, not as a leaderboard.

## Results

AstroWay API, measured 2026-07-29, 130 samples:

| Body | Max drift |
|---|---|
| Sun, Venus, Saturn | 0.001" |
| Mercury | 0.002" |
| true Node | 0.004" |
| Mars | 0.007" |
| Jupiter | 0.009" |
| Moon | 0.022" |
| Uranus | 0.083" |
| Pluto | 0.097" |
| Neptune | 0.223" |
| **Chiron** | **0.561"** |
| mean Apogee (Lilith) | 0.000" |

Median 0.0013", maximum 0.561".

Chiron and the outer planets drift furthest because their positions come from a
compressed ephemeris set rather than the full data files. We had previously
published a flat "better than 0.1 arcsec" claim; running this is what showed that
Neptune, Pluto and Chiron do not meet it, and the claim was corrected.

## Adding a provider

Copy `providers/astroway.mjs`, change two functions, run it:

```js
export const name = 'yourapi';
export function configure() { /* read env, return whatever fetchChart needs */ }
export async function fetchChart(chart, config) {
  // return { 'Sun': 54.376, 'Moon': 296.905, ... }
  // body names as in reference/swetest.mjs BODIES
}
```

Bodies a provider does not return are reported as `bodiesNotReturned` rather than
counted as errors. A smaller body list is a product decision, not an inaccuracy.

## Caveats, so the numbers are not overstated

- **The reference matters.** These figures are against swetest. A provider
  measured against JPL Horizons is being asked a very slightly different
  question, since Swiss Ephemeris is itself fitted to the JPL ephemerides. When
  comparing two providers, say which reference each used.
- **Ten charts is a sample, not a proof.** Add your own to `charts.json`; the
  format is obvious and the harness picks them up.
- **Longitudes only.** House cusps, and anything derived from a house system,
  are not compared here.
- **Live service.** The reference is a free public CGI. The harness waits 2.5
  seconds between charts on purpose; do not remove that to go faster.
- **Rounding.** The CGI prints seven decimal places, so drift below roughly
  0.0004" is at the edge of what it can express.

## Licence

MIT. Fork it, point it at whoever you like, publish what you find.
