'use client';

import { useState, type ReactNode } from 'react';
import type { Frequency, Per } from '@/lib/intake/score';
import { useT } from './settings';

export function StepShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
        ) : null}
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {intro ? <div className="max-w-prose text-lg text-fg-muted">{intro}</div> : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  wide,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  wide?: boolean;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-accent text-accent-fg border-accent-line font-bold',
    secondary: 'bg-surface text-fg border-line font-semibold',
    ghost: 'bg-transparent text-fg border-transparent font-semibold underline',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`target rounded-lg border-[length:var(--line-width)] px-6 py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed ${
        styles[variant]
      } ${wide ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, tone }: { children: ReactNode; tone?: 'plain' | 'raised' }) {
  return (
    <div
      className={`bordered rounded-lg p-4 sm:p-5 ${
        tone === 'raised' ? 'bg-surface-2' : 'bg-surface'
      }`}
    >
      {children}
    </div>
  );
}

export interface Option {
  /** The wording to lead with. */
  text: string;
  /** The official wording, shown small underneath. Null when it adds nothing. */
  sub?: string | null;
}

/**
 * Attributes that keep German or English text readable inside an Arabic page.
 *
 * Without an explicit direction, a German sentence in a right-to-left container
 * has its trailing full stop reordered to the visual left (".Sich im Bett
 * bewegen") because the punctuation is direction-neutral and inherits the
 * container's direction. Declaring the direction on the element that holds the
 * text isolates it and puts the punctuation back where it belongs.
 *
 * Returns nothing at all when the text is in the interface language, so this
 * costs nothing on the five left-to-right interfaces.
 */
export function textAttrs(lang?: string): { lang?: string; dir?: 'ltr' } {
  return lang ? { lang, dir: 'ltr' } : {};
}

/**
 * One assessment question.
 *
 * The options are a real radio group rather than a row of buttons with
 * `aria-pressed`. That matters for anyone on a screen reader: a radio group
 * announces "3 of 4" and supports arrow-key navigation, where a set of toggle
 * buttons announces nothing about being one choice among several.
 *
 * Options stack vertically by default instead of sitting in a four-across row.
 * A row forces each label into a narrow column, which wraps badly and becomes
 * unreadable the moment the text scale goes up, exactly when it matters most.
 */
export function Choice({
  label,
  sub,
  hint,
  options,
  value,
  onChange,
  numbered = false,
  size = 'normal',
  labelLang,
  optionLang,
}: {
  label: string;
  sub?: string | null;
  hint?: string;
  options: readonly Option[];
  value: number | undefined;
  onChange: (v: number) => void;
  /** Show the position of each option, for people answering by voice. */
  numbered?: boolean;
  size?: 'normal' | 'large';
  /** Set when the label is content rather than interface copy. */
  labelLang?: string;
  /** Set when the options are content rather than interface copy. */
  optionLang?: string;
}) {
  const labelAttrs = textAttrs(labelLang);
  const optionAttrs = textAttrs(optionLang);
  const groupId = `q-${label.replace(/\W+/g, '-').slice(0, 40)}`;
  return (
    <fieldset className={size === 'large' ? '' : 'bordered rounded-lg bg-surface p-4 sm:p-5'}>
      <legend className={size === 'large' ? 'mb-4' : 'mb-3'}>
        <span
          {...labelAttrs}
          className={`block font-semibold ${size === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg'}`}
        >
          {label}
        </span>
        {sub ? (
          <span {...labelAttrs} className="mt-1 block text-sm text-fg-muted">
            {sub}
          </span>
        ) : null}
        {hint ? (
          <span
            {...labelAttrs}
            className={`mt-2 block text-fg-muted ${size === 'large' ? 'text-lg' : 'text-base'}`}
          >
            {hint}
          </span>
        ) : null}
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const active = value === i;
          return (
            <label
              key={`${opt.text}-${i}`}
              className={`target bordered flex cursor-pointer items-start gap-3 rounded-lg px-4 py-3 ${
                active
                  ? 'border-accent-line bg-accent text-accent-fg font-bold'
                  : 'bg-surface hover:bg-surface-2'
              }`}
            >
              <input
                type="radio"
                name={groupId}
                checked={active}
                onChange={() => onChange(i)}
                className="mt-1 size-5 shrink-0 accent-current"
              />
              <span className="flex-1">
                <span
                  {...optionAttrs}
                  className={`block ${size === 'large' ? 'text-xl' : 'text-base'}`}
                >
                  {numbered ? (
                    <span className="me-2 font-mono font-bold" aria-hidden="true">
                      {i + 1}.
                    </span>
                  ) : null}
                  {opt.text}
                </span>
                {opt.sub ? (
                  <span
                    {...optionAttrs}
                    // Not dimmed when selected. Fading the sub-label to 80%
                    // put it at 5.8:1 on the accent, under the 7:1 the rest of
                    // the palette is held to, and the smaller size already
                    // carries the hierarchy without spending contrast on it.
                    className={`mt-0.5 block text-sm ${active ? '' : 'text-fg-muted'}`}
                  >
                    {opt.sub}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function YesNo({
  label,
  sub,
  hint,
  value,
  onChange,
  numbered,
  size,
  labelLang,
}: {
  label: string;
  sub?: string | null;
  hint?: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  numbered?: boolean;
  size?: 'normal' | 'large';
  labelLang?: string;
}) {
  const { t } = useT();
  return (
    <Choice
      label={label}
      sub={sub}
      hint={hint}
      numbered={numbered}
      size={size}
      labelLang={labelLang}
      options={[{ text: t('yes') }, { text: t('no') }]}
      value={value === undefined ? undefined : value ? 0 : 1}
      onChange={(i) => onChange(i === 0)}
    />
  );
}

/**
 * Module 5 asks how often something happens, so it needs a count and a unit.
 *
 * A count of zero reports no frequency at all rather than `0 per week`, so an
 * untouched row cannot pool into a group total. The unit therefore has to live
 * in local state: it has nowhere to go in the answers while the count is zero,
 * and choosing a unit must never be read as reporting an occurrence.
 *
 * Stepper buttons flank the field because typing into a number input is one of
 * the harder things to do with a tremor, and because the arrows browsers put on
 * number inputs are far too small to hit reliably.
 */
export function FrequencyRow({
  label,
  sub,
  value,
  onChange,
  labelLang,
}: {
  label: string;
  sub?: string | null;
  value: Frequency | undefined;
  onChange: (f: Frequency | undefined) => void;
  labelLang?: string;
}) {
  const { t } = useT();
  const labelAttrs = textAttrs(labelLang);
  const [per, setPer] = useState<Per>(value?.per ?? 'week');
  const count = value?.count ?? 0;

  const emit = (nextCount: number, nextPer: Per) =>
    onChange(nextCount <= 0 ? undefined : { count: nextCount, per: nextPer });

  const PER_OPTIONS: ReadonlyArray<{ value: Per; label: string }> = [
    { value: 'day', label: t('perDay') },
    { value: 'week', label: t('perWeek') },
    { value: 'month', label: t('perMonth') },
  ];

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div>
          <p {...labelAttrs} className="text-lg font-medium">
            {label}
          </p>
          {sub ? (
            <p {...labelAttrs} className="mt-0.5 text-sm text-fg-muted">
              {sub}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => emit(Math.max(0, count - 1), per)}
            disabled={count === 0}
            aria-label={`${t('textSizeSmaller')}: ${label}`}
            className="target bordered rounded-md px-4 text-xl font-bold disabled:opacity-40"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={count}
            aria-label={`${t('howOften')} ${label}`}
            onChange={(e) => {
              const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
              emit(n, per);
            }}
            className="bordered target w-20 rounded-md bg-surface px-3 text-center text-lg tabular-nums"
          />
          <button
            type="button"
            onClick={() => emit(count + 1, per)}
            aria-label={`${t('textSizeBigger')}: ${label}`}
            className="target bordered rounded-md px-4 text-xl font-bold"
          >
            +
          </button>
          <select
            value={per}
            aria-label={`${t('unitLabel')}: ${label}`}
            onChange={(e) => {
              const next = e.target.value as Per;
              setPer(next);
              // Changing the unit alone reports nothing: without a count there
              // is no occurrence to record.
              emit(count, next);
            }}
            className="bordered target rounded-md bg-surface px-3 text-lg"
          >
            {PER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {count === 0 ? (
            <span className="text-base text-fg-muted">{t('neverHappens')}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function Progress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const pct = total <= 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="no-print flex items-center gap-3">
      <div
        className="bordered h-3 flex-1 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-base font-semibold tabular-nums text-fg-muted">{label}</span>
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn';
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border-[length:var(--line-width)] p-4 ${
        tone === 'warn'
          ? 'border-warn-line bg-warn-bg text-warn-fg'
          : 'border-line bg-surface text-fg'
      }`}
      role={tone === 'warn' ? 'note' : undefined}
    >
      <p className="text-lg font-bold">{title}</p>
      <div className="mt-1 text-base">{children}</div>
    </div>
  );
}
