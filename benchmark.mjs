#!/usr/bin/env node
/*
 * Measures an astrology API's planetary longitudes against Astrodienst's own
 * swetest CGI, and prints the drift in arcseconds.
 *
 *   node benchmark.mjs --provider astroway
 *   node benchmark.mjs --provider astroway --json > result.json
 *
 * Add a provider by copying providers/astroway.mjs. The harness does not care
 * whose API it is pointed at, which is the point: a benchmark only one vendor
 * can run is marketing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchReference, BODIES } from './reference/swetest.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const asJson = args.includes('--json');

const providerName = flag('provider', 'astroway');
const delayMs = Number(flag('delay', 2500));   // be kind to a free public service

const provider = await import(`./providers/${providerName}.mjs`);
const { charts } = JSON.parse(fs.readFileSync(path.join(HERE, 'charts.json'), 'utf8'));
const config = provider.configure();

/** Longitudes are circular: 359.99 and 0.01 are 0.02 apart, not 359.98. */
function drift(a, b) {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d * 3600;
}

const samples = [];
const missing = new Set();
const log = (...m) => { if (!asJson) console.log(...m); };

log(`provider: ${providerName}   reference: swetest CGI (Astrodienst)   charts: ${charts.length}\n`);

for (const chart of charts) {
  const [reference, theirs] = [await fetchReference(chart), await provider.fetchChart(chart, config)];
  const row = [];
  for (const body of BODIES) {
    if (!(body in reference)) continue;
    if (!(body in theirs)) { missing.add(body); continue; }
    const arcsec = drift(theirs[body], reference[body]);
    samples.push({ chart: chart.id, body, arcsec });
    row.push(`${body} ${arcsec.toFixed(3)}"`);
  }
  log(`  ${chart.id.padEnd(16)} ${row.length} bodies   worst ${Math.max(...row.map((_, i) => samples[samples.length - row.length + i].arcsec)).toFixed(3)}"`);
  await new Promise(r => setTimeout(r, delayMs));
}

const byBody = {};
for (const s of samples) (byBody[s.body] ??= []).push(s.arcsec);
const sorted = samples.map(s => s.arcsec).sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const max = sorted[sorted.length - 1];
const worst = samples.reduce((a, b) => (b.arcsec > a.arcsec ? b : a));

const result = {
  provider: providerName,
  reference: 'swetest CGI (Astrodienst)',
  measuredAt: new Date().toISOString().slice(0, 10),
  charts: charts.length,
  samples: samples.length,
  medianArcsec: Number(median.toFixed(4)),
  maxArcsec: Number(max.toFixed(3)),
  worstCase: { body: worst.body, chart: worst.chart, arcsec: Number(worst.arcsec.toFixed(3)) },
  byBody: Object.fromEntries(
    Object.entries(byBody).map(([b, arr]) => [b, Number(Math.max(...arr).toFixed(3))]),
  ),
  bodiesNotReturned: [...missing],
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n${'body'.padEnd(14)} max drift`);
  for (const [body, v] of Object.entries(result.byBody).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${body.padEnd(14)} ${v.toFixed(3)}"`);
  }
  if (missing.size) console.log(`\n  not returned by this provider: ${[...missing].join(', ')}`);
  console.log(`\n${samples.length} samples over ${charts.length} charts`);
  console.log(`median ${result.medianArcsec}"   max ${result.maxArcsec}" (${worst.body}, ${worst.chart})`);
}
