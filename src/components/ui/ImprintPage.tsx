import { useNavigate } from 'react-router-dom'

export const ImprintPage = () => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

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
            onClick={() => navigate('/privacy', { replace: true })}
            className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            Datenschutz →
          </button>
        </div>

        {/* Header */}
        <header className="mt-10 mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-400/90">
            Delta Dynamics · Rechtliche Angaben
          </span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white">
            Impressum
          </h1>
          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Offizielle Anbieterkennzeichnung gemäß den österreichischen gesetzlichen Vorschriften (ECG, UGB, GewO und Mediengesetz).
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-white/75 leading-relaxed">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Diensteanbieter &amp; Medieninhaber
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="font-semibold text-white">Dr. rer. nat. Georg Hackenberg BSc MSc</p>
                <p className="text-white/60">IT-Dienstleister / Software Engineer &amp; Professor</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Firmensitz / Anschrift</p>
                <p>Edthof 13a</p>
                <p>4645 Grünau im Almtal</p>
                <p>Österreich</p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Kontakt</p>
                <p>
                  Telefon:{' '}
                  <a href="tel:+436648048444066" className="text-white hover:text-orange-400 transition-colors underline underline-offset-4">
                    +43 664 80484 44066
                  </a>
                </p>
                <p>
                  E-Mail:{' '}
                  <a href="mailto:georg.hackenberg@fh-wels.at" className="text-white hover:text-orange-400 transition-colors underline underline-offset-4">
                    georg.hackenberg@fh-wels.at
                  </a>
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Umsatzsteuer-Status</p>
                <p className="text-white/65">
                  Umsatzsteuerbefreit aufgrund der Kleinunternehmerregelung gemäß § 6 Abs. 1 Z 27 UStG.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Gewerberechtliche Angaben
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Unternehmensgegenstand</dt>
                <dd>Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Kammermitgliedschaft</dt>
                <dd>
                  Mitglied der Wirtschaftskammer Oberösterreich (WKOÖ), Fachgruppe UBIT (Unternehmensberatung, Buchhaltung und Informationstechnologie)
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Aufsichtsbehörde (Gewerbebehörde)</dt>
                <dd>Bezirkshauptmannschaft Gmunden</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Berufsbezeichnung &amp; Verleihungsstaat</dt>
                <dd>IT-Dienstleister (verliehen in Österreich)</dd>
              </div>
            </dl>
            <p className="text-white/60 text-xs pt-2">
              Es gilt die österreichische Gewerbeordnung 1994 (GewO) in der jeweils aktuellen Fassung, abrufbar im Rechtsinformationssystem des Bundes (RIS) unter{' '}
              <a
                href="https://www.ris.bka.gv.at/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-orange-400 underline underline-offset-4"
              >
                www.ris.bka.gv.at
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Blattlinie / Ausrichtung der Web-App
            </h2>
            <p>
              Delta Dynamics ist eine interaktive, nicht-kommerzielle Open-Source-Webanwendung zur 3D-Terrain-, Wasserfluss- und Ökosystem-Simulation im Rahmen der wissenschaftlichen Lehre, Forschung und IT-Projekte von Dr. Georg Hackenberg.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Online-Streitbeilegung
            </h2>
            <p>
              Verbraucher haben die Möglichkeit, Beschwerden an die oben angegebene E-Mail-Adresse zu richten. Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white">
              Urheberrechtshinweis
            </h2>
            <p>
              Die Inhalte dieser Anwendung (Texte, Grafiken, Programmiercode) unterliegen dem Urheberrecht. Der Quellcode ist über das verlinkte GitHub-Repository unter den dort angegebenen Lizenzbedingungen abrufbar.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
