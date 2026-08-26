'use client';

import {
  formatEuro,
  SOURCES,
  type Assessment,
  type GapReport,
  type GapStatus,
} from '@/lib/rules';
import { Button, Card, Notice } from './ui';
import { useT } from './settings';
import type { UiKey } from '@/lib/i18n/strings';

const STATUS: Record<GapStatus, { key: UiKey; className: string }> = {
  unclaimed: {
    key: 'statusUnclaimed',
    className: 'border-warn-line bg-warn-bg text-warn-fg',
  },
  claimed: {
    key: 'statusClaimed',
    className: 'border-accent-line bg-accent-soft text-fg',
  },
  check: { key: 'statusCheck', className: 'border-line bg-surface-2 text-fg' },
  ineligible: { key: 'statusIneligible', className: 'border-line bg-surface-2 text-fg-muted' },
};

const PERIOD: Record<'month' | 'year' | 'once', UiKey> = {
  month: 'perMonthShort',
  year: 'perYear',
  once: 'onceShort',
};

export function Report({
  report,
  assessment,
  completeness,
  m5Skipped,
  onRestart,
}: {
  report: GapReport;
  assessment: Assessment;
  completeness: number;
  m5Skipped: boolean;
  onRestart: () => void;
}) {
  const { t, s, numberLocale, contentLang } = useT();
  // Benefit names and action wording are content, so they keep their own
  // direction inside a right-to-left interface.
  const content = { lang: contentLang, dir: 'ltr' as const };
  const { monthlyGapTotal, onceGapTotal, actions, gaps, needsChecking } = report;
  const relevant = gaps.filter((g) => g.status !== 'ineligible');
  // Money follows the interface language, not the content language: the
  // separators someone reads fluently are the ones of the language they chose.
  const money = (c: number) => formatEuro(c, numberLocale);

  return (
    <div className="flex flex-col gap-8">
      {/* ---- headline ---- */}
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {t('resultEyebrow')}
        </p>
        {monthlyGapTotal > 0 ? (
          <>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {t('headlineMoney', { amount: money(monthlyGapTotal) })}
            </h2>
            <p className="text-xl text-fg-muted">
              {t('headlineYear', { amount: money(monthlyGapTotal * 12) })}
            </p>
          </>
        ) : (
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t('headlineNone')}
          </h2>
        )}
        {onceGapTotal > 0 ? (
          <p className="text-xl text-fg-muted">
            {t('headlineOnce', { amount: money(onceGapTotal) })}
          </p>
        ) : null}
      </section>

      {/* ---- the estimate ---- */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            {t('cardEstimated')}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {assessment.grade === 0 ? '–' : assessment.grade}
          </p>
          <p className="mt-1 text-base text-fg-muted">
            {t('pointsOf100', { n: assessment.totalWeighted })}
          </p>
          {/* The grade came from § 15 Abs. 4, not from the points above it, so
              the points would otherwise read as a contradiction. Say which rule
              produced the number, and that the Medizinischer Dienst decides it:
              the statute says "können ... zugeordnet werden". */}
          {assessment.viaBedarfskonstellation ? (
            <p {...content} className="mt-2 text-sm text-fg-muted">
              {s({
                de:
                  'Nicht über die Punkte: Bei Gebrauchsunfähigkeit beider Arme und ' +
                  'beider Beine kann der Medizinische Dienst Pflegegrad 5 zuerkennen, ' +
                  'auch unter 90 Punkten (§ 15 Abs. 4 SGB XI, besondere ' +
                  'Bedarfskonstellation). Nach den Punkten allein wäre es Pflegegrad ' +
                  `${assessment.gradeFromPoints === 0 ? 'kein Pflegegrad' : assessment.gradeFromPoints}. ` +
                  'Diese Zuordnung ist eine pflegefachliche Entscheidung, kein Automatismus.',
                en:
                  'Not from the points: where both arms and both legs are unusable, ' +
                  'the Medizinischer Dienst can award Pflegegrad 5 even below 90 ' +
                  'points (§ 15 Abs. 4 SGB XI, besondere Bedarfskonstellation). On ' +
                  'the points alone this would be ' +
                  `${assessment.gradeFromPoints === 0 ? 'no Pflegegrad' : `Pflegegrad ${assessment.gradeFromPoints}`}. ` +
                  'The assignment is a professional decision, not automatic.',
              })}
            </p>
          ) : null}
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            {t('cardAwarded')}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {report.currentGrade === 0 ? t('none') : report.currentGrade}
          </p>
          {assessment.pointsToNextGrade !== null ? (
            <p className="mt-1 text-base text-fg-muted">
              {t('pointsToNext', {
                n: assessment.pointsToNextGrade,
                grade: String(assessment.nextGrade),
              })}
            </p>
          ) : null}
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            {t('cardAnswered')}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {Math.round(completeness * 100)}%
          </p>
          <p className="mt-1 text-base text-fg-muted">
            {t('unansweredCountAsIndependent')}
          </p>
        </Card>
      </section>

      {/* The cap warning says the estimate cannot reach Pflegegrad 5 without the
          medical questions. Once it has reached 5 anyway, by the besondere
          Bedarfskonstellation, that sentence contradicts the number directly
          above it. A reader who spots the contradiction stops believing both. */}
      {m5Skipped && assessment.grade < 5 ? (
        <Notice tone="warn" title={t('m5SkippedTitle')}>
          {t('m5CapBody')}
        </Notice>
      ) : null}

      {report.estimateExceedsCurrent ? (
        <Notice tone="warn" title={t('estimateHigherTitle')}>
          {t('estimateHigherBody')}
        </Notice>
      ) : null}

      {/* ---- actions ---- */}
      <section className="flex flex-col gap-3">
        <h3 className="text-2xl font-bold tracking-tight">{t('whatToDo')}</h3>
        <ol className="flex flex-col gap-3">
          {actions.map((a, i) => (
            <li key={`${a.kind}-${i}`}>
              <Card>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="flex-1">
                    <p className="text-xl font-bold">
                      <span className="me-2 font-mono" aria-hidden="true">
                        {i + 1}.
                      </span>
                      <span {...content}>{s(a.title)}</span>
                    </p>
                    <p {...content} className="mt-1 text-lg text-fg-muted">
                      {s(a.why)}
                    </p>
                    <p className="mt-2 font-mono text-sm text-fg-muted">
                      {SOURCES[a.source].law}
                      {a.deadline ? ` · ${t('deadlineLabel')} ${a.deadline}` : ''}
                    </p>
                  </div>
                  {a.monthlyValue || a.onceValue ? (
                    <div className="shrink-0 sm:text-end">
                      <p className="text-2xl font-bold tabular-nums text-accent">
                        {money(a.monthlyValue ?? a.onceValue ?? 0)}
                      </p>
                      <p className="text-base text-fg-muted">
                        {a.monthlyValue ? t('perMonthShort') : t('onceShort')}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- where the number comes from ---- */}
      {relevant.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-2xl font-bold tracking-tight">{t('breakdownTitle')}</h3>

          {/*
           * On a phone the same figures are stacked as cards rather than put in
           * a table. The table is 34rem wide at the smallest text setting and
           * wider than any phone at the default one, so on mobile it could only
           * ever be scrolled sideways, and side-scrolling a benefits breakdown
           * is exactly the experience this product exists to avoid. Same data,
           * same order, laid out to be read down the screen.
           */}
          <div className="flex flex-col gap-3 sm:hidden">
            {relevant.map((g) => {
              const st = STATUS[g.status];
              return (
                <Card key={g.benefit.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p {...content} className="text-lg font-semibold">
                      {s(g.benefit.name)}
                    </p>
                    <span
                      className={`inline-block rounded border-[length:var(--line-width)] px-2 py-0.5 text-sm font-bold ${st.className}`}
                    >
                      {t(st.key)}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-fg-muted">
                    {SOURCES[g.source].law} · {t(PERIOD[g.benefit.period])}
                  </p>
                  <dl className="mt-3 flex flex-col gap-1 text-base">
                    <div className="flex justify-between gap-3">
                      <dt className="text-fg-muted">{t('colEntitled')}</dt>
                      <dd className="tabular-nums">{money(g.entitled)}</dd>
                    </div>
                    {/* Where the headline figure was reduced to what a household
                        covered by a relative can draw, name the pooled budget too,
                        so the smaller number is never mistaken for the whole rule. */}
                    {g.fullEntitled ? (
                      <div className="flex justify-between gap-3">
                        <dt {...content} className="text-sm text-fg-muted">
                          {s({ de: 'Voller Jahresbetrag', en: 'Full annual budget' })}
                        </dt>
                        <dd className="text-sm tabular-nums text-fg-muted">
                          {money(g.fullEntitled)}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-3">
                      <dt className="text-fg-muted">{t('colClaimed')}</dt>
                      <dd className="tabular-nums">{money(g.claimed)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-line pt-1">
                      <dt className="font-semibold">{t('colGap')}</dt>
                      <dd className="font-bold tabular-nums">
                        {g.gap > 0 ? money(g.gap) : '–'}
                      </dd>
                    </div>
                  </dl>
                  {g.benefit.caveat ? (
                    <p {...content} className="mt-2 text-sm text-fg-muted">
                      {s(g.benefit.caveat)}
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <div className="bordered hidden overflow-x-auto rounded-lg sm:block">
            <table className="w-full min-w-[34rem] border-collapse text-base">
              <thead>
                <tr className="bg-surface-2 text-start">
                  <th scope="col" className="px-4 py-3 font-bold">
                    {t('colBenefit')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    {t('colEntitled')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    {t('colClaimed')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    {t('colGap')}
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    {t('colStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {relevant.map((g) => {
                  const st = STATUS[g.status];
                  return (
                    <tr key={g.benefit.id} className="border-t border-line align-top">
                      <th scope="row" className="px-4 py-3 text-start font-medium">
                        <span {...content}>{s(g.benefit.name)}</span>
                        <span className="mt-0.5 block font-mono text-sm font-normal text-fg-muted">
                          {SOURCES[g.source].law} · {t(PERIOD[g.benefit.period])}
                        </span>
                        {g.benefit.caveat ? (
                          <span
                            {...content}
                            className="mt-1 block max-w-sm text-sm font-normal text-fg-muted"
                          >
                            {s(g.benefit.caveat)}
                          </span>
                        ) : null}
                      </th>
                      <td className="px-4 py-3 tabular-nums">
                        {money(g.entitled)}
                        {g.fullEntitled ? (
                          <span
                            {...content}
                            className="mt-0.5 block text-sm font-normal text-fg-muted"
                          >
                            {s({ de: 'von', en: 'of' })} {money(g.fullEntitled)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{money(g.claimed)}</td>
                      <td className="px-4 py-3 font-bold tabular-nums">
                        {g.gap > 0 ? money(g.gap) : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded border-[length:var(--line-width)] px-2 py-0.5 text-sm font-bold ${st.className}`}
                        >
                          {t(st.key)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-base text-fg-muted">{t('exclusiveNote')}</p>
        </section>
      ) : (
        <Notice title={t('nothingToCompareTitle')}>{t('nothingToCompareBody')}</Notice>
      )}

      {needsChecking.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-2xl font-bold tracking-tight">{t('worthChecking')}</h3>
          <div className="flex flex-col gap-2">
            {needsChecking.map((g) => (
              <Card key={g.benefit.id}>
                <p {...content} className="text-xl font-semibold">
                  {s(g.benefit.name)}
                </p>
                <p className="mt-1 text-lg text-fg-muted">
                  <span {...content}>{s(g.benefit.what)}</span>{' '}
                  {t('upTo', {
                    amount: money(g.entitled),
                    period: t(PERIOD[g.benefit.period]),
                  })}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="flex flex-col gap-4 border-t border-line pt-6">
        <p className="max-w-prose text-base text-fg-muted">
          <span {...content}>{s(report.disclaimer)}</span> {t('disclaimerExtra')}
        </p>
        <div className="no-print flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            {t('printPage')}
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            ← {t('restart')}
          </Button>
        </div>
      </footer>
    </div>
  );
}
