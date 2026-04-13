import { fieldTypeColor } from "../contentful/helpers";

export function ContentTypesView({ contentTypes, onRefresh, onSelectType }) {
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ex-text)" }}>Content Types</h2>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "1px solid var(--ex-border)",
            background: "var(--ex-surface)",
            color: "var(--ex-muted)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {contentTypes.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--ex-surface)",
            borderRadius: "var(--ex-radius)",
            border: "1px dashed var(--ex-border)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏗️</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--ex-text)" }}>No content types yet</div>
          <div style={{ color: "var(--ex-muted)", fontSize: 13, maxWidth: 400, margin: "0 auto" }}>
            Head to your Contentful space → Content model → Add content type to create your first one. Then come back
            and hit Refresh!
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {contentTypes.map((ct) => (
          <div
            key={ct.sys.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectType(ct)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectType(ct);
              }
            }}
            style={{
              padding: 20,
              background: "var(--ex-surface)",
              borderRadius: "var(--ex-radius)",
              border: "1px solid var(--ex-border)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ex-accent)";
              e.currentTarget.style.background = "var(--ex-surface2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ex-border)";
              e.currentTarget.style.background = "var(--ex-surface)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: "var(--ex-text)" }}>
                  {ct.name}
                </div>
                <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)" }}>
                  {ct.sys.id}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ex-accent2)",
                  background: "color-mix(in srgb, var(--ex-accent2) 12%, transparent)",
                  padding: "3px 10px",
                  borderRadius: 12,
                }}
              >
                {ct.fields?.length || 0} fields
              </div>
            </div>
            {ct.description && (
              <div style={{ fontSize: 13, color: "var(--ex-muted)", marginBottom: 12 }}>{ct.description}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ct.fields?.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: `${fieldTypeColor(f.type)}15`,
                    border: `1px solid ${fieldTypeColor(f.type)}30`,
                    fontSize: 11,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  }}
                >
                  <span style={{ color: fieldTypeColor(f.type), fontWeight: 600 }}>
                    {f.type === "Link"
                      ? f.linkType === "Asset"
                        ? "Asset"
                        : "Ref"
                      : f.type === "Array"
                        ? "Array"
                        : f.type}
                  </span>
                  <span style={{ color: "var(--ex-text)", opacity: 0.72 }}>{f.name}</span>
                  {f.required && <span style={{ color: "var(--ex-error-text)", fontSize: 10 }}>*</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
