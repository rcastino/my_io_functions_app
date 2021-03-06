﻿import { AzureFunction, Context } from "@azure/functions";

import * as request from "superagent";

import { readableReport } from "italia-ts-commons/lib/reporters";

import { getRequiredStringEnv } from "io-functions-commons/dist/src/utils/env";

import { RetrievedProfile } from "io-functions-commons/dist/src/models/profile";

import { NewMessage } from "io-functions-commons/dist/generated/definitions/NewMessage";

// HTTP external requests timeout in milliseconds
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// Needed to call notifications API
const publicApiUrl = getRequiredStringEnv("PUBLIC_API_URL");
const publicApiKey = getRequiredStringEnv("PUBLIC_API_KEY");

type WelcomeMessages = ReadonlyArray<(p: RetrievedProfile) => NewMessage>;

// TODO: internal links
// TODO: switch text based on user's preferred_language
const welcomeMessages: WelcomeMessages = [
  (_: RetrievedProfile) =>
    NewMessage.decode({
      content: {
        markdown: `## Benvenuto nella versione beta di IO, l’app dei servizi pubblici!

Ciao! Questa è la prima versione beta aperta a tutti (open beta) di IO, l’app dei servizi pubblici.
Cosa vuol dire? Significa che tutti i cittadini, come te, potranno partecipare alla sperimentazione di un prodotto che evolverà e migliorerà continuamente anche grazie all’esperienza diretta e ai feedback delle persone a cui è destinato.

Rendendo per tutti disponibile IO in versione beta, consentiamo agli enti pubblici di portare progressivamente i propri servizi sull’app, e ai cittadini italiani di avere dei servizi pubblici nuovi, moderni e centrati sulle proprie esigenze.

### Scopri le funzioni di IO

Ecco come potrai usare IO, sperimentando le diverse funzioni disponibili oggi nell’app: moltre altre ne arriveranno nei prossimi mesi!

#### I messaggi

IO ti consente di ricevere comunicazioni da tutte le Pubbliche Amministrazioni italiane, locali e nazionali, di tenere sotto controllo ogni scadenza e, all’occorrenza, effettuare dei pagamenti.
All’arrivo di ogni nuovo messaggio, IO ti informa attraverso una notifica e un inoltro del messaggio sulla tua casella di posta: nella sezione [servizi](ioit://PREFERENCES_SERVICES) puoi decidere come essere contattato da ciascun servizio.

#### I pagamenti

IO integra [pagoPA](https://www.pagopa.gov.it/) per effettuare pagamenti sicuri verso la Pubblica Amministrazione.
Se hai già usato pagoPA come utente registrato, nella sezione [pagamenti](ioit://WALLET_HOME) potrai vedere lo storico delle transazioni effettuate e le tue carte di credito salvate. Puoi usare la sezione [pagamenti](ioit://WALLET_HOME) per aggiungere i tuoi metodi preferiti, procedere al pagamento di un avviso pagoPA (tramite scansione del codice QR o inserimento manuale del codice IUV) e tenere traccia di tutte le operazioni svolte.

#### I servizi

Nella sezione [servizi](ioit://PREFERENCES_SERVICES) puoi vedere quali sono i servizi locali e nazionali disponibili all’interno dell’app e decidere da quali essere contattato e come. Aggiungi le tue aree geografiche di interesse per essere sempre informato sui nuovi servizi in arrivo nel tuo Comune o nella tua Regione.

#### Serve aiuto ?

Se qualcosa non ti è chiaro durante l’utilizzo dell’app, usa il punto di domanda in alto a destra per leggere approfondimenti e indicazioni utili relative alla sezione in cui ti trovi.
Ricorda che i messaggi che IO ti recapita sono inviati direttamente dagli enti pubblici: se i tuoi dubbi riguardano il contenuto di un messaggio, contatta direttamente l’ente che ti ha scritto con gli appositi pulsanti che trovi nel corpo del messaggio o nella scheda del servizio.
Se hai un problema e non trovi risposte utili nella pagina di aiuto, contatta il team di IO utilizzando il pulsante con la coccinella (se ti sembra si tratti di un malfunzionamento) o l’icona della chat (per interagire direttamente con la nostra assistenza, in caso di problemi urgenti).

#### Come partecipare al progetto

IO è un progetto che cresce e migliora giorno dopo giorno grazie al contributo di tutte le persone che, come te, partecipano alla sperimentazione. Per questo ti chiediamo, se vorrai, di segnalarci ogni aspetto dal tuo punto di vista migliorabile, utilizzando l'apposita funzione con l’icona a coccinella (per segnalare errori di funzionamento) o la chat (per inviare suggerimenti o commentare la tua esperienza).

IO è un progetto 100% open source. Se sei un designer o uno sviluppatore, puoi contribuire direttamente al design e sviluppo dell’applicazione: visita il sito [io.italia.it](https://io.italia.it) per trovare più informazioni su come dare il tuo contributo.

Grazie di far parte del progetto IO!
`,

        subject: `Benvenuto su IO`
      }
    }).getOrElseL(errs => {
      throw new Error(
        "Invalid MessageContent for welcome message: " + readableReport(errs)
      );
    }),
  (_: RetrievedProfile) =>
    NewMessage.decode({
      content: {
        markdown: `## Scopri quali enti e servizi puoi trovare all’interno di IO.

L’app IO nasce per offrirti un unico punto di accesso, comodo, semplice e sicuro, verso tutti i servizi della Pubblica Amministrazione.
Diversi enti nazionali e locali hanno già portato i loro servizi a bordo, e molti se ne aggiungeranno in futuro.
Siamo infatti solo all’inizio del percorso che, progressivamente, porterà i cittadini italiani ad avere nuovi servizi digitali messi a disposizione da tutti gli enti pubblici all’interno dell’app.

Nella sezione [servizi](ioit://PREFERENCES_SERVICES) puoi indicare le aree geografiche di tuo interesse (dove vivi, dove lavori, o dove magari vai spesso) per essere sempre informato sui nuovi servizi in arrivo in quel Comune o in quella Regione.

Se non vedi gli enti del tuo territorio tra quelli elencati, è perché i loro servizi sono ancora in corso di integrazione.
Se vuoi saperne di più, chiedi al tuo Comune se hanno attivato il processo per essere presenti su IO e a che punto sono.
La tua voce può essere un segnale importante!

Tutti i servizi all’interno dell’app sono attivi: questo non vuol dire che ti contatteranno, anzi.
Ti scriveranno solo i servizi che hanno qualcosa da dire proprio a te, in caso di comunicazioni rilevanti come ad esempio la scadenza di un documento, il promemoria per un pagamento o l’aggiornamento su una pratica in corso.
Se, per un determinato servizio, preferisci utilizzare mezzi di comunicazione diversi dall’app IO, puoi in ogni momento disattivarlo nella relativa scheda servizio: in quel caso, l’Ente continuerà a contattarti avvalendosi dei canali tradizionali (come ad esempio la posta cartacea).

Infine, è importante sapere che per ora i messaggi inviati dagli enti tramite IO non hanno valore legale.

Per approfondimenti ti invitiamo a consultare la sezione [servizi](ioit://PREFERENCES_SERVICES) di questa applicazione; per maggiori informazioni sull’avanzamento del progetto, visita il sito [io.italia.it](https://io.italia.it).
`,
        subject: `Quali servizi trovi su IO?`
      }
      // tslint:disable-next-line:no-identical-functions
    }).getOrElseL(errs => {
      throw new Error(
        "Invalid MessageContent for welcome message: " + readableReport(errs)
      );
    })
];

