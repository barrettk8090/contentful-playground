export function ExplorerHeader({ spaceId, usePreview, onTogglePreview }) {
  return (
    <div
      style={{
        padding: "20px 24px",
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
  );
}
