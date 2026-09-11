'use client';

import { useState } from 'react';
import {
  applyGroupLevel,
  groupIsSplit,
  groupLevel,
  membersOf,
  type CriterionGroup,
} from '@/lib/intake/groups';
import { criterionLabel, criterionOptions, scaleOptions } from '@/lib/intake/readable';
import { m5Band, M5_DIET_LABEL } from '@/lib/intake/m5-bands';
import { M5_INTENSIVE_BANDS } from '@/lib/intake/score';
import type { M5BandId } from '@/lib/intake/adaptive';
import { Choice } from './ui';
import { VoiceControls } from './voice';
import { useSettings, useT } from './settings';

/**
 * A quiet control for something most people should never need.
 *
 * Opening a group up is a repair, not a step in the flow: it exists for the
 * household where washing and brushing teeth genuinely differ. Rendered as an
 * ordinary button it would read as a second thing to decide on every screen,
 * which is precisely the tax this redesign set out to remove. So it is
 * underlined text below the answers, in the place a footnote would go.
 */
function Aside({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="target self-start text-start text-base font-semibold text-fg-muted underline underline-offset-4 hover:text-fg"
    >
      {children}
    </button>
  );
}

/**
 * One grouped question.
 *
 * The group is answered as a whole by default and every member takes the level
 * that is chosen. Where the answers really differ, the group opens up and its
 * criteria are answered one at a time; a group that has been opened stays open,
 * because a household that took the trouble to split it should not have its
 * work quietly collapsed on the next visit.
 */
export function GroupQuestion({
  group,
  levels,
  onChange,
  onNext,
  onBack,
}: {
  group: CriterionGroup;
  levels: Record<string, number>;
  onChange: (levels: Record<string, number>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const { t, r, sub, s, contentLang } = useT();
  const members = membersOf(group);
  const shared = groupLevel(group, levels);
  const [open, setOpen] = useState(() => groupIsSplit(group, levels));

  const options = scaleOptions(group.scale);
  const asOptions = options.map((o) => ({ text: r(o), sub: sub(o) }));

  const pickShared = (v: number) => {
    onChange(applyGroupLevel(group, v, levels));
    // Voice mode advances by itself: someone answering by speaking has no
    // comfortable way to then reach for a Continue button. Tap mode does not,
    // because a tremor makes an accidental touch common and a screen that
    // moves on by itself takes away the chance to notice it.
    if (settings.answerMode === 'voice') setTimeout(onNext, 600);
  };

  if (open) {
    return (
      <div className="flex flex-col gap-4">
        <p {...{ lang: contentLang, dir: 'ltr' as const }} className="text-xl font-semibold">
          {r(group.label)}
        </p>
        {members.map((c) => (
          <Choice
            key={c.id}
            label={r(criterionLabel(c))}
            sub={sub(criterionLabel(c))}
            hint={c.hint ? s(c.hint) : undefined}
            options={criterionOptions(c).map((o) => ({ text: r(o), sub: sub(o) }))}
            labelLang={contentLang}
            optionLang={contentLang}
            value={levels[c.id]}
            onChange={(v) => onChange({ ...levels, [c.id]: v })}
          />
        ))}
        {members.length > 1 ? (
          <Aside
            onClick={() => {
              setOpen(false);
              // Collapsing has to leave one answer standing for the group, or
              // the question would read as unanswered and be asked again. The
              // most dependent answer given is the one kept: it is the one the
              // household actually reported for at least one of these
              // activities, and rounding down would quietly cost them points.
              const given = members
                .map((c) => levels[c.id])
                .filter((v): v is number => v !== undefined);
              if (given.length > 0) {
                onChange(applyGroupLevel(group, Math.max(...given), levels));
              }
            }}
          >
            {t('answerTogether')}
          </Aside>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Choice
        size="large"
        label={r(group.label)}
        sub={sub(group.label)}
        options={asOptions}
        labelLang={contentLang}
        optionLang={contentLang}
        value={shared}
        onChange={pickShared}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{
          id: group.id,
          question: r(group.label),
          options: options.map((o) => r(o)),
        }}
        onPick={pickShared}
        onNext={onNext}
        onBack={onBack}
      />
      {members.length > 1 ? (
        <div className="flex flex-col gap-1">
          <Aside onClick={() => setOpen(true)}>{t('answerSeparately')}</Aside>
          <p className="text-sm text-fg-muted">
            {t('coversCount', { n: members.length })} {t('answerSeparatelyHint')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One module 5 band.
 *
 * The stored value is the band the group scores, not the index of the option
 * that was tapped. Those coincide for two of the three groups and emphatically
 * do not for the third, whose top option is worth six points rather than four,
 * so the mapping goes through `M5_INTENSIVE_BANDS` in both directions.
 */
export function BandQuestion({
  id,
  value,
  onChange,
  onNext,
  onBack,
}: {
  id: M5BandId;
  value: number | undefined;
  onChange: (band: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const { r, sub, contentLang } = useT();
  const band = m5Band(id);
  const isIntensive = id === 'intensive';

  const toBand = (index: number) => (isIntensive ? M5_INTENSIVE_BANDS[index] : index);
  const toIndex = (v: number | undefined) => {
    if (v === undefined) return undefined;
    if (!isIntensive) return v;
    const i = M5_INTENSIVE_BANDS.indexOf(v as (typeof M5_INTENSIVE_BANDS)[number]);
    return i < 0 ? undefined : i;
  };

  const pick = (index: number) => {
    onChange(toBand(index));
    if (settings.answerMode === 'voice') setTimeout(onNext, 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <Choice
        size="large"
        label={r(band.label)}
        sub={sub(band.label)}
        options={band.options.map((o) => ({ text: r(o), sub: sub(o) }))}
        labelLang={contentLang}
        optionLang={contentLang}
        value={toIndex(value)}
        onChange={pick}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{ id: `m5.${id}`, question: r(band.label), options: band.options.map((o) => r(o)) }}
        onPick={pick}
        onNext={onNext}
        onBack={onBack}
      />
    </div>
  );
}

/** The module 5 diet question, scored on the independence scale. */
export function DietQuestion({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const { r, sub, contentLang } = useT();
  const options = scaleOptions('independence');

  const pick = (v: number) => {
    onChange(v);
    if (settings.answerMode === 'voice') setTimeout(onNext, 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <Choice
        size="large"
        label={r(M5_DIET_LABEL)}
        sub={sub(M5_DIET_LABEL)}
        options={options.map((o) => ({ text: r(o), sub: sub(o) }))}
        labelLang={contentLang}
        optionLang={contentLang}
        value={value}
        onChange={pick}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{ id: 'm5.diet', question: r(M5_DIET_LABEL), options: options.map((o) => r(o)) }}
        onPick={pick}
        onNext={onNext}
        onBack={onBack}
      />
    </div>
  );
}
