/*
 * Reference: Astrodienst's own swetest CGI, fetched live.
 *
 * This is the Swiss Ephemeris authors' own service, which makes it the closest
 * thing to an authoritative answer that anyone can query without a licence or a
 * local build. Swiss Ephemeris is itself fitted to the JPL DE ephemerides, so a
 * provider measured against swetest and one measured against JPL Horizons are
 * being asked nearly the same question, but not literally the same one. Say
 * which reference you used whenever you publish a number.
 */

/** swetest body codes, in the order the CGI prints them. */
export const BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'true Node', 'mean Apogee', 'Chiron',
];

const SWE_CODES = '0123456789tAD';

/**
 * The reference date must come from the UT instant, not the local one.
 * Deriving it as floor(hour - tzOffset) leaves the date behind whenever UT
 * crosses midnight, which shows up as a ~1000 arcsecond Moon error: half an
 * hour of lunar motion. That is measurement error, not an ephemeris one.
 */
function toUT({ date, time, tzOffset }) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const ut = new Date(Date.UTC(y, m - 1, d, h, min) - tzOffset * 3600 * 1000);
  return {
    day: ut.getUTCDate(),
    month: ut.getUTCMonth() + 1,
    year: ut.getUTCFullYear(),
    hour: ut.getUTCHours(),
    minute: ut.getUTCMinutes(),
  };
}

export async function fetchReference(chart) {
  const { day, month, year, hour, minute } = toUT(chart);
  const url = `https://www.astro.com/cgi/swetest.cgi`
    + `?arg=-b${day}.${month}.${year}+-ut${hour}%3A${String(minute).padStart(2, '0')}`
    + `+-p${SWE_CODES}+-fPl+-eswe+-head&p=${SWE_CODES}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`swetest CGI returned ${res.status}`);
  const text = (await res.text()).replace(/<[^>]+>/g, '');

  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z ]+?)\s+([\d.]+)\s*$/);
    if (!m) continue;
    const name = m[1].trim();
    // the CGI repeats the block; keep the first reading
    if (BODIES.includes(name) && !(name in out)) out[name] = Number(m[2]);
  }
  return out;
}
