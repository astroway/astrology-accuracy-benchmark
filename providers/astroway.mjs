/*
 * Provider adapter: AstroWay API.
 *
 * An adapter does one job: take a chart from charts.json, ask the provider, and
 * return { bodyName: longitudeInDegrees } using the reference's body names.
 * Copy this file to add your own provider or a competitor; nothing else in the
 * harness needs to change.
 */

export const name = 'astroway';
export const docs = 'https://api.astroway.info/docs/';

/** Their names on the left, the reference's names on the right. */
const RENAME = {
  'true Node': 'true Node',
  'mean Apogee': 'mean Apogee',
};

export function configure() {
  const key = process.env.ASTROWAY_API_KEY;
  if (!key) {
    throw new Error('set ASTROWAY_API_KEY (a sandbox key works: https://api.astroway.info/sandbox/)');
  }
  return { key, base: process.env.ASTROWAY_API_URL || 'https://api.astroway.info/v1' };
}

export async function fetchChart(chart, { key, base }) {
  const res = await fetch(`${base}/chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
    body: JSON.stringify({
      date: chart.date,
      time: chart.time,
      timezoneOffset: chart.tzOffset,
      latitude: chart.latitude,
      longitude: chart.longitude,
      houseSystem: 'P',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 200)}`);

  const out = {};
  for (const p of json.data.planets) {
    out[RENAME[p.name] ?? p.name] = p.longitude;
  }
  return out;
}
