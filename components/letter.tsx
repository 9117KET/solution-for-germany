'use client';

import { useId, useMemo, useState } from 'react';
import type { IntakeAnswers } from '@/lib/intake/score';
import { formatDate, localToday, type Pflegegrad } from '@/lib/rules';
import {
  buildLetter,
  downloadLetterPdf,
  letterText,
  type LetterDetails,
  type LetterKind,
} from '@/lib/report/letter';
import { Button, Card } from './ui';
import { useT } from './settings';

/**
 * The letter behind an action, written on the device.
 *
 * Personal details are held in this component's state and nowhere else: not
 * in the saved session, not in the URL. Closing the panel or the tab forgets
 * them, which is the right default for an insurance number on a shared
 * family computer.
 */
export function LetterPanel({
  kind,
  deadline,
  bescheidDate,
  currentGrade,
  estimatedGrade,
  atLeast,
  atHome,
  answers,
}: {
  kind: LetterKind;
  deadline?: string;
  bescheidDate: string;
  currentGrade: Pflegegrad;
  estimatedGrade: Pflegegrad;
  atLeast: boolean;
  atHome: boolean;
  answers: IntakeAnswers;
}) {
  const { t, numberLocale } = useT();
  const [details, setDetails] = useState<LetterDetails>({ bescheidDate });
  const [onBehalf, setOnBehalf] = useState(false);
  const [status, setStatus] = useState<'idle' | 'copied' | 'working' | 'failed'>('idle');

  const letter = useMemo(
    () =>
      buildLetter({
        kind,
        details: { ...details, representative: onBehalf ? details.representative ?? {} : undefined },
        currentGrade,
        estimatedGrade,
        atLeast,
        atHome,
        answers,
      }),
    [kind, details, onBehalf, currentGrade, estimatedGrade, atLeast, atHome, answers],
  );
  const text = letterText(letter);

  const set = (patch: Partial<LetterDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
    setStatus('idle');
  };
  const setRep = (patch: { name?: string; address?: string }) =>
    set({ representative: { ...details.representative, ...patch } });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  const download = async () => {
    setStatus('working');
    try {
      await downloadLetterPdf(letter);
      setStatus('idle');
    } catch {
      setStatus('failed');
    }
  };

  const sendNote =
    kind === 'widerspruch-pflegegrad'
      ? deadline
        ? t('letterSendObjection', { date: formatDate(deadline, numberLocale) })
        : t('letterSendObjectionNoDate')
      : t('letterSendOther');

  return (
    <Card tone="raised">
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-xl font-bold">{t('letterTitle')}</h4>
          <p className="mt-1 max-w-prose text-base text-fg-muted">{t('letterIntro')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('letterPerson')} value={details.personName} onChange={(v) => set({ personName: v })} autoComplete="off" />
          <Field label={t('letterBirth')} type="date" value={details.birthDate} onChange={(v) => set({ birthDate: v })} max={localToday()} />
          <Field label={t('letterInsNo')} value={details.insuranceNumber} onChange={(v) => set({ insuranceNumber: v })} autoComplete="off" />
          {kind === 'widerspruch-pflegegrad' ? (
            <Field label={t('bescheidQ')} type="date" value={details.bescheidDate} onChange={(v) => set({ bescheidDate: v })} max={localToday()} />
          ) : null}
          {!onBehalf ? (
            <Field label={t('letterAddress')} multiline value={details.address} onChange={(v) => set({ address: v })} />
          ) : null}
          <Field
            label={t('letterInsurer')}
            hint={t('letterInsurerHint')}
            multiline
            value={details.insurer}
            onChange={(v) => set({ insurer: v })}
          />
        </div>

        <label className="target bordered flex cursor-pointer items-start gap-3 rounded-lg bg-surface px-4 py-3">
          <input
            type="checkbox"
            checked={onBehalf}
            onChange={(e) => {
              setOnBehalf(e.target.checked);
              setStatus('idle');
            }}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
          <span className="text-lg">{t('letterOnBehalf')}</span>
        </label>
        {onBehalf ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('letterYourName')} value={details.representative?.name} onChange={(v) => setRep({ name: v })} />
            <Field label={t('letterYourAddress')} multiline value={details.representative?.address} onChange={(v) => setRep({ address: v })} />
          </div>
        ) : null}

        <div>
          <p className="text-lg font-semibold">{t('letterPreview')}</p>
          {/* The letter itself is German whatever the interface says. */}
          <pre
            lang="de"
            dir="ltr"
            className="bordered mt-2 max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface p-4 font-sans text-base leading-relaxed"
          >
            {text}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={download} disabled={status === 'working'}>
            {t('letterDownload')}
          </Button>
          <Button variant="secondary" onClick={copy}>
            {t('letterCopy')}
          </Button>
        </div>
        <p role="status" className="text-base">
          {status === 'copied' ? t('letterCopied') : status === 'failed' ? t('letterFailed') : ''}
        </p>

        <div>
          <p className="text-lg font-semibold">{t('letterSendTitle')}</p>
          <p className="mt-1 max-w-prose text-base">{sendNote}</p>
          {onBehalf ? <p className="mt-2 max-w-prose text-base">{t('letterVollmacht')}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  multiline,
  max,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange: (v: string) => void;
  type?: 'text' | 'date';
  multiline?: boolean;
  max?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const common = {
    id,
    value: value ?? '',
    'aria-describedby': hint ? hintId : undefined,
    className: 'bordered target w-full rounded-md bg-surface px-3 py-2 text-lg',
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          {...common}
          type={type}
          max={max}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
