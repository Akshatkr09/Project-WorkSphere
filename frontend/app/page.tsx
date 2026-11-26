export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">PROJECT WORKSPHERE</p>
        <h1>Work moves forward, together.</h1>
        <p className="intro">
          A shared workspace for organizations to plan projects, coordinate teams,
          automate workflows, and understand delivery.
        </p>
        <div className="status-card">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>Foundation is running</strong>
            <p>Milestone 1 · Application shell</p>
          </div>
        </div>
        <p className="footnote">The product modules will be introduced in upcoming milestones.</p>
      </section>
    </main>
  );
}
