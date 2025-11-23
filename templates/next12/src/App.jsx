import './styles.css'

const features = [
  'Sofortige Vorschau durch Sandpack',
  'React 18 mit Hooks und Suspense',
  'Einfache Dateien, perfekt zum Experimentieren'
]

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">React + Sandpack</p>
        <h1>Willkommen im Live-Playground</h1>
        <p className="lead">
          Nutze dieses Projekt, um UI-Ideen blitzschnell umzusetzen. Die Vorschau läuft komplett im Browser,
          ohne zusätzliche Infrastruktur.
        </p>
        <div className="cta-row">
          <a className="btn" href="https://sandpack.codesandbox.io" target="_blank" rel="noreferrer">Sandpack Docs</a>
          <span className="hint">Bearbeite Dateien links &rarr; Vorschau aktualisiert sich automatisch.</span>
        </div>
      </section>
      <section className="card-grid">
        {features.map((feature) => (
          <article key={feature}>
            <h2>{feature}</h2>
            <p>
              Passe <code>src/App.jsx</code> oder neue Dateien an, importiere sie in <code>src/main.jsx</code> und
              teile den Preview-Link direkt mit deinem Team.
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
