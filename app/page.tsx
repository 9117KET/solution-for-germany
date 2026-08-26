'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  CONDITIONS,
  criteriaFor,
  type ConditionId,
  type Criterion,
} from '@/lib/intake/criteria';
import {
  M5_CRITERIA,
  assessIntake,
  emptyIntake,
  isApplicable,
  isM5Applicable,
  type Frequency,
  type IntakeAnswers,
  type M5Criterion,
} from '@/lib/intake/score';
import { saveSession } from '@/lib/intake/session';
import {
  discardSession,
  dismissOffer,
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from '@/lib/intake/session-store';
import {
  conditionLabel,
  criterionLabel,
  criterionOptions,
  m5Label,
  scaleOptions,
} from '@/lib/intake/readable';
import {
  BENEFITS,
  analyse,
  entitlement,
  type BenefitId,
  type Circumstances,
  type ModuleId,
  type Pflegegrad,
} from '@/lib/rules';
import { Button, Card, Choice, FrequencyRow, Notice, Progress, StepShell, YesNo } from '@/components/ui';
import { Report } from '@/components/report';
import { Welcome } from '@/components/welcome';
import { ReadScreenAloud, VoiceControls } from '@/components/voice';
import { useSettings, useT } from '@/components/settings';
import type { UiKey } from '@/lib/i18n/strings';

const MODULE_COPY: Record<ModuleId, { eyebrow: UiKey; title: UiKey; intro: UiKey }> = {
  m1: { eyebrow: 'm1Eyebrow', title: 'm1Title', intro: 'm1Intro' },
  m2: { eyebrow: 'm2Eyebrow', title: 'm2Title', intro: 'm2Intro' },
  m3: { eyebrow: 'm3Eyebrow', title: 'm3Title', intro: 'm3Intro' },
  m4: { eyebrow: 'm4Eyebrow', title: 'm4Title', intro: 'm4Intro' },
  m5: { eyebrow: 'm5Eyebrow', title: 'm5Title', intro: 'm5Intro' },
  m6: { eyebrow: 'm6Eyebrow', title: 'm6Title', intro: 'm6Intro' },
};

/**
 * One screen in the flow.
 *
 * Modelling the flow as a flat list of screens rather than as nested steps is
 * what makes "one question at a time" and "a whole section at a time" the same
 * code path. Only the list differs; navigation, progress and the voice controls
 * do not care which shape they are walking.
 */
type Screen =
  | { kind: 'welcome' }
  | { kind: 'situation' }
  | { kind: 'conditions' }
  /** A single gating question, on its own, so voice mode can drive it. */
  | { kind: 'condition'; id: ConditionId }
  /** A single scored criterion, on its own. */
  | { kind: 'criterion'; module: ModuleId; criterion: Criterion }
  /** Every criterion of one module together. */
  | { kind: 'module'; module: ModuleId }
  /** A single module 5 frequency row. */
  | { kind: 'm5-row'; criterion: M5Criterion }
  /** The module 5 diet question, which is scored on a scale, not a frequency. */
  | { kind: 'm5-diet' }
  /** Every module 5 row together. */
  | { kind: 'm5' }
  | { kind: 'report' };

export default function Home() {
  const { settings } = useSettings();
  const { t, r, sub, s, contentLang } = useT();

  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntake);
  const [currentGrade, setCurrentGrade] = useState<Pflegegrad>(0);
  const [bescheidDate, setBescheidDate] = useState('');
  const [claimed, setClaimed] = useState<Set<BenefitId>>(new Set());
  const [circumstances, setCircumstances] = useState<Circumstances>({
    atHome: true,
    sharedHousehold: false,
    wantsHomeAdaptation: false,
  });
  const [index, setIndex] = useState(0);

  // A session found on this device, offered on the welcome screen until the
  // person either takes it or throws it away.
  const saved = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  const hasMedical = answers.conditions.hasMedicalMeasures === true;
  const oneAtATime = settings.pace === 'one';

  const dietCriterion = useMemo(
    () => M5_CRITERIA.find((c) => c.group === 'diet')!,
    [],
  );

  /**
   * The screens, rebuilt whenever a gating answer changes.
   *
   * Criteria that do not apply never become screens, so a household is not
   * walked past questions about a stoma it does not have.
   */
  const screens = useMemo<Screen[]>(() => {
    const out: Screen[] = [{ kind: 'welcome' }, { kind: 'situation' }];

    // The gating questions are the first real questions anyone meets. Left as
    // one grouped screen they were silent in voice mode, which made the whole
    // feature look broken before a single assessment question appeared.
    if (oneAtATime) {
      for (const id of Object.keys(CONDITIONS) as ConditionId[]) {
        out.push({ kind: 'condition', id });
      }
    } else {
      out.push({ kind: 'conditions' });
    }

    const pushModule = (module: ModuleId) => {
      if (oneAtATime) {
        for (const criterion of criteriaFor(module)) {
          if (isApplicable(criterion, answers.conditions)) {
            out.push({ kind: 'criterion', module, criterion });
          }
        }
      } else {
        out.push({ kind: 'module', module });
      }
    };

    // m1–m4 come first, then module 5 where it applies, then m6, the order the
    // official instrument uses.
    pushModule('m1');
    pushModule('m2');
    pushModule('m3');
    pushModule('m4');

    if (hasMedical) {
      if (oneAtATime) {
        for (const criterion of M5_CRITERIA) {
          if (criterion.group === 'diet') continue;
          if (isM5Applicable(criterion, answers.conditions)) {
            out.push({ kind: 'm5-row', criterion });
          }
        }
        out.push({ kind: 'm5-diet' });
      } else {
        out.push({ kind: 'm5' });
      }
    }

    pushModule('m6');
    out.push({ kind: 'report' });
    return out;
  }, [answers.conditions, hasMedical, oneAtATime]);

  // Clamp rather than reset: changing a gating answer can shorten the flow out
  // from under the current position, and dropping someone back to the start
  // would lose everything they had answered.
  const position = Math.min(index, screens.length - 1);
  const screen = screens[position];

  const setLevel = (id: string, v: number) =>
    setAnswers((a) => ({ ...a, levels: { ...a.levels, [id]: v } }));
  const setCondition = (id: ConditionId, v: boolean) =>
    setAnswers((a) => ({ ...a, conditions: { ...a.conditions, [id]: v } }));
  const setFrequency = (id: string, f: Frequency | undefined) =>
    setAnswers((a) => ({ ...a, frequencies: { ...a.frequencies, [id]: f } }));

  const { scored, assessment } = useMemo(() => assessIntake(answers), [answers]);

  const report = useMemo(() => {
    const claimedMap: Partial<Record<BenefitId, number>> = {};
    for (const id of claimed) claimedMap[id] = entitlement(id, currentGrade);
    return analyse({
      currentGrade,
      assessment,
      claimed: claimedMap,
      circumstances,
      bescheidDate: bescheidDate || undefined,
    });
  }, [claimed, currentGrade, assessment, circumstances, bescheidDate]);

  const goNext = useCallback(
    () => setIndex((i) => Math.min(screens.length - 1, i + 1)),
    [screens.length],
  );
  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const restart = () => {
    setAnswers(emptyIntake());
    setCurrentGrade(0);
    setBescheidDate('');
    setClaimed(new Set());
    setCircumstances({ atHome: true, sharedHousehold: false, wantsHomeAdaptation: false });
    setIndex(0);
    // Starting again is the only erase control most people will look for, so
    // it has to be a real erase and not just a cleared screen.
    discardSession();
  };

  const resumeSaved = () => {
    if (!saved) return;
    setAnswers(saved.answers);
    setCurrentGrade(saved.currentGrade);
    setBescheidDate(saved.bescheidDate);
    setClaimed(new Set(saved.claimed));
    setCircumstances(saved.circumstances);
    setIndex(saved.index);
    dismissOffer();
  };

  /**
   * Write the intake back as it is given.
   *
   * No guard is needed against the first render overwriting a stored session:
   * `saveSession` declines anything that carries no answers, so an empty
   * intake never reaches the device. That also means simply opening the page
   * and closing it again leaves no trace.
   */
  useEffect(() => {
    saveSession({
      answers,
      currentGrade,
      bescheidDate,
      claimed: [...claimed],
      circumstances,
      index,
      savedAt: new Date().toISOString(),
    });
  }, [answers, currentGrade, bescheidDate, claimed, circumstances, index]);

  // Moving to a new screen puts focus on its heading and scrolls to the top.
  // Without this, a keyboard or screen-reader user stays focused wherever the
  // old button was and gets no announcement that the question changed.
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus();
  }, [position]);

  /**
   * Where we are, counted in the same units as the label claims.
   *
   * On a question screen this counts questions, not screens: telling someone
   * they are on "question 2" while showing them the first question is a small
   * lie that makes the number useless. Everywhere else it counts steps.
   */
  const isQuestionScreen = (sc: Screen) =>
    sc.kind === 'criterion' ||
    sc.kind === 'm5-row' ||
    sc.kind === 'm5-diet' ||
    sc.kind === 'condition';

  const progress = (() => {
    if (isQuestionScreen(screen)) {
      const questions = screens.filter(isQuestionScreen);
      return {
        key: 'questionOf' as const,
        n: questions.indexOf(screen) + 1,
        total: questions.length,
      };
    }
    // Steps, excluding the welcome screen and the report.
    const steps: Screen[] = screens.filter(
      (sc) => sc.kind !== 'welcome' && sc.kind !== 'report',
    );
    return {
      key: 'stepOf' as const,
      n: Math.max(1, steps.indexOf(screen) + 1),
      total: steps.length,
    };
  })();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-4 pt-5 sm:pb-10 sm:pt-10">
      {screen.kind !== 'welcome' && screen.kind !== 'report' ? (
        <Progress
          current={progress.n}
          total={progress.total}
          label={t(progress.key, { n: progress.n, total: progress.total })}
        />
      ) : null}

      {/* Focus lands here on every screen change; tabIndex -1 makes it
          focusable without adding it to the tab order. */}
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        {screen.kind === 'welcome' ? (
          <Welcome
            onStart={() => {
              // Walking past the offer is an answer too. Stop showing it, but
              // leave the file alone: nothing is deleted until the first real
              // answer overwrites it, or until they ask.
              dismissOffer();
              goNext();
            }}
            resume={
              saved
                ? { onContinue: resumeSaved, onDiscard: restart }
                : undefined
            }
          />
        ) : null}

        {screen.kind === 'situation' ? (
          <StepShell
            eyebrow={t('situationEyebrow')}
            title={t('situationTitle')}
            intro={t('situationIntro')}
          >
            <ReadScreenAloud
              id="situation"
              text={`${t('situationTitle')}. ${t('situationIntro')} ${t('currentGradeQ')}`}
            />
            <Card>
              <p className="text-lg font-semibold">{t('currentGradeQ')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([0, 1, 2, 3, 4, 5] as Pflegegrad[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={currentGrade === g}
                    onClick={() => setCurrentGrade(g)}
                    className={`target bordered rounded-lg px-4 py-3 text-lg font-semibold ${
                      currentGrade === g
                        ? 'border-accent-line bg-accent text-accent-fg font-bold'
                        : 'bg-surface hover:bg-surface-2'
                    }`}
                  >
                    {g === 0 ? t('gradeNone') : t('gradeN', { n: g })}
                  </button>
                ))}
              </div>
            </Card>

            {currentGrade > 0 ? (
              <>
                <Card>
                  <label className="text-lg font-semibold" htmlFor="bescheid">
                    {t('bescheidQ')}
                  </label>
                  <p className="mt-1 text-base text-fg-muted">{t('bescheidHint')}</p>
                  <input
                    id="bescheid"
                    type="date"
                    value={bescheidDate}
                    onChange={(e) => setBescheidDate(e.target.value)}
                    className="bordered target mt-3 rounded-md bg-surface px-3 text-lg"
                  />
                </Card>

                <Card>
                  <p className="text-lg font-semibold">{t('claimedQ')}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    {BENEFITS.filter((b) => b.amounts[currentGrade] > 0).map((b) => (
                      <label
                        key={b.id}
                        className="target bordered flex cursor-pointer items-start gap-3 rounded-lg bg-surface px-4 py-3 hover:bg-surface-2"
                      >
                        <input
                          type="checkbox"
                          checked={claimed.has(b.id)}
                          onChange={(e) =>
                            setClaimed((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(b.id);
                              else next.delete(b.id);
                              return next;
                            })
                          }
                          className="mt-1 size-5 shrink-0 accent-accent"
                        />
                        <span>
                          <span lang={contentLang} dir="ltr" className="block text-lg font-medium">
                            {s(b.name)}
                          </span>
                          <span
                            lang={contentLang}
                            dir="ltr"
                            className="mt-0.5 block text-base text-fg-muted"
                          >
                            {s(b.what)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Card>
              </>
            ) : null}

            <YesNo
              label={t('atHomeQ')}
              value={circumstances.atHome}
              onChange={(v) => setCircumstances((c) => ({ ...c, atHome: v }))}
            />
            <YesNo
              label={t('sharedQ')}
              hint={t('sharedHint')}
              value={circumstances.sharedHousehold}
              onChange={(v) => setCircumstances((c) => ({ ...c, sharedHousehold: v }))}
            />
            <YesNo
              label={t('adaptQ')}
              hint={t('adaptHint')}
              value={circumstances.wantsHomeAdaptation}
              onChange={(v) => setCircumstances((c) => ({ ...c, wantsHomeAdaptation: v }))}
            />
          </StepShell>
        ) : null}

        {screen.kind === 'conditions' ? (
          <StepShell
            eyebrow={t('conditionsEyebrow')}
            title={t('conditionsTitle')}
            intro={t('conditionsIntro')}
          >
            {(Object.keys(CONDITIONS) as ConditionId[]).map((id) => {
              const label = conditionLabel(id);
              return (
                <YesNo
                  key={id}
                  label={r(label)}
                  sub={sub(label)}
                  labelLang={contentLang}
                  value={answers.conditions[id]}
                  onChange={(v) => setCondition(id, v)}
                />
              );
            })}
            {answers.conditions.hasMedicalMeasures === false ? (
              <Notice tone="warn" title={t('m5CapTitle')}>
                {t('m5CapBody')}
              </Notice>
            ) : null}
          </StepShell>
        ) : null}

        {screen.kind === 'condition' ? (
          <SingleCondition
            id={screen.id}
            value={answers.conditions[screen.id]}
            onPick={(v) => setCondition(screen.id, v)}
            onNext={goNext}
            onBack={goBack}
            showM5Warning={
              screen.id === 'hasMedicalMeasures' &&
              answers.conditions.hasMedicalMeasures === false
            }
          />
        ) : null}

        {screen.kind === 'criterion' ? (
          <SingleCriterion
            module={screen.module}
            criterion={screen.criterion}
            value={answers.levels[screen.criterion.id]}
            onPick={(v) => setLevel(screen.criterion.id, v)}
            onNext={goNext}
            onBack={goBack}
          />
        ) : null}

        {screen.kind === 'module' ? (
          <StepShell
            eyebrow={t(MODULE_COPY[screen.module].eyebrow)}
            title={t(MODULE_COPY[screen.module].title)}
            intro={t(MODULE_COPY[screen.module].intro)}
          >
            {criteriaFor(screen.module)
              .filter((c) => isApplicable(c, answers.conditions))
              .map((c) => {
                const label = criterionLabel(c);
                return (
                  <Choice
                    key={c.id}
                    label={r(label)}
                    sub={sub(label)}
                    hint={c.hint ? s(c.hint) : undefined}
                    options={criterionOptions(c).map((o) => ({ text: r(o), sub: sub(o) }))}
                    labelLang={contentLang}
                    optionLang={contentLang}
                    value={answers.levels[c.id]}
                    onChange={(v) => setLevel(c.id, v)}
                  />
                );
              })}
          </StepShell>
        ) : null}

        {screen.kind === 'm5-row' ? (
          <StepShell
            eyebrow={t(MODULE_COPY.m5.eyebrow)}
            title={t('howOften')}
            intro={t(MODULE_COPY.m5.intro)}
          >
            <FrequencyRow
              label={r(m5Label(screen.criterion))}
              sub={sub(m5Label(screen.criterion))}
              labelLang={contentLang}
              value={answers.frequencies[screen.criterion.id]}
              onChange={(f) => setFrequency(screen.criterion.id, f)}
            />
          </StepShell>
        ) : null}

        {screen.kind === 'm5-diet' ? (
          <SingleDiet
            criterion={dietCriterion}
            value={answers.dietLevel}
            onPick={(v) => setAnswers((a) => ({ ...a, dietLevel: v }))}
            onNext={goNext}
            onBack={goBack}
          />
        ) : null}

        {screen.kind === 'm5' ? (
          <StepShell
            eyebrow={t(MODULE_COPY.m5.eyebrow)}
            title={t(MODULE_COPY.m5.title)}
            intro={t(MODULE_COPY.m5.intro)}
          >
            {(['daily', 'weekly', 'intensive'] as const).map((group) => {
              const rows = M5_CRITERIA.filter(
                (c) => c.group === group && isM5Applicable(c, answers.conditions),
              );
              if (rows.length === 0) return null;
              return (
                <div key={group} className="flex flex-col gap-2">
                  <h3 className="mt-2 text-lg font-bold">
                    {t(
                      group === 'daily'
                        ? 'm5GroupDaily'
                        : group === 'weekly'
                          ? 'm5GroupWeekly'
                          : 'm5GroupIntensive',
                    )}
                  </h3>
                  {rows.map((c) => (
                    <FrequencyRow
                      key={c.id}
                      label={r(m5Label(c))}
                      sub={sub(m5Label(c))}
                      labelLang={contentLang}
                      value={answers.frequencies[c.id]}
                      onChange={(f) => setFrequency(c.id, f)}
                    />
                  ))}
                </div>
              );
            })}
            <Choice
              label={r(m5Label(dietCriterion))}
              sub={sub(m5Label(dietCriterion))}
              options={scaleOptions('independence').map((o) => ({ text: r(o), sub: sub(o) }))}
              labelLang={contentLang}
              optionLang={contentLang}
              value={answers.dietLevel}
              onChange={(v) => setAnswers((a) => ({ ...a, dietLevel: v }))}
            />
          </StepShell>
        ) : null}

        {screen.kind === 'report' ? (
          <Report
            report={report}
            assessment={assessment}
            completeness={scored.completeness}
            m5Skipped={!hasMedical}
            onRestart={restart}
          />
        ) : null}
      </div>

      {screen.kind !== 'welcome' && screen.kind !== 'report' ? (
        /*
         * Pinned to the bottom of the screen on a phone.
         *
         * A question with four answers and its official wording underneath is
         * taller than a phone, so a nav that sits at the end of the document
         * puts "Continue" below the fold on every single question, forty-nine
         * scrolls to the end for someone who is already finding this hard.
         * From `sm:` up there is room, so it returns to the flow.
         */
        <nav
          className="no-print sticky bottom-0 -mx-4 mt-auto flex items-center justify-between gap-3 border-t border-line bg-bg px-4 py-3 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-5"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <Button variant="secondary" onClick={goBack}>
            ← {t('back')}
          </Button>
          <Button onClick={goNext}>
            {screens[position + 1]?.kind === 'report' ? t('seeResult') : t('next')} →
          </Button>
        </nav>
      ) : null}
    </main>
  );
}

/**
 * One criterion on a screen of its own.
 *
 * In voice mode an answer advances by itself, because someone answering by
 * voice has no comfortable way to then reach for a Continue button. In tap mode
 * it does not: an accidental touch is common with a tremor, and a screen that
 * moves on by itself takes away the chance to notice and correct it. The
 * Continue button stays in the same place on every screen either way.
 */
function SingleCriterion({
  module,
  criterion,
  value,
  onPick,
  onNext,
  onBack,
}: {
  module: ModuleId;
  criterion: Criterion;
  value: number | undefined;
  onPick: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const { t, r, sub, s, contentLang } = useT();
  const label = criterionLabel(criterion);
  const options = criterionOptions(criterion);
  const optionText = options.map((o) => r(o));

  const pick = (v: number) => {
    onPick(v);
    if (settings.answerMode === 'voice') setTimeout(onNext, 600);
  };

  return (
    <StepShell eyebrow={t(MODULE_COPY[module].eyebrow)} title={t(MODULE_COPY[module].title)}>
      <Choice
        size="large"
        label={r(label)}
        sub={sub(label)}
        hint={criterion.hint ? s(criterion.hint) : undefined}
        options={options.map((o) => ({ text: r(o), sub: sub(o) }))}
        labelLang={contentLang}
        optionLang={contentLang}
        value={value}
        onChange={pick}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{
          id: criterion.id,
          question: r(label),
          hint: criterion.hint ? s(criterion.hint) : undefined,
          options: optionText,
        }}
        onPick={pick}
        onNext={onNext}
        onBack={onBack}
      />
    </StepShell>
  );
}

/**
 * One gating question on a screen of its own.
 *
 * The question is content and the Yes/No answers are interface copy, so the two
 * are spoken in different voices and only the question carries the content
 * language for direction purposes.
 */
function SingleCondition({
  id,
  value,
  onPick,
  onNext,
  onBack,
  showM5Warning,
}: {
  id: ConditionId;
  value: boolean | undefined;
  onPick: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  showM5Warning: boolean;
}) {
  const { settings } = useSettings();
  const { t, r, sub, contentLang } = useT();
  const label = conditionLabel(id);

  const pick = (v: boolean) => {
    onPick(v);
    // Never skip past the warning that this caps the estimate a grade low.
    if (settings.answerMode === 'voice' && !(id === 'hasMedicalMeasures' && !v)) {
      setTimeout(onNext, 600);
    }
  };

  return (
    <StepShell eyebrow={t('conditionsEyebrow')} title={t('conditionsTitle')}>
      <YesNo
        size="large"
        label={r(label)}
        sub={sub(label)}
        labelLang={contentLang}
        value={value}
        onChange={pick}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{
          id,
          question: r(label),
          options: [t('yes'), t('no')],
          optionsAreChrome: true,
        }}
        onPick={(i: number) => pick(i === 0)}
        onNext={onNext}
        onBack={onBack}
      />
      {showM5Warning ? (
        <Notice tone="warn" title={t('m5CapTitle')}>
          {t('m5CapBody')}
        </Notice>
      ) : null}
    </StepShell>
  );
}

/** The module 5 diet question, which uses a scale rather than a frequency. */
function SingleDiet({
  criterion,
  value,
  onPick,
  onNext,
  onBack,
}: {
  criterion: M5Criterion;
  value: number | undefined;
  onPick: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { settings } = useSettings();
  const { t, r, sub, contentLang } = useT();
  const label = m5Label(criterion);
  const options = scaleOptions('independence');

  const pick = (v: number) => {
    onPick(v);
    if (settings.answerMode === 'voice') setTimeout(onNext, 600);
  };

  return (
    <StepShell eyebrow={t(MODULE_COPY.m5.eyebrow)} title={t(MODULE_COPY.m5.title)}>
      <Choice
        size="large"
        label={r(label)}
        sub={sub(label)}
        options={options.map((o) => ({ text: r(o), sub: sub(o) }))}
        labelLang={contentLang}
        optionLang={contentLang}
        value={value}
        onChange={pick}
        numbered={settings.answerMode === 'voice'}
      />
      <VoiceControls
        q={{ id: criterion.id, question: r(label), options: options.map((o) => r(o)) }}
        onPick={pick}
        onNext={onNext}
        onBack={onBack}
      />
    </StepShell>
  );
}