/**
 * Send a single welcome message using the
 * Digital Citizenship Notification API (REST).
 *
 *  TODO: use italia-commons client with retries
 */
async function sendWelcomeMessage(
  url: string,
  apiKey: string,
  newMessage: NewMessage
): Promise<number> {
  const response = await request("POST", url)
    .set("Content-Type", "application/json")
    .set("Ocp-Apim-Subscription-Key", apiKey)
    .timeout(DEFAULT_REQUEST_TIMEOUT_MS)
    .send(newMessage);

  return response.status;
}

/**
 * Send all welcome messages to the user
 * identified by the provided fiscal code.
 */
function sendWelcomeMessages(
  apiUrl: string,
  apiKey: string,
  messages: WelcomeMessages,
  profile: RetrievedProfile
): Promise<ReadonlyArray<number>> {
  const fiscalCode = profile.fiscalCode;

  const url = `${apiUrl}/api/v1/messages/${fiscalCode}`;

  return Promise.all(
    messages.map(welcomeMessage =>
      sendWelcomeMessage(url, apiKey, welcomeMessage(profile))
    )
  );
}

const activityFunction: AzureFunction = async (
  context: Context,
  input: {
    profile: RetrievedProfile;
  }
): Promise<string> => {
  const profileOrError = RetrievedProfile.decode(input.profile);

  if (profileOrError.isLeft()) {
    context.log.error(
      `SendWelcomeMessageActivity|Cannot decode input profile|ERROR=${readableReport(
        profileOrError.value
      )}|INPUT=${JSON.stringify(input.profile)}`
    );
    return "FAILURE";
  }

  const profile = profileOrError.value;

  const logPrefix = `SendWelcomeMessageActivity|PROFILE=${profile.fiscalCode}|VERSION=${profile.version}`;

  context.log.verbose(`${logPrefix}|Sending welcome messages`);

  const result = await sendWelcomeMessages(
    publicApiUrl,
    publicApiKey,
    welcomeMessages,
    profile
  );

  context.log.verbose(`${logPrefix}|RESPONSES=${result.join(",")}`);

  return "SUCCESS";
};

export default activityFunction;
