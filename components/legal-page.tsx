import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LegalSection } from '@/lib/legal/blanks';

/**
 * A legal text, German first and English below.
 *
 * A plain renderer: the words live in `lib/legal/`, so they can be reviewed in
 * one place. Server-rendered and static, with no client code of its own.
 *
 * The page is content in German and English only, like the assessment
 * questions, whatever the interface language is. So each half declares its own
 * `lang`, and `dir="ltr"`, so that an Arabic interface around it does not
 * reorder the punctuation of a German sentence.
 */
export function LegalPage({
  title,
  sections,
}: {
  title: { de: string; en: string };
  sections: readonly LegalSection[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-10 pt-5 sm:pt-10">
      <p lang="de" dir="ltr">
        <Link href="/" className="target inline-flex items-center text-lg font-semibold underline">
          ← Zurück zur Startseite <span lang="en">&nbsp;/ Back to the start</span>
        </Link>
      </p>

      <section lang="de" dir="ltr" className="flex flex-col gap-6">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title.de}</h1>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">{s.de.heading}</h2>
            {s.de.body.map((p, i) => (
              <p key={i} className="max-w-prose text-lg">
                {withLinks(p)}
              </p>
            ))}
          </section>
        ))}
      </section>

      <section
        lang="en"
        dir="ltr"
        aria-labelledby="english-version"
        className="flex flex-col gap-6 border-t-[length:var(--line-width)] border-line pt-8"
      >
        <h2 id="english-version" className="text-balance text-3xl font-bold tracking-tight">
          {title.en}
        </h2>
        <p className="max-w-prose text-base text-fg-muted">
          The same text in English.
        </p>
        {sections.map((s) => (
          <section key={s.id} id={`${s.id}-en`} className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold">{s.en.heading}</h3>
            {s.en.body.map((p, i) => (
              <p key={i} className="max-w-prose text-lg">
                {withLinks(p)}
              </p>
            ))}
          </section>
        ))}
      </section>
    </main>
  );
}

/** Web addresses and the two legal routes become links; everything else stays text. */
const LINKABLE = /(https:\/\/[^\s]*[^\s.,;:)]|\/datenschutz\b|\/impressum\b)/g;

function withLinks(text: string): ReactNode[] {
  return text.split(LINKABLE).map((part, i) => {
    if (i % 2 === 0) return part;
    const cls = 'break-words font-semibold underline';
    return part.startsWith('/') ? (
      <Link key={i} href={part} className={cls}>
        {part}
      </Link>
    ) : (
      <a key={i} href={part} className={cls} rel="noopener noreferrer">
        {part}
      </a>
    );
  });
}
