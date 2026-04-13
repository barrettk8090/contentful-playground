export function MissingConfig({ missing }) {
  return (
    <div className="contentful-explorer" style={{ padding: 32, maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 12px", color: "var(--ex-text)" }}>Configure Contentful</h1>
      <p style={{ color: "var(--ex-muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
        Add these variables to a <span className="ex-mono">.env</span> file in the project root (copy from{" "}
        <span className="ex-mono">.env.example</span>), then restart the dev server.
      </p>
      <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ex-text-secondary)" }}>
        {missing.map((key) => (
          <li key={key} className="ex-mono" style={{ marginBottom: 8, fontSize: 14 }}>
            {key}
          </li>
        ))}
      </ul>
      <p style={{ color: "var(--ex-muted)", fontSize: 13, marginTop: 24 }}>
        Tokens are available in Contentful under Settings → API keys. Never commit <span className="ex-mono">.env</span>{" "}
        to git.
      </p>
    </div>
  );
}
