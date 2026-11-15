import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveLength, formatCompact, formatNumber, formatRating, initials, minutesToText, relativeTime } from './format.ts';
import { charsUntilXp, levelProgress } from './xp.ts';
import { feedFilterLabel, FEED_FILTERS } from '../features/feed/filters.ts';

test('Türkçe sayı biçimi', () => {
  assert.equal(formatNumber(2180), '2.180');
  assert.equal(formatNumber(1284000), '1.284.000');
  assert.equal(formatCompact(12400), '12,4B');
  assert.equal(formatCompact(2300000), '2,3M');
  assert.equal(formatCompact(9999), '9.999');
  assert.equal(formatRating(8.6), '8,6');
  assert.equal(formatRating(null), '—');
});

test('göreli zaman', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  assert.equal(relativeTime('2026-11-14T11:59:30Z', now), 'şimdi');
  assert.equal(relativeTime('2026-11-14T11:15:00Z', now), '45 dk');
  assert.equal(relativeTime('2026-11-14T09:00:00Z', now), '3 sa');
  assert.equal(relativeTime('2026-11-13T09:00:00Z', now), 'dün');
  assert.equal(relativeTime('2026-11-10T09:00:00Z', now), '4 g');
});

test('yardımcılar', () => {
  assert.equal(minutesToText(112), '1 sa 52 dk');
  assert.equal(minutesToText(45), '45 dk');
  assert.equal(initials('ayşe kara'), 'AK');
  assert.equal(initials('işık'), 'İ');
  assert.equal(effectiveLength('çooook   güzel'), 'çokgüzel'.length);
});

test('seviye ilerlemesi sunucu eşikleriyle aynı', () => {
  assert.deepEqual(levelProgress(0), { level: 1, currentMin: 0, nextMin: 100, remaining: 100, progress: 0 });
  const p = levelProgress(2180);
  assert.equal(p.level, 6);
  assert.equal(p.remaining, 570);
  assert.equal(Math.round(p.progress * 100), 43);
  assert.equal(levelProgress(9000).progress, 1);
  assert.equal(charsUntilXp(250, 'review'), 50);
  assert.equal(charsUntilXp(400, 'review'), 0);
});

test('akış filtreleri', () => {
  assert.deepEqual(FEED_FILTERS.map((f) => f.id), ['all', 'books', 'films', 'series', 'quotes', 'reviews']);
  assert.equal(feedFilterLabel('quotes'), 'Alıntılar');
});
