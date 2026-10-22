/**
 * Datenschutzerklärung, as data.
 *
 * Draft for legal review; see docs/COMPLIANCE.md.
 *
 * Every statement here comes from one of two places, and from nothing else:
 *
 *  - what the code does: `lib/intake/session.ts` (key `anspruch.session.v1`),
 *    `lib/a11y/settings.ts` (key `anspruch.settings.v1`), `lib/report/pdf.ts`,
 *    `lib/analytics/` and the early script in `app/layout.tsx`;
 *  - the legal inputs in
 *    `.orchestration/runs/2026-10-22-usage-and-partners/scout-compliance.md`.
 *
 * Ten of the eleven sections are the ten items of that file's final list, in
 * its order. Section 3 (voice input) was added from the code in review.
 * Whatever the scout marked "to verify" is a to-do in docs/COMPLIANCE.md and is
 * not asserted here. In particular the text says which legal basis the
 * operator relies on; it never says that consent is not required.
 *
 * The statistics section must stay true whether or not a build counts usage,
 * because this text is the same in both. The page adds one sentence from
 * `countingStatus()`, decided at build time, saying which state this build is
 * in. The plain-language summary for the
 * person using the app is `analyticsNoticeBody` in `lib/i18n/strings.ts`; this
 * page points to it rather than repeating it.
 */

import { CITY, DPA_AUTHORITY, EMAIL, NAME, STREET, type LegalSection } from './blanks';

export const DATENSCHUTZ_TITLE = {
  de: 'Datenschutzerklärung',
  en: 'Privacy policy (Datenschutzerklärung)',
} as const;

/**
 * The sentence that states whether this build counts usage.
 *
 * Fed from `isEnabled()` in `lib/analytics`, whose `NEXT_PUBLIC_*` input is
 * inlined by `next build`, so the static page always matches its own build.
 */
export function countingStatus(enabled: boolean): { de: string; en: string } {
  return enabled
    ? {
        de: 'In dieser Ausgabe der Seite ist die Zählung eingeschaltet.',
        en: 'In this version of the site, counting is switched on.',
      }
    : {
        de: 'In dieser Ausgabe der Seite ist die Zählung ausgeschaltet.',
        en: 'In this version of the site, counting is switched off.',
      };
}

/** The statistics section, where `countingStatus()` is inserted after the first paragraph. */
export const STATISTICS_SECTION_ID = 'statistik';

/** The text with the build's counting state filled in. */
export function datenschutzForBuild(enabled: boolean): readonly LegalSection[] {
  const status = countingStatus(enabled);
  return DATENSCHUTZ.map((s) =>
    s.id !== STATISTICS_SECTION_ID
      ? s
      : {
          ...s,
          de: { ...s.de, body: [s.de.body[0], status.de, ...s.de.body.slice(1)] },
          en: { ...s.en, body: [s.en.body[0], status.en, ...s.en.body.slice(1)] },
        },
  );
}

