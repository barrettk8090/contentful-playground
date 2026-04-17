import { useState } from "react";

function EnvironmentSwitcher({ environment, environments, hasCmaToken, onEnvironmentChange }) {
  const [manualEnv, setManualEnv] = useState("");
  const [open, setOpen] = useState(false);

  // When the CMA token is configured, we have a real list to show.
  // Otherwise, show a manual text input so the user can still try switching.
  const hasEnvList = environments.length > 0;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualEnv.trim();
    if (trimmed) {
      onEnvironmentChange(trimmed);
      setManualEnv("");
      setOpen(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid var(--ex-border)",
          background: "var(--ex-surface2)",
          color: "var(--ex-text)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: "var(--ex-muted)", fontWeight: 400 }}>env</span>
        <span className="ex-mono">{environment}</span>
        <span style={{ color: "var(--ex-muted)", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 100,
            background: "var(--ex-surface)",
            border: "1px solid var(--ex-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            minWidth: 220,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px 8px",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--ex-muted)",
              borderBottom: "1px solid var(--ex-border)",
            }}
          >
            Switch Environment
          </div>

          {hasEnvList ? (
            <div style={{ padding: "6px 0" }}>
              {environments.map((env) => {
                const id = env.sys.id;
                const isActive = id === environment;
                const status = env.sys.status?.sys?.id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { onEnvironmentChange(id); setOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 14px",
                      background: isActive ? "var(--ex-surface2)" : "none",
                      border: "none",
                      color: "var(--ex-text)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--ex-surface2)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "none"; }}
                  >
                    <span className="ex-mono" style={{ fontWeight: isActive ? 700 : 400 }}>{id}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {status === "ready" && (
                        <span style={{ fontSize: 9, color: "#2ea88f", fontWeight: 700 }}>READY</span>
                      )}
                      {isActive && (
                        <span style={{ fontSize: 9, color: "var(--ex-accent)", fontWeight: 700 }}>ACTIVE</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 14 }}>
              {!hasCmaToken && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ex-muted)",
                    marginBottom: 10,
                    lineHeight: 1.5,
                    padding: "8px 10px",
                    background: "var(--ex-surface2)",
                    borderRadius: 6,
                  }}
                >
                  Add <code className="ex-mono">VITE_CONTENTFUL_CMA_TOKEN</code> to your{" "}
                  <code className="ex-mono">.env</code> to auto-load your environment list. For now,
                  type an environment name manually.
                </div>
              )}
              <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={manualEnv}
                  onChange={(e) => setManualEnv(e.target.value)}
                  placeholder="e.g. staging"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--ex-border)",
                    background: "var(--ex-surface2)",
                    color: "var(--ex-text)",
                    fontSize: 12,
                    fontFamily: "monospace",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: "var(--ex-accent)",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  Go
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Click-outside to close */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export function ExplorerHeader({
  spaceId,
  environment,
  environments,
  hasCmaToken,
  onEnvironmentChange,
  usePreview,
  onTogglePreview,
}) {
  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--ex-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--ex-accent), var(--ex-accent2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          C
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ex-text)" }}>Contentful Explorer</div>
          <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)" }}>
            {spaceId}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <EnvironmentSwitcher
          environment={environment}
          environments={environments}
          hasCmaToken={hasCmaToken}
          onEnvironmentChange={onEnvironmentChange}
        />

        <button
          type="button"
          onClick={onTogglePreview}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            border: `1.5px solid ${usePreview ? "#e8a735" : "#2ea88f"}`,
            background: usePreview ? "rgba(232,167,53,0.1)" : "rgba(46,168,143,0.1)",
            color: usePreview ? "#e8a735" : "#2ea88f",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          <span
            className="ex-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: usePreview ? "#e8a735" : "#2ea88f",
                boxShadow: `0 0 8px ${usePreview ? "#e8a735" : "#2ea88f"}`,
              }}
            />
            {usePreview ? "PREVIEW API" : "DELIVERY API"}
          </span>
        </button>
      </div>
    </div>
  );
}
