'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ConditionId } from '@/lib/intake/criteria';
import {
  assessIntake,
  emptyIntake,
  type IntakeAnswers,
} from '@/lib/intake/score';
import {
  askableId,
  coverageOf,
  fullPlan,
  gradeBounds,
  isAnswered,
  isAskable,
  remainingAskables,
  SCREENING,
  type Askable,
} from '@/lib/intake/adaptive';
import { saveSession } from '@/lib/intake/session';
import {
  discardSession,
  dismissOffer,
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from '@/lib/intake/session-store';
import { conditionLabel } from '@/lib/intake/readable';
import {
  BENEFITS,
  analyse,
  entitlement,
  type BenefitId,
  type Circumstances,
  type ModuleId,
  type Pflegegrad,
} from '@/lib/rules';
import { Button, Card, Notice, Progress, StepShell, YesNo } from '@/components/ui';
import { BandQuestion, DietQuestion, GroupQuestion } from '@/components/question';
import { Report } from '@/components/report';
import { Welcome } from '@/components/welcome';
import { VoiceControls } from '@/components/voice';
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

const SCREENING_SET = new Set<string>(SCREENING);

/**
 * Which heading a question sits under.
 *
 * Also the unit the "a section at a time" pace groups by, which is why it is a
 * function of the askable rather than a field on it: the screening questions
 * are one section regardless of what they gate, and tube feeding belongs with
 * self-care because that is the module it opens up.
 */
function sectionOf(a: Askable): string {
  if (a.kind === 'condition') return SCREENING_SET.has(a.id) ? 'screening' : 'm4';
  if (a.kind === 'group') return a.group.module;
  return 'm5';
}

function sectionCopy(section: string): { eyebrow: UiKey; title: UiKey; intro?: UiKey } {
  if (section === 'screening') {
    return { eyebrow: 'conditionsEyebrow', title: 'conditionsTitle', intro: 'conditionsIntro' };
  }
  const copy = MODULE_COPY[section as ModuleId];
  return { eyebrow: copy.eyebrow, title: copy.title, intro: copy.intro };
}

export default function Home() {
  const { settings } = useSettings();
  const { t, r, sub, contentLang, plainWords } = useT();

  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntake);
  const [currentGrade, setCurrentGrade] = useState<Pflegegrad>(0);
  const [bescheidDate, setBescheidDate] = useState('');
  const [claimed, setClaimed] = useState<Set<BenefitId>>(new Set());
  const [circumstances, setCircumstances] = useState<Circumstances>({
    atHome: true,
    sharedHousehold: false,
    wantsHomeAdaptation: false,
  });
  /**
   * Questions in the order they were first answered.
   *
   * The intake is no longer a fixed list, so "where am I" cannot be an index
   * into one. What has been asked is history and what is left is recomputed
   * from the answers on every render; this is the first half, and it is what
   * keeps Back working after an answer changes which questions exist.
   */
  const [order, setOrder] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  /**
   * Whether answers may still be written to this device.
   *
   * Turned off by the erase control on the report and left off until the
   * person starts again. Without it, erasing and then ticking one box on the
   * report would quietly write the file back while the page still said
   * "Erased.", which would make the promise false at the exact moment somebody
   * had asked us to keep it.
   */
  const [persist, setPersist] = useState(true);

  const saved = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  const oneAtATime = settings.pace === 'one';

  const byId = useMemo(() => new Map(fullPlan().map((a) => [askableId(a), a])), []);

  /**
   * Everything answered so far, then everything still worth asking.
   *
   * The second half shrinks as answers come in, and empties the moment the
   * grade is settled, which is what ends the intake early. It can also grow: a
   * yes to a screening question opens a module that was not there before.
   */
  const questions = useMemo<Askable[]>(() => {
    const done = order
      .map((id) => byId.get(id))
      .filter((a): a is Askable => a !== undefined)
      .filter((a) => isAskable(a, answers) && isAnswered(a, answers));
    return [...done, ...remainingAskables(answers)];
  }, [order, byId, answers]);

  /**
   * How many questions are still open, and where the open ones start.
   *
   * Zero remaining is the end of the intake, whether that came from answering
   * everything or from the grade settling early. Where it is not zero, the
   * report offers to carry on, and this is the screen it jumps back to.
   */
  const remaining = useMemo(() => remainingAskables(answers).length, [answers]);
  const answeredCount = questions.length - remaining;

  /** Screens, as chunks of questions: one per screen, or a section per screen. */
  const chunks = useMemo<Askable[][]>(() => {
    if (oneAtATime) return questions.map((a) => [a]);
    const out: Askable[][] = [];
    for (const a of questions) {
      const last = out[out.length - 1];
      if (last && sectionOf(last[0]) === sectionOf(a)) last.push(a);
      else out.push([a]);
    }
    return out;
  }, [questions, oneAtATime]);

  // welcome, situation, one screen per chunk, report.
  const total = chunks.length + 3;
  const position = Math.min(Math.max(step, 0), total - 1);
  const chunkIndex = position - 2;
  const chunk = chunkIndex >= 0 && chunkIndex < chunks.length ? chunks[chunkIndex] : null;
  const onReport = position === total - 1;
  const onWelcome = position === 0;
  const onSituation = position === 1;

  const note = useCallback((a: Askable) => {
    const id = askableId(a);
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const setCondition = (id: ConditionId, v: boolean) => {
    setAnswers((a) => ({ ...a, conditions: { ...a.conditions, [id]: v } }));
    note({ kind: 'condition', id });
  };

  const { assessment } = useMemo(() => assessIntake(answers), [answers]);
  const bounds = useMemo(() => gradeBounds(answers), [answers]);
  const coverage = useMemo(() => coverageOf(answers), [answers]);

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

  const goNext = useCallback(() => setStep((i) => i + 1), []);
  const goBack = useCallback(() => setStep((i) => Math.max(0, i - 1)), []);

  const restart = () => {
    setAnswers(emptyIntake());
    setCurrentGrade(0);
    setBescheidDate('');
    setClaimed(new Set());
    setCircumstances({ atHome: true, sharedHousehold: false, wantsHomeAdaptation: false });
    setOrder([]);
    setStep(0);
    setPersist(true);
    discardSession();
  };

  const resumeSaved = () => {
    if (!saved) return;
    setAnswers(saved.answers);
    setCurrentGrade(saved.currentGrade);
    setBescheidDate(saved.bescheidDate);
    setClaimed(new Set(saved.claimed));
    setCircumstances(saved.circumstances);
    setOrder(saved.order ?? []);
    setStep(saved.index);
    dismissOffer();
  };

  useEffect(() => {
    if (!persist) return;
    saveSession({
      answers,
      currentGrade,
      bescheidDate,
      claimed: [...claimed],
      circumstances,
      order,
      index: step,
      savedAt: new Date().toISOString(),
    });
  }, [answers, currentGrade, bescheidDate, claimed, circumstances, order, step, persist]);

  // Focus lands on the heading of every new screen and the page scrolls up.
  // Without it a keyboard or screen-reader user stays focused where the old
  // button was and gets no announcement that the question changed.
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    headingRef.current?.focus();
  }, [position]);

  const renderAskable = (a: Askable, alone: boolean) => {
    switch (a.kind) {
      case 'condition': {
        const label = conditionLabel(a.id);
        return (
          <div key={askableId(a)} className="flex flex-col gap-4">
            <YesNo
              size={alone ? 'large' : 'normal'}
              label={r(label)}
              sub={sub(label)}
              labelLang={contentLang}
              value={answers.conditions[a.id]}
              onChange={(v) => {
                setCondition(a.id, v);
                // Never skip past the warning that saying no here caps the
                // estimate a whole grade low.
                if (
                  alone &&
                  settings.answerMode === 'voice' &&
                  !(a.id === 'hasMedicalMeasures' && !v)
                ) {
                  setTimeout(goNext, 600);
                }
              }}
              numbered={alone && settings.answerMode === 'voice'}
            />
            {alone ? (
              <VoiceControls
                q={{
                  id: a.id,
                  question: r(label),
                  options: [t('yes'), t('no')],
                  optionsAreChrome: true,
                }}
                onPick={(i: number) => setCondition(a.id, i === 0)}
                onNext={goNext}
                onBack={goBack}
              />
            ) : null}
            {a.id === 'hasMedicalMeasures' && answers.conditions.hasMedicalMeasures === false ? (
              <Notice tone="warn" title={t('m5CapTitle')}>
                {t('m5CapBody')}
              </Notice>
            ) : null}
          </div>
        );
      }
      case 'group':
        return (
          <GroupQuestion
            key={askableId(a)}
            group={a.group}
            levels={answers.levels}
            onChange={(levels) => {
              setAnswers((prev) => ({ ...prev, levels }));
              note(a);
            }}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'm5band':
        return (
          <BandQuestion
            key={askableId(a)}
            id={a.id}
            value={answers.m5?.[a.id]}
            onChange={(band) => {
              setAnswers((prev) => ({ ...prev, m5: { ...prev.m5, [a.id]: band } }));
              note(a);
            }}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 'm5diet':
        return (
          <DietQuestion
            key={askableId(a)}
            value={answers.dietLevel}
            onChange={(v) => {
              setAnswers((prev) => ({ ...prev, dietLevel: v }));
              note(a);
            }}
            onNext={goNext}
            onBack={goBack}
          />
        );
    }
  };

  const section = chunk ? sectionOf(chunk[0]) : null;
  const copy = section ? sectionCopy(section) : null;
  const nextIsReport = position === total - 2;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-4 pt-5 sm:pb-10 sm:pt-10">
      {!onWelcome && !onReport ? (
        <Progress
          current={position - 1}
          total={total - 2}
          label={t(oneAtATime && chunk ? 'questionOf' : 'stepOf', {
            n: position - 1,
            total: total - 2,
          })}
        />
      ) : null}

      <div ref={headingRef} tabIndex={-1} className="outline-none">
        {onWelcome ? (
          <Welcome
            onStart={() => {
              dismissOffer();
              goNext();
            }}
            resume={saved ? { onContinue: resumeSaved, onDiscard: restart } : undefined}
          />
        ) : null}

        {onSituation ? (
          <StepShell
            eyebrow={t('situationEyebrow')}
            title={t('situationTitle')}
            intro={t('situationIntro')}
          >
            {/*
             * Two questions, where this screen used to carry as many as twelve.
             * The Bescheid date, the benefits already being drawn and the two
             * household circumstances all moved to the report, where they are
             * offered as a refinement to a result the person can already see.
             * Asking them here meant asking a family to inventory its paperwork
             * before it had any reason to believe the tool was worth the
             * trouble, and it was the single longest screen in the flow.
             */}
            <Card>
              <p className="text-lg font-semibold">{t('currentGradeQ')}</p>
              {/*
                * Columns sized in `ch`, not a fixed count.
                *
                * `grid-cols-2` fits "Pflegegrad 4" at the default text size and
                * clips it at the largest one -- 212px of label in a 103px cell,
                * on the setting that exists precisely for people who cannot
                * read small text. `ch` is font-relative, so the track grows
                * with the scale and the grid drops to one column by itself
                * rather than cutting the words in half.
                */}
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(14ch,1fr))] gap-2">
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

            <YesNo
              label={t('atHomeQ')}
              value={circumstances.atHome}
              onChange={(v) => setCircumstances((c) => ({ ...c, atHome: v }))}
            />
          </StepShell>
        ) : null}

        {chunk && copy ? (
          <StepShell
            eyebrow={t(copy.eyebrow)}
            title={t(copy.title)}
            intro={copy.intro && chunk.length > 1 ? t(copy.intro) : undefined}
          >
            {chunk.map((a) => renderAskable(a, chunk.length === 1))}
          </StepShell>
        ) : null}

        {onReport ? (
          <Report
            report={report}
            assessment={assessment}
            answers={answers}
            bounds={bounds}
            coverage={coverage}
            m5Skipped={answers.conditions.hasMedicalMeasures === false}
            contentLang={contentLang}
            plainWords={plainWords}
            currentGrade={currentGrade}
            bescheidDate={bescheidDate}
            claimed={claimed}
            circumstances={circumstances}
            benefits={BENEFITS}
            onBescheidDate={setBescheidDate}
            onClaimed={setClaimed}
            onCircumstances={setCircumstances}
            onErase={() => setPersist(false)}
            onRefine={remaining > 0 ? () => setStep(2 + answeredCount) : undefined}
            remaining={remaining}
            onRestart={restart}
          />
        ) : null}
      </div>

      {!onWelcome && !onReport ? (
        /*
         * Pinned to the bottom of the screen on a phone. A question with four
         * answers and its official wording underneath is taller than a phone,
         * so a nav at the end of the document puts Continue below the fold on
         * every question.
         */
        <nav
          className="no-print sticky bottom-0 -mx-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg px-4 py-3 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-5"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <Button variant="secondary" onClick={goBack}>
            ← {t('back')}
          </Button>
          <Button onClick={goNext}>
            {nextIsReport ? t('seeResult') : t('next')} →
          </Button>
        </nav>
      ) : null}

      {/*
        * A way out that is not abandonment.
        *
        * The intake is short, but "short" is not the same as "short enough for
        * the person in front of it right now", and the alternative to this
        * link is a closed tab. Taking it is safe: the report shows a range
        * wherever the answers do not pin a single grade, and offers the open
        * questions back. Nothing is lost and nothing is overstated.
        */}
      {chunk && !nextIsReport ? (
        <div className="no-print -mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setStep(total - 1)}
            className="target text-base font-semibold text-fg-muted underline underline-offset-4 hover:text-fg"
          >
            {t('stopEarly')}
          </button>
        </div>
      ) : null}

      {/* Said once, on the last question rather than on the report, because it
          is the moment the intake stops that needs explaining. */}
      {nextIsReport && bounds.resolved && coverage.skipped > 0 ? (
        <Notice title={t('enoughTitle')}>
          {t('enoughBody')}{' '}
          {t('askedCount', {
            asked: coverage.asked,
            total: coverage.officialQuestions,
          })}
        </Notice>
      ) : null}
    </main>
  );
}