export const DATENSCHUTZ: readonly LegalSection[] = [
  // 1. Controller, Art. 13(1)(a).
  {
    id: 'verantwortlicher',
    de: {
      heading: '1. Verantwortlicher',
      body: [
        'Verantwortlich für diese Seite im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:',
        `${NAME}, ${STREET}, ${CITY}`,
        `E-Mail: ${EMAIL}`,
      ],
    },
    en: {
      heading: '1. Controller',
      body: [
        'The controller for this site under the General Data Protection Regulation (GDPR) is:',
        `${NAME}, ${STREET}, ${CITY}`,
        `Email: ${EMAIL}`,
      ],
    },
  },

  // 2. What is kept on the device. Basis § 25 Abs. 2 Nr. 2 TDDDG.
  {
    id: 'geraet',
    de: {
      heading: '2. Was auf Ihrem Gerät gespeichert wird',
      body: [
        'Diese Seite speichert zwei Einträge im Speicher Ihres Browsers (localStorage). Es sind keine Cookies.',
        'Ihre Antworten: Damit Sie eine angefangene Einschätzung später fortsetzen können, werden Ihre Antworten unter dem Namen „anspruch.session.v1“ gespeichert. Dazu gehören die Antworten auf die Fragen, der heute anerkannte Pflegegrad, das Datum des Bescheids, die Leistungen, die Sie schon bekommen, Ihre Wohnsituation, die Reihenfolge der Fragen, die letzte Seite und der Zeitpunkt der Speicherung. Es wird nichts gespeichert, bevor Sie etwas beantwortet haben.',
        'Ihre Einstellungen: Sprache, Textgröße, Farbschema, einfache Wörter, Antworten per Tippen oder Sprache, Tempo und Vorlesen. Sie werden unter „anspruch.settings.v1“ gespeichert, sobald Sie eine Einstellung ändern.',
        'Sie können Ihre Antworten jederzeit löschen: auf der Startseite mit „Neu anfangen und Antworten löschen“, wenn dort gespeicherte Antworten angeboten werden, und auf der Ergebnisseite mit „Jetzt löschen“. Beide Einträge löschen Sie auch, indem Sie die Websitedaten in Ihrem Browser löschen.',
        'Der Betreiber kann diese Daten nicht sehen. Sie werden nicht übertragen und an niemanden weitergegeben.',
        'Rechtsgrundlage für das Speichern und Auslesen auf Ihrem Gerät ist § 25 Abs. 2 Nr. 2 TDDDG. Das Speichern dient dem Dienst, den Sie ausdrücklich nutzen: Ihre Einschätzung soll nicht verloren gehen.',
      ],
    },
    en: {
      heading: '2. What is kept on your device',
      body: [
        "This site keeps two entries in your browser's storage (localStorage). They are not cookies.",
        'Your answers: so that you can carry on with an estimate later, your answers are kept under the name "anspruch.session.v1". This covers the answers to the questions, the Pflegegrad awarded today, the date of the Bescheid, the benefits you already receive, your living situation, the order of the questions, the last screen and the time of saving. Nothing is written before you have answered something.',
        'Your settings: language, text size, colour scheme, plain words, answering by tap or by voice, pace and reading aloud. They are kept under "anspruch.settings.v1" as soon as you change a setting.',
        'You can delete your answers at any time: on the start screen with "Start fresh and delete the answers", when saved answers are offered there, and on the result screen with "Erase now". You also delete both entries by clearing the site data in your browser.',
        'The operator cannot see this data. It is not transmitted and is not passed to anyone.',
        'The legal basis for storing and reading on your device is § 25 Abs. 2 Nr. 2 TDDDG. The storage serves the service you are expressly using: your estimate should not be lost.',
      ],
    },
  },

  // 3. Voice input. Not in the scout's list; added by the supervisor (spec 10,
  // fix round 2). Which browsers process speech on their maker's servers is a
  // to-do in docs/COMPLIANCE.md, so no vendor is named here.
  {
    id: 'sprache',
    de: {
      heading: '3. Antworten per Sprache',
      body: [
        'Sie können Fragen auch per Sprache beantworten. Das ist freiwillig. Jede Frage lässt sich ebenso durch Tippen beantworten.',
        'Die Spracherkennung übernimmt Ihr Browser, nicht diese Seite. Je nach Browser kann die Aufnahme dafür auf Servern des Browserherstellers verarbeitet werden. Dafür gilt die Datenschutzerklärung dieses Herstellers.',
        'Der Betreiber erhält dabei weder Ton noch Text.',
      ],
    },
    en: {
      heading: '3. Answering by voice',
      body: [
        'You can also answer questions by speaking. This is optional. Every question can just as well be answered by tapping.',
        "Speech recognition is performed by your browser, not by this site. Depending on the browser, the recording may be processed on the browser maker's servers for this. That maker's own privacy policy applies.",
        'The operator receives neither audio nor text from it.',
      ],
    },
  },

  // 4. The PDF.
  {
    id: 'pdf',
    de: {
      heading: '4. Das PDF',
      body: [
        'Das PDF mit Ihrem Ergebnis wird in Ihrem Browser erstellt. Es wird nicht hochgeladen und an niemanden gesendet. Die Datei gibt es nur dort, wo Ihr Browser sie speichert.',
      ],
    },
    en: {
      heading: '4. The PDF',
      body: [
        'The PDF with your result is built in your browser. It is not uploaded and not sent to anyone. The file exists only where your browser saves it.',
      ],
    },
  },

  // 5. Hosting. Art. 6(1)(f); transfer statement Art. 13(1)(f).
  {
    id: 'hosting',
    de: {
      heading: '5. Hosting durch Vercel',
      body: [
        'Diese Seite wird von Vercel Inc., USA, ausgeliefert. Vercel verarbeitet dabei als Auftragsverarbeiter Daten, die Ihr Browser bei jedem Abruf sendet. Dazu gehören Ihre IP-Adresse und der daraus abgeleitete ungefähre Ort (Stadt, Land), außerdem Protokolle des Servers.',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist, die Seite sicher und zuverlässig auszuliefern.',
        'Empfänger ist Vercel Inc. Vercel kann Daten in die USA und in andere Länder übermitteln. Vercel ist nach dem EU-US Data Privacy Framework zertifiziert und stützt sich außerdem auf Standardvertragsklauseln der EU-Kommission (Art. 13 Abs. 1 lit. f DSGVO).',
        'Vercel nennt in seiner Datenschutzerklärung keine Speicherdauer für diese Daten.',
        'Datenschutzerklärung von Vercel: https://vercel.com/legal/privacy-policy',
        'Auftragsverarbeitungsvertrag von Vercel: https://vercel.com/legal/dpa',
      ],
    },
    en: {
      heading: '5. Hosting by Vercel',
      body: [
        'This site is delivered by Vercel Inc., USA. In doing so, Vercel processes as a processor data that your browser sends with every request. This includes your IP address and the approximate location derived from it (city, country), as well as server logs.',
        'The legal basis is Art. 6(1)(f) GDPR. The legitimate interest is to deliver the site securely and reliably.',
        "The recipient is Vercel Inc. Vercel may transfer data to the United States and to other countries. Vercel is certified under the EU-US Data Privacy Framework and also relies on the European Commission's standard contractual clauses (Art. 13(1)(f) GDPR).",
        'Vercel does not state a retention period for this data in its privacy policy.',
        "Vercel's privacy policy: https://vercel.com/legal/privacy-policy",
        "Vercel's data processing agreement: https://vercel.com/legal/dpa",
      ],
    },
  },

  // 6. Reach statistics via Plausible. Art. 6(1)(f); Art. 21.
  {
    id: 'statistik',
    de: {
      heading: '6. Zählung der Nutzung mit Plausible',
      body: [
        'Die Zählung ist nur auf Ausgaben dieser Seite aktiv, auf denen der Betreiber sie eingeschaltet hat. Ist sie aktiv, muss der Betreiber Sie darauf hinweisen. Das geschieht auf der Startseite: Unter „Sie sprechen mit einem Computer“ steht dann ein zusätzlicher Absatz, der beschreibt, was gezählt wird. Fehlt dieser Absatz, wird nicht gezählt und es wird kein Skript von Plausible geladen.',
        'Zweck: Wir möchten wissen, wie viele Menschen die Seite nutzen und wie weit sie kommen.',
        'Was erfasst wird: die aufgerufene Seite ohne Zusatz in der Adresse, die Seite, von der Sie kamen, der ungefähre Ort, Browser und Gerätetyp. Dazu kommen fünf Schritte: Start, Ergebnis angezeigt, weitere Fragen beantwortet, PDF erstellt, Antworten gelöscht. Jeder Schritt trägt die Sprache der Oberfläche, das Tempo und gegebenenfalls das Kürzel einer Organisation (siehe 7.). Beim Ergebnis kommen hinzu: die Zahl der beantworteten Fragen in vier groben Stufen, ob ein Ergebnis angezeigt wurde (nicht welches) und der monatliche Betrag, der Ihnen vielleicht entgeht, in fünf groben Stufen. Beim PDF kommt seine Sprache hinzu.',
        'Was nicht erfasst wird: keine Antworten, kein Pflegegrad, keine Punkte, kein Datum, kein Name. Es werden keine Cookies gesetzt, nichts auf Ihrem Gerät gespeichert und keine dauerhafte Kennung gebildet. Nach Angaben von Plausible wird aus IP-Adresse und Browserkennung ein Prüfwert gebildet, der sich täglich ändert. IP-Adresse und Browserkennung selbst werden nicht gespeichert.',
        'Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse ist es, die Nutzung zu kennen und die Seite zu verbessern. Ihre Interessen überwiegen aus unserer Sicht nicht, weil nichts einer Person zugeordnet wird und nichts auf Ihrem Gerät gespeichert wird.',
        'Empfänger ist die Plausible Insights OÜ, Estland. Nach Angaben von Plausible werden die Daten in der EU verarbeitet und gespeichert, bei Hetzner in Deutschland.',
        'Speicherdauer: nicht angegeben, siehe Datenschutzerklärung des Anbieters: https://plausible.io/data-policy',
        `Sie haben das Recht, dieser Verarbeitung zu widersprechen (Art. 21 DSGVO). Schreiben Sie dazu an ${EMAIL}.`,
      ],
    },
    en: {
      heading: '6. Counting usage with Plausible',
      body: [
        'Counting is active only on versions of this site where the operator has switched it on. If it is active, the operator must tell you. This happens on the start screen: under "You are talking to a computer" there is then an extra paragraph that describes what is counted. If that paragraph is missing, nothing is counted and no Plausible script is loaded.',
        'Purpose: we want to know how many people use the site and how far they get.',
        'What is recorded: the page visited, without anything added to its address; the page you came from; the approximate location; browser and device type. In addition, five steps: start, result shown, further questions answered, PDF produced, answers erased. Each step carries the interface language, the pace and, where there is one, the short name of an organisation (see 7.). With the result come: the number of questions answered in four broad bands, whether a result was shown (not which), and the monthly amount you may be missing in five broad bands. With the PDF comes its language.',
        'What is not recorded: no answers, no Pflegegrad, no points, no date, no name. No cookies are set, nothing is stored on your device and no lasting identifier is created. According to Plausible, a value that changes daily is derived from the IP address and the browser identifier. The IP address and the browser identifier themselves are not stored.',
        'The legal basis is Art. 6(1)(f) GDPR. Our legitimate interest is to know how the site is used and to improve it. In our view your interests do not override this, because nothing is linked to a person and nothing is stored on your device.',
        'The recipient is Plausible Insights OÜ, Estonia. According to Plausible, the data is processed and stored in the EU, at Hetzner in Germany.',
        "Retention: not stated, see the provider's privacy policy: https://plausible.io/data-policy",
        `You have the right to object to this processing (Art. 21 GDPR). To do so, write to ${EMAIL}.`,
      ],
    },
  },

  // 7. Partner links ?via=<slug>.
  {
    id: 'partner-links',
    de: {
      heading: '7. Links von Organisationen (?via=)',
      body: [
        'Manche Organisationen verlinken auf diese Seite mit einem Zusatz wie „?via=kuerzel“. Die Seite liest das Kürzel beim Laden aus der Adresse und entfernt es sofort aus der Adresszeile.',
        'Das Kürzel wird nur für diesen Besuch im Arbeitsspeicher gehalten und nie gespeichert, weder auf Ihrem Gerät noch anderswo. Nach einem Neuladen oder in einem neuen Tab ist es weg.',
        'Ist die Zählung aktiv (siehe 6.), wird das Kürzel mit den gezählten Schritten übermittelt, aber nie als Teil einer Adresse. Es bezeichnet die Organisation, nicht Sie.',
      ],
    },
    en: {
      heading: '7. Links from organisations (?via=)',
      body: [
        'Some organisations link to this site with an addition such as "?via=shortname". The page reads the short name from the address on load and removes it from the address bar at once.',
        'The short name is held in memory for this visit only and is never stored, neither on your device nor anywhere else. After a reload or in a new tab it is gone.',
        'If counting is active (see 6.), the short name is sent with the counted steps, but never as part of an address. It identifies the organisation, not you.',
      ],
    },
  },

  // 8. No external fonts, no third-party trackers, no advertising.
  {
    id: 'keine-dritten',
    de: {
      heading: '8. Schriftarten, Dritte und Werbung',
      body: [
        'Die Schriftarten werden von dieser Seite selbst ausgeliefert. Ihr Browser stellt dafür keine Anfrage bei Google oder einem anderen Anbieter.',
        'Außer der unter 6. beschriebenen Zählung bindet diese Seite keine Dienste Dritter zur Analyse oder Verfolgung ein. Es gibt keine Werbung.',
      ],
    },
    en: {
      heading: '8. Fonts, third parties and advertising',
      body: [
        'The fonts are delivered by this site itself. Your browser makes no request to Google or any other provider for them.',
        'Apart from the counting described in 6., this site includes no third-party services for analysis or tracking. There is no advertising.',
      ],
    },
  },

  // 9. Rights Art. 15-21 and the right to complain, Art. 13(2)(b)-(d).
  {
    id: 'rechte',
    de: {
      heading: '9. Ihre Rechte',
      body: [
        'Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Wenden Sie sich dazu an die Adresse unter 1.',
        'Ihre Antworten und Einstellungen liegen nur auf Ihrem Gerät. Sie können sie dort selbst löschen (siehe 2.). Der Betreiber hat sie nicht.',
        `Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig für den Betreiber ist: ${DPA_AUTHORITY}`,
      ],
    },
    en: {
      heading: '9. Your rights',
      body: [
        'You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and to object (Art. 21). Please contact the address under 1.',
        'Your answers and settings are only on your device. You can delete them there yourself (see 2.). The operator does not have them.',
        `You also have the right to lodge a complaint with a data protection supervisory authority (Aufsichtsbehörde). The authority responsible for the operator is: ${DPA_AUTHORITY}`,
      ],
    },
  },

  // 10. No automated decision-making; no obligation to provide data.
  {
    id: 'keine-entscheidung',
    de: {
      heading: '10. Keine automatisierte Entscheidung',
      body: [
        'Es gibt keine automatisierte Entscheidung im Einzelfall mit rechtlicher Wirkung für Sie (Art. 22 DSGVO). Die Einschätzung wird auf Ihrem Gerät berechnet. Sie ist keine Begutachtung und hat keine rechtliche Wirkung.',
        'Sie sind nicht verpflichtet, Angaben zu machen. Ohne Antworten kann die Seite nur keine Einschätzung berechnen.',
      ],
    },
    en: {
      heading: '10. No automated decision-making',
      body: [
        'There is no automated individual decision with legal effect for you (Art. 22 GDPR). The estimate is calculated on your device. It is not an assessment (Begutachtung) and has no legal effect.',
        'You are under no obligation to provide any information. Without answers the site simply cannot calculate an estimate.',
      ],
    },
  },

  // 11. Health-related answers. Conservative wording, scout section 3.
  {
    id: 'gesundheitsdaten',
    de: {
      heading: '11. Angaben zur Gesundheit',
      body: [
        'Viele Fragen betreffen Gesundheit und Pflege. Solche Angaben können Gesundheitsdaten sein. Sie werden nur von Ihrem eigenen Browser verarbeitet und bleiben auf Ihrem Gerät.',
        'Der Betreiber kann Ihre Antworten nicht sehen und erhält sie nicht. Sie sind auch nicht Teil der Zählung unter 6.',
      ],
    },
    en: {
      heading: '11. Information about health',
      body: [
        'Many questions concern health and care. Such information can be health data. It is processed only by your own browser and stays on your device.',
        'The operator cannot see your answers and does not receive them. They are not part of the counting under 6. either.',
      ],
    },
  },
];
