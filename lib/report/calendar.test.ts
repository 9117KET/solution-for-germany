/**
 * The deadline reminder has to open in whatever calendar a family uses, and
 * must be safe to sync to a shared one.
 */
import { describe, it, expect } from 'vitest';
import { deadlineIcs, deadlineIcsFileName } from './calendar';

const now = new Date('2026-10-01T10:15:30.000Z');
const ics = deadlineIcs('2026-10-21', 'de', now, 'test@anspruch');
const unfolded = ics.replace(/\r\n /g, '');

describe('the deadline entry', () => {
  it('is a single all-day event on the deadline', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(unfolded).toContain('DTSTART;VALUE=DATE:20261021');
    expect(unfolded).toContain('DTEND;VALUE=DATE:20261022');
    expect(unfolded).toContain('DTSTAMP:20261001T101530Z');
    expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('rolls the end over a month and a year', () => {
    const y = deadlineIcs('2026-12-31', 'de', now, 'x').replace(/\r\n /g, '');
    expect(y).toContain('DTEND;VALUE=DATE:20270101');
  });

  it('warns a week and three days ahead', () => {
    expect(unfolded).toContain('TRIGGER:-P7D');
    expect(unfolded).toContain('TRIGGER:-P3D');
  });

  it('says how to meet the deadline, with the date written the German way', () => {
    expect(unfolded).toContain('Frist 21.10.2026');
    expect(unfolded).toContain('Einschreiben');
  });

  it('escapes commas and keeps every line within 75 octets', () => {
    expect(unfolded).toContain('Einschreiben oder Fax mit Sendebericht schicken\\, oder');
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('uses CRLF and nothing else', () => {
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('can be written in English', () => {
    const en = deadlineIcs('2026-10-21', 'en', now, 'x').replace(/\r\n /g, '');
    expect(en).toContain('SUMMARY:Pflegegrad objection deadline: last day');
    expect(en).toContain('deadline 21/10/2026');
  });
});

it('names the file after the deadline', () => {
  expect(deadlineIcsFileName('2026-10-21')).toBe('widerspruchsfrist-2026-10-21.ics');
});
