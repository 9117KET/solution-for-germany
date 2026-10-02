/**
 * The objection deadline, as a calendar entry.
 *
 * A month is long enough to forget, and short enough that forgetting costs the
 * objection. A file the person adds to their own calendar is the one reminder
 * that works without an account, a server or notifications from this page.
 *
 * The entry carries no name, no insurance number and no health detail: only
 * that a deadline falls on that day and how to meet it. Calendars sync to
 * clouds and are shared with family, and this file must be safe to land there.
 *
 * Written to RFC 5545 by hand rather than with a library: CRLF line endings,
 * lines folded at 75 octets, text escaped. An all-day event on the deadline,
 * with alarms a week and three days ahead, which leaves time to post a letter.
 */

import type { ContentLang } from '../i18n';
import { formatDate } from '../rules';

const COPY = {
  title: {
    de: 'Widerspruchsfrist Pflegegrad: letzter Tag',
    en: 'Pflegegrad objection deadline: last day',
  },
  body: {
    de:
      'Bis heute muss der Widerspruch gegen den Bescheid bei der Pflegekasse ' +
      'eingegangen sein (Frist {date}). Per Einschreiben oder Fax mit Sendebericht ' +
      'schicken, oder abgeben und den Eingang bestätigen lassen. Eine einfache ' +
      'E-Mail reicht nicht.',
    en:
      'The objection to the decision must reach the Pflegekasse by today ' +
      '(deadline {date}). Send it by registered post or by fax with a transmission ' +
      'report, or hand it in and have receipt confirmed. A plain email is not enough.',
  },
  alarm: {
    de: 'Widerspruch Pflegegrad: Frist am {date}',
    en: 'Pflegegrad objection: deadline on {date}',
  },
} as const;

/** Escape a TEXT value (RFC 5545 §3.3.11). */
const escape = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Fold a content line at 75 octets (RFC 5545 §3.1), never inside a UTF-8
 * sequence: German umlauts are two bytes each.
 */
function fold(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    // Continuation lines start with a space, which counts against their 75.
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

const compact = (iso: string) => iso.replace(/-/g, '');

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** UTC timestamp in the basic format calendars expect: 20261001T101500Z. */
function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function deadlineIcs(
  deadline: string,
  lang: ContentLang,
  now: Date = new Date(),
  uid: string = `${compact(deadline)}-${now.getTime().toString(36)}@anspruch`,
): string {
  const date = formatDate(deadline, lang === 'de' ? 'de-DE' : 'en-GB');
  const fill = (s: string) => s.replace('{date}', date);
  const alarm = (trigger: string) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:${trigger}`,
    `DESCRIPTION:${escape(fill(COPY.alarm[lang]))}`,
    'END:VALARM',
  ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anspruch//Widerspruchsfrist//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compact(deadline)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(deadline))}`,
    `SUMMARY:${escape(COPY.title[lang])}`,
    `DESCRIPTION:${escape(fill(COPY.body[lang]))}`,
    'TRANSP:TRANSPARENT',
    ...alarm('-P7D'),
    ...alarm('-P3D'),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function deadlineIcsFileName(deadline: string): string {
  return `widerspruchsfrist-${deadline}.ics`;
}

/** Hand the entry to the browser's download; calendars open .ics directly. */
export function downloadDeadlineIcs(deadline: string, lang: ContentLang): string {
  const blob = new Blob([deadlineIcs(deadline, lang)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = deadlineIcsFileName(deadline);
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
