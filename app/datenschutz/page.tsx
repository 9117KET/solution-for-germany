import type { Metadata } from 'next';
import { LegalPage, Section } from '../legal';

export const metadata: Metadata = {
  title: 'Datenschutz — Anspruch',
  description: 'Was dieses Angebot speichert, was es nicht speichert, und wohin nichts übertragen wird.',
};

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <Section title="Das Wichtigste zuerst">
        <p>
          Ihre Antworten auf die Fragen zur Pflegesituation werden{' '}
          <strong>nicht an einen Server übertragen</strong>. Es gibt kein Konto, keine
          Anmeldung, keine Datenbank und keine Analyse- oder Tracking-Werkzeuge. Die
          Einschätzung wird in Ihrem Browser berechnet, und das PDF wird in Ihrem Browser
          erzeugt.
        </p>
        <p>
          Eine Ausnahme gibt es, und sie steht weiter unten unter „Sprachein&shy;gabe&ldquo;:
          Wenn Sie Fragen <em>gesprochen</em> beantworten, verarbeitet Ihr Browser die
          Tonaufnahme unter Umständen auf den Servern seines Herstellers. Das ist der
          einzige Fall, in dem Angaben das Gerät verlassen können.
        </p>
      </Section>

      <Section title="Verantwortlicher">
        <p>
          Kinlo Ephriam Tangiri
          <br />
          [STRASSE UND HAUSNUMMER]
          <br />
          [PLZ] Bremen, Deutschland
          <br />
          <a
            className="target text-accent underline underline-offset-4"
            href="mailto:kinlotangiri911@gmail.com"
          >
            kinlotangiri911@gmail.com
          </a>
        </p>
      </Section>

      <Section title="Speicherung auf Ihrem Gerät">
        <p>
          Damit eine unterbrochene Eingabe nicht verloren geht, legt das Angebot zwei
          Einträge im lokalen Speicher (<code>localStorage</code>) Ihres Browsers ab:
        </p>
        <ul className="ml-5 flex list-disc flex-col gap-1">
          <li>
            <code>anspruch.settings.v1</code> — Ihre Anzeigeeinstellungen: Sprache,
            Schriftgröße, Farbschema, Tempo, Antwortart.
          </li>
          <li>
            <code>anspruch.session.v1</code> — die bisher gegebenen Antworten, damit Sie
            beim nächsten Besuch fortfahren können. Dieser Eintrag wird erst geschrieben,
            wenn tatsächlich etwas beantwortet wurde.
          </li>
        </ul>
        <p>
          Diese Daten bleiben auf Ihrem Gerät, sind für uns zu keinem Zeitpunkt einsehbar
          und werden nicht übertragen. Sie können sie jederzeit selbst löschen: über die
          Schaltfläche zum Löschen am Ende der Auswertung, über „Von vorn beginnen&ldquo;,
          oder indem Sie die Websitedaten in Ihrem Browser löschen. Rechtsgrundlage für
          das Speichern ist Ihre Einwilligung durch die Nutzung der Fortsetzen-Funktion
          (§ 25 Abs. 1 TDDG); soweit es sich um die von Ihnen gewählten
          Anzeige&shy;einstellungen handelt, ist die Speicherung zur Erbringung des
          ausdrücklich gewünschten Dienstes erforderlich (§ 25 Abs. 2 Nr. 2 TDDG).
        </p>
      </Section>

      <Section title="Spracheingabe">
        <p>
          Sie können jede Frage antippen <em>oder</em> gesprochen beantworten. Die
          Spracheingabe ist immer eine Ergänzung und nie die einzige Möglichkeit.
        </p>
        <p>
          <strong>
            Für die Spracherkennung nutzt das Angebot die Web-Speech-Schnittstelle Ihres
            Browsers. In Chrome und Edge wird die Tonaufnahme dabei zur Auswertung an
            Server des Browserherstellers übertragen.
          </strong>{' '}
          Diese Verarbeitung findet ausserhalb unseres Einflussbereichs statt; es gelten
          die Datenschutzbestimmungen Ihres Browserherstellers. Auch das Vorlesen kann je
          nach Browser und Betriebssystem eine Netzwerkstimme verwenden.
        </p>
        <p>
          Wenn Sie das nicht möchten, beantworten Sie die Fragen durch Antippen. Der
          Funktionsumfang ist identisch: Jede Frage ist vollständig per Tippen
          beantwortbar. Rechtsgrundlage für die Spracheingabe ist Ihre Einwilligung
          (Art. 6 Abs. 1 lit. a DSGVO), die Sie durch die Auswahl der Antwortart und die
          Freigabe des Mikrofons erteilen und jederzeit widerrufen können.
        </p>
      </Section>

      <Section title="Hosting und Server-Protokolle">
        <p>
          Das Angebot wird bei der Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, USA, betrieben. Beim Abruf der Seite verarbeitet Vercel technisch
          notwendige Verbindungsdaten, darunter Ihre IP-Adresse, Zeitpunkt des Abrufs,
          angeforderte Adresse und Angaben zu Browser und Betriebssystem. Diese Daten
          sind für die Auslieferung der Seite erforderlich und dienen der Sicherheit des
          Betriebs. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse am sicheren Betrieb).
        </p>
        <p>
          Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Die
          Übermittlung in die USA wird auf die Standardvertragsklauseln und die
          Zertifizierung nach dem EU-US Data Privacy Framework gestützt. Diese
          Verbindungsdaten entstehen bei jedem Aufruf einer Website; sie enthalten{' '}
          <strong>nicht</strong> Ihre Antworten zur Pflegesituation.
        </p>
      </Section>

      <Section title="Schriftarten">
        <p>
          Die verwendeten Schriftarten werden beim Erstellen der Seite mitgeliefert und
          von demselben Server ausgeliefert wie die Seite selbst. Beim Aufruf entsteht{' '}
          <strong>keine</strong> Verbindung zu Google Fonts oder einem anderen fremden
          Server.
        </p>
      </Section>

      <Section title="Keine Cookies, keine Reichweitenmessung">
        <p>
          Das Angebot setzt keine Cookies, bindet keine Werbung ein, nutzt keine
          Analysedienste und erstellt keine Nutzungsprofile. Es gibt deshalb auch kein
          Einwilligungsbanner.
        </p>
      </Section>

      <Section title="Das PDF">
        <p>
          Die Auswertung wird als PDF in Ihrem Browser zusammengesetzt und direkt an Sie
          ausgegeben. Es gibt keinen Render-Dienst, keinen Upload und keine Speicherung
          des Dokuments auf einem Server.
        </p>
      </Section>

      <Section title="Ihre Rechte">
        <p>
          Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung
          (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) sowie das Recht, eine
          erteilte Einwilligung jederzeit zu widerrufen. Da Ihre Antworten ausschließlich
          auf Ihrem Gerät liegen und uns nicht vorliegen, können wir zu diesen Angaben
          keine Auskunft erteilen — Sie haben sie selbst in der Hand und können sie in
          der Anwendung löschen.
        </p>
        <p>
          Sie haben ausserdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu
          beschweren, insbesondere bei der Behörde Ihres gewöhnlichen Aufenthaltsorts.
          Für den Verantwortlichen zuständig ist die Landesbeauftragte für Datenschutz
          und Informationsfreiheit der Freien Hansestadt Bremen.
        </p>
      </Section>

      <Section title="Stand">
        <p>September 2026.</p>
      </Section>
    </LegalPage>
  );
}
