import type { Metadata } from 'next';
import { LegalPage, Section } from '../legal';

export const metadata: Metadata = {
  title: 'Impressum — Anspruch',
  description: 'Anbieterkennzeichnung nach § 5 DDG.',
};

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <Section title="Angaben gemäß § 5 DDG">
        <p>
          {/*
            A ladungsfähige Anschrift, as § 5 DDG requires: an address at which
            the provider can actually be served. A Postfach would not do, and
            nor would postcode and city on their own.
          */}
          Kinlo Ephriam Tangiri
          <br />
          Alhardstraße 19
          <br />
          28757 Bremen
          <br />
          Deutschland
        </p>
      </Section>

      <Section title="Kontakt">
        <p>
          E-Mail:{' '}
          <a
            className="target text-accent underline underline-offset-4"
            href="mailto:kinlotangiri@gmail.com"
          >
            kinlotangiri@gmail.com
          </a>
          <br />
          Telefon: +49 176 27522943
        </p>
      </Section>

      <Section title="Verantwortlich für den Inhalt">
        <p>Kinlo Ephriam Tangiri, Anschrift wie oben.</p>
      </Section>

      <Section title="Art des Angebots">
        <p>
          Anspruch ist ein nicht-kommerzielles, kostenfreies Angebot. Es wird keine
          Werbung ausgespielt, es werden keine Daten verkauft, und es besteht keine
          Vermittlungs- oder Provisionsbeziehung zu Pflegediensten, Pflegekassen oder
          Beratungsanbietern.
        </p>
      </Section>

      <Section title="Keine Rechtsberatung">
        <p>
          Dieses Angebot erstellt eine <strong>Einschätzung</strong>, keine Begutachtung
          und keine Rechtsberatung. Verbindlich ist allein der Bescheid Ihrer Pflegekasse.
          Die Pflegeberatung nach § 7a SGB XI ist kostenfrei und ein Rechtsanspruch;
          Pflegestützpunkte beraten unabhängig.
        </p>
      </Section>

      <Section title="Quellcode und Lizenz">
        <p>
          Der vollständige Quellcode ist unter der GNU Affero General Public License,
          Version 3, veröffentlicht:{' '}
          <a
            className="target text-accent underline underline-offset-4"
            href="https://github.com/9117KET/solution-for-germany"
          >
            github.com/9117KET/solution-for-germany
          </a>
          . Wer eine veränderte Fassung öffentlich betreibt, muss den geänderten
          Quelltext unter derselben Lizenz zugänglich machen (§ 13 AGPL-3.0).
        </p>
      </Section>

      <Section title="Haftung für Links">
        <p>
          Dieses Angebot verweist auf Gesetzestexte und auf Stellen der Pflegeberatung.
          Für die Inhalte verlinkter Seiten sind deren Betreiber verantwortlich. Zum
          Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar.
        </p>
      </Section>
    </LegalPage>
  );
}
