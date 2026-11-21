import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PLAUSIBLE_IGNORE_KEY = 'plausible_ignore'

function getInitialOptOut(): boolean {
  try {
    return window.localStorage.getItem(PLAUSIBLE_IGNORE_KEY) === 'true'
  } catch {
    return false
  }
}

function isBrowserPrivacySignalActive(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return nav.globalPrivacyControl === true || navigator.doNotTrack === '1'
}

export const PrivacyPage = () => {
  const navigate = useNavigate()
  const [isOptedOut, setIsOptedOut] = useState<boolean>(getInitialOptOut)
  const browserSignalActive = isBrowserPrivacySignalActive()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const toggleAnalytics = () => {
    try {
      if (isOptedOut) {
        window.localStorage.removeItem(PLAUSIBLE_IGNORE_KEY)
        setIsOptedOut(false)
      } else {
        window.localStorage.setItem(PLAUSIBLE_IGNORE_KEY, 'true')
        setIsOptedOut(true)
      }
    } catch {
      // Ignore storage access errors in restricted browser modes
    }
  }

  const trackingDisabled = isOptedOut || browserSignalActive

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl text-white overflow-y-auto pointer-events-auto select-text">
      <div className="w-full max-w-3xl mx-auto px-6 sm:px-10 py-10 sm:py-16">
        {/* Top Navigation */}
        <div className="flex items-center justify-between gap-4 pb-8 border-b border-white/10">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-all active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Zurück</span>
          </button>

          <button
            onClick={() => navigate('/imprint', { replace: true })}
            className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            Impressum →
          </button>
        </div>

        {/* Header */}
        <header className="mt-10 mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-400/90">
            Delta Dynamics · Privatsphäre
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white">
            Datenschutzerklärung
          </h1>
          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Informationen darüber, wie in dieser Web-App personenbezogene Daten verarbeitet werden und welche Rechte Ihnen gemäß DSGVO, TDDDG und TKG 2021 zustehen.
          </p>
        </header>

        {/* Interactive Tracking Opt-Out Card */}
        <section className="mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/[0.05] p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Cookiefreie Web-Analyse (Plausible)
              </h2>
              <p className="text-xs text-white/65 leading-relaxed max-w-xl">
                Wir nutzen eine EU-gehostete Instanz von Plausible Analytics ohne Cookies und ohne Speicherung von IP-Adressen (Art. 6 Abs. 1 lit. f DSGVO). Mit dem Schalter können Sie die Erfassung jederzeit ein- oder ausschalten.
              </p>
              {browserSignalActive && (
                <p className="text-xs text-emerald-300/90 pt-1">
                  Ihr Browser sendet ein Global-Privacy-Control- (GPC) oder Do-Not-Track-Signal (DNT) – die Analyse ist daher automatisch ausgeschaltet.
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span
                className={`text-xs font-bold uppercase tracking-wider select-none ${
                  !trackingDisabled ? 'text-orange-400' : 'text-white/45'
                }`}
              >
                {!trackingDisabled ? 'Ein' : 'Aus'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!trackingDisabled}
                aria-label="Cookiefreie Web-Analyse ein- oder ausschalten"
                disabled={browserSignalActive}
                onClick={toggleAnalytics}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  browserSignalActive
                    ? 'cursor-not-allowed bg-white/10 border-white/10 opacity-50'
                    : !trackingDisabled
                      ? 'cursor-pointer bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/20'
                      : 'cursor-pointer bg-white/10 border-white/20 hover:bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    !trackingDisabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-white/45">
            Hinweis: Beim Deaktivieren wird ausschließlich der lokale Browser-Eintrag <code className="text-white/70">plausible_ignore=true</code> gesetzt (gilt für die gesamte Domain <code className="text-white/70">hackenberg.tech</code>). Beim Aktivieren wird dieser Eintrag wieder entfernt.
          </p>
        </section>

        {/* Privacy Policy Details */}
        <div className="space-y-6 text-sm text-white/75 leading-relaxed">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              1. Verantwortlicher
            </h2>
            <p className="font-semibold text-white">Dr. rer. nat. Georg Hackenberg BSc MSc</p>
            <p>Edthof 13a, 4645 Grünau im Almtal, Österreich</p>
            <p>
              E-Mail:{' '}
              <a href="mailto:georg.hackenberg@fh-wels.at" className="text-white hover:text-orange-400 underline underline-offset-4">
                georg.hackenberg@fh-wels.at
              </a>
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              2. Webhosting &amp; Server-Logfiles
            </h2>
            <p>
              Diese Web-App wird über <strong>GitHub Pages</strong> (GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA) bereitgestellt. Bei jedem Zugriff erfasst der Webserver technisch notwendige Zugriffsdaten (IP-Adresse, Datum und Uhrzeit, abgerufene Datei/URL, Referrer-URL, Browser- und Betriebssysteminformationen).
            </p>
            <p className="text-white/65">
              Die Verarbeitung erfolgt zur Sicherstellung des technischen Betriebs, der Sicherheit und Stabilität auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO). Für Datenübermittlungen in die USA stützt sich GitHub auf EU-Standardvertragsklauseln.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              3. Web-Analyse (Plausible Analytics)
            </h2>
            <p>
              Zur datenschutzfreundlichen statistischen Reichweitenmessung nutzen wir <strong>Plausible Analytics</strong> über eine europäische Server-Instanz (<code className="text-white/85">analytics.mentawise.com</code>) auf Servern innerhalb der Europäischen Union.
            </p>
            <p className="text-white/65">
              Plausible Analytics verwendet <strong>keine Cookies</strong>, nutzt für die Analyse weder <code className="text-white/80">localStorage</code> noch <code className="text-white/80">sessionStorage</code> und erstellt keinerlei nutzerbezogene Profile oder Cross-Site-IDs. IP-Adressen werden unmittelbar nach dem Zugriff mit einem täglich wechselnden Zufallswert (Salt) kryptografisch gehasht; eine Rekonstruktion ist technisch ausgeschlossen.
            </p>
            <p className="text-white/65">
              Erfasst werden ausschließlich aggregierte Seitenaufrufe (inkl. der App-Routen) und anonyme Verweildauer-/Engagement-Daten auf Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO). Sie können der Erfassung jederzeit über den Schalter oben widersprechen (Art. 21 DSGVO); zudem werden Browser-Signale wie <strong>Global Privacy Control (GPC)</strong> und <strong>Do Not Track (DNT)</strong> automatisch respektiert.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              4. Lokale Speicherung im Browser (IndexedDB, Cache &amp; Einstellungen)
            </h2>
            <p>
              Die Anwendung speichert Daten ausschließlich lokal auf Ihrem Endgerät, ohne Übermittlung an unsere Server (technisch erforderlich bzw. auf Ihren ausdrücklichen Nutzerwunsch gemäß § 165 Abs. 3 TKG 2021, § 25 Abs. 2 Nr. 2 TDDDG):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/65">
              <li>
                <strong>IndexedDB:</strong> Speichert Ihre selbst erstellten oder bearbeiteten Terrains lokal im Browser.
              </li>
              <li>
                <strong>Service Worker / Cache API:</strong> Speichert Anwendungsdateien lokal für schnellere Ladezeiten und Offline-Fähigkeit (PWA).
              </li>
              <li>
                <strong>localStorage (<code className="text-white/80">plausible_ignore</code>):</strong> Wird nur dann angelegt, wenn Sie oben aktiv die Web-Analyse deaktivieren.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              5. Lokale KI-Funktion (Web-LLM)
            </h2>
            <p>
              Die optionale KI-Beraterfunktion (<em>„Initialize AI“</em>) nutzt <code className="text-white/85">@mlc-ai/web-llm</code> und wird ausschließlich nach Ihrem ausdrücklichen Klick aktiviert. Beim erstmaligen Start lädt Ihr Browser die benötigten KI-Modellgewichte von externen Content-Delivery-Netzwerken (insbesondere Hugging Face) herunter und speichert sie lokal im Browser-Cache. Dabei wird technisch bedingt Ihre IP-Adresse an den jeweiligen CDN-Anbieter übermittelt.
            </p>
            <p className="text-white/65">
              Die anschließende KI-Berechnung und alle Eingaben laufen <strong>vollständig lokal auf Ihrer Grafikkarte (WebGPU)</strong> im Browser – es werden keine Prompts oder Simulationsdaten an externe KI-Server übertragen.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              6. Ihre Rechte gemäß DSGVO &amp; Beschwerderecht
            </h2>
            <p className="text-white/65">
              Ihnen stehen die Rechte auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch (Art. 21 DSGVO) zu. Kontaktieren Sie uns hierzu jederzeit unter{' '}
              <a href="mailto:georg.hackenberg@fh-wels.at" className="text-white hover:text-orange-400 underline underline-offset-4">
                georg.hackenberg@fh-wels.at
              </a>
              .
            </p>
            <p className="text-white/65">
              Zudem besteht ein Beschwerderecht bei der zuständigen Aufsichtsbehörde. In Österreich ist dies die{' '}
              <strong>Österreichische Datenschutzbehörde</strong>, Barichgasse 40-42, 1030 Wien (
              <a
                href="https://www.dsb.gv.at/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 hover:text-orange-400 underline underline-offset-4"
              >
                www.dsb.gv.at
              </a>
              , <code className="text-white/80">dsb@dsb.gv.at</code>).
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-2">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Hinweis zu Cookies
            </h2>
            <p className="text-white/65">
              Diese Web-App verwendet keine Tracking- oder Werbecookies und führt kein Profiling durch. Ein Cookie-Einwilligungsbanner ist daher nicht erforderlich.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
