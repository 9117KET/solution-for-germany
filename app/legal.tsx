import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shell for the two legal pages.
 *
 * Deliberately outside the i18n system and fixed in German. The interface is
 * translated because a family has to be able to read it; an Impressum and a
 * Datenschutzerklärung are addressed to a German regulator and to anyone
 * exercising a right under the DSGVO, and the binding text is the German one.
 * Shipping an unreviewed translation of those would repeat, on the legal
 * pages, exactly the mistake the product refuses to make on the questions.
 */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-10 pt-5 sm:pt-10">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex flex-col gap-6 text-fg">{children}</div>
      <p className="pt-2">
        <Link
          href="/"
          className="target font-semibold text-accent underline underline-offset-4"
        >
          ← Zurück zur Einschätzung
        </Link>
      </p>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
