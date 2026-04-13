import { fieldTypeColor, statusBadge } from "../contentful/helpers";
import { RenderValue } from "../contentful/RenderValue";

export function EntriesView({
  contentTypes,
  selectedType,
  onSelectType,
  entries,
  selectedEntry,
  onSelectEntry,
  usePreview,
}) {
  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <select
          value={selectedType?.sys?.id || ""}
          onChange={(e) => {
            const ct = contentTypes.find((c) => c.sys.id === e.target.value);
            if (ct) onSelectType(ct);
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--ex-border)",
            background: "var(--ex-surface2)",
            color: "var(--ex-text)",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="">Select a content type…</option>
          {contentTypes.map((ct) => (
            <option key={ct.sys.id} value={ct.sys.id}>
              {ct.name}
            </option>
          ))}
        </select>

        {selectedType && (
          <span style={{ fontSize: 12, color: "var(--ex-muted)" }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"} found
            {usePreview && " (including drafts)"}
          </span>
        )}
      </div>

      {!selectedType && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--ex-surface)",
            borderRadius: "var(--ex-radius)",
            border: "1px dashed var(--ex-border)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--ex-text)" }}>Select a content type</div>
          <div style={{ color: "var(--ex-muted)", fontSize: 13 }}>
            Pick a content type above to browse its entries, or go to Content Model to see what&apos;s available.
          </div>
        </div>
      )}

      {selectedType && entries.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--ex-surface)",
            borderRadius: "var(--ex-radius)",
            border: "1px dashed var(--ex-border)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--ex-text)" }}>No entries found</div>
          <div style={{ color: "var(--ex-muted)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
            {usePreview
              ? "No entries exist for this content type yet. Create one in Contentful!"
              : "No published entries. Try switching to the Preview API to see drafts, or publish an entry in Contentful."}
          </div>
        </div>
      )}

      {selectedType && entries.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedEntry ? "1fr 1.5fr" : "1fr",
            gap: 16,
          }}
        >
          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            {entries.map((entry) => {
              const titleField = selectedType.displayField;
              const title = entry.fields?.[titleField] || entry.sys.id;
              const badge = statusBadge(entry.sys);
              const isSelected = selectedEntry?.sys?.id === entry.sys.id;
              return (
                <div
                  key={entry.sys.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectEntry(entry);
                    }
                  }}
                  style={{
                    padding: "14px 16px",
                    background: isSelected ? "var(--ex-surface2)" : "var(--ex-surface)",
                    borderRadius: "var(--ex-radius)",
                    border: isSelected ? "1px solid var(--ex-accent)" : "1px solid var(--ex-border)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--ex-surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "var(--ex-surface)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ex-text)" }}>{String(title)}</div>
                    {badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          color: badge.color,
                          background: badge.bg,
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)", marginTop: 4 }}>
                    {entry.sys.id}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedEntry && (
            <div
              style={{
                background: "var(--ex-surface)",
                borderRadius: "var(--ex-radius)",
                border: "1px solid var(--ex-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--ex-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ex-text)" }}>
                    {String(selectedEntry.fields?.[selectedType.displayField] || selectedEntry.sys.id)}
                  </div>
                  <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)", marginTop: 2 }}>
                    Updated {new Date(selectedEntry.sys.updatedAt).toLocaleString()}
                  </div>
                </div>
                {(() => {
                  const b = statusBadge(selectedEntry.sys);
                  return b ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        color: b.color,
                        background: b.bg,
                        padding: "3px 10px",
                        borderRadius: 10,
                      }}
                    >
                      {b.label}
                    </span>
                  ) : null;
                })()}
              </div>

              <div style={{ padding: 20 }}>
                {selectedType.fields?.map((fieldDef) => {
                  const val = selectedEntry.fields?.[fieldDef.id];
                  return (
                    <div key={fieldDef.id} style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            color: fieldTypeColor(fieldDef.type),
                            textTransform: "uppercase",
                          }}
                        >
                          {fieldDef.type}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ex-text)" }}>
                          {fieldDef.name}
                        </span>
                        {fieldDef.required && (
                          <span style={{ color: "var(--ex-error-text)", fontSize: 11 }}>required</span>
                        )}
                      </div>
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "var(--ex-surface2)",
                          borderRadius: 8,
                          fontSize: 13,
                          lineHeight: 1.5,
                          overflowWrap: "break-word",
                          color: "var(--ex-text-secondary)",
                        }}
                      >
                        <RenderValue value={val} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
