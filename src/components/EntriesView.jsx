import { useState, useEffect } from "react";
import { fieldTypeColor, statusBadge } from "../contentful/helpers";
import { unwrapLocalized, isLocaleMap } from "../contentful/localized";
import { RenderValue } from "../contentful/RenderValue";
import { cfFetch } from "../api/contentfulClient";

// ─── Diff panel ──────────────────────────────────────────────────────────────

// DiffPanel is keyed by entryId so it fully remounts when the entry changes,
// giving us fresh initial state (loading: true) without calling setState in an effect.
function DiffPanel({ config, entryId, contentType, onClose }) {
  const [cdaEntry, setCdaEntry] = useState(null);
  const [cpaEntry, setCpaEntry] = useState(null);
  const [cdaError, setCdaError] = useState(null);
  const [cpaError, setCpaError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cfFetch(config, `/entries/${entryId}`, false).catch((e) => ({ _error: e.message })),
      cfFetch(config, `/entries/${entryId}`, true).catch((e) => ({ _error: e.message })),
    ]).then(([cda, cpa]) => {
      if (cancelled) return;
      if (cda._error) setCdaError(cda._error);
      else setCdaEntry(cda);
      if (cpa._error) setCpaError(cpa._error);
      else setCpaEntry(cpa);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [config, entryId]);

  const fields = contentType?.fields || [];

  const valStr = (entry, fieldId) => {
    if (!entry) return null;
    const v = entry.fields?.[fieldId];
    if (v === undefined || v === null) return null;
    return JSON.stringify(v);
  };

  return (
    <div
      style={{
        background: "var(--ex-surface)",
        borderRadius: "var(--ex-radius)",
        border: "1px solid var(--ex-border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--ex-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--ex-surface2)",
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ex-text)" }}>API Comparison</span>
          <span style={{ fontSize: 12, color: "var(--ex-muted)", marginLeft: 10 }}>
            Same entry — different API responses
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid var(--ex-border)",
            borderRadius: 6,
            color: "var(--ex-muted)",
            cursor: "pointer",
            fontSize: 12,
            padding: "4px 10px",
            fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ex-muted)" }}>
          <div className="ex-spinner" />
          Fetching from both APIs…
        </div>
      )}

      {!loading && (
        <>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 1fr",
              gap: 0,
              borderBottom: "1px solid var(--ex-border)",
            }}
          >
            <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--ex-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Field
            </div>
            <div
              style={{
                padding: "10px 16px",
                borderLeft: "1px solid var(--ex-border)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: cdaError ? "var(--ex-error-text)" : "#2ea88f",
              }}
            >
              CDA — Published
              {cdaEntry && (
                <span style={{ fontWeight: 400, color: "var(--ex-muted)", marginLeft: 6 }}>
                  v{cdaEntry.sys.version}
                </span>
              )}
            </div>
            <div
              style={{
                padding: "10px 16px",
                borderLeft: "1px solid var(--ex-border)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: cpaError ? "var(--ex-error-text)" : "#5b8def",
              }}
            >
              CPA — Preview / Draft
              {cpaEntry && (
                <span style={{ fontWeight: 400, color: "var(--ex-muted)", marginLeft: 6 }}>
                  v{cpaEntry.sys.version}
                </span>
              )}
            </div>
          </div>

          {/* CDA error row */}
          {cdaError && (
            <div
              style={{
                padding: "10px 16px",
                background: "var(--ex-error-bg)",
                borderBottom: "1px solid var(--ex-border)",
                fontSize: 13,
                color: "var(--ex-error-text)",
              }}
            >
              CDA error: {cdaError}
              {cdaError.includes("404") && (
                <span style={{ marginLeft: 8, color: "var(--ex-muted)" }}>
                  — This entry is not published yet, so the Delivery API has nothing to return.
                </span>
              )}
            </div>
          )}

          {/* Field rows */}
          {fields.map((fieldDef) => {
            const cdaRaw = cdaEntry?.fields?.[fieldDef.id];
            const cpaRaw = cpaEntry?.fields?.[fieldDef.id];
            const cdaStr = valStr(cdaEntry, fieldDef.id);
            const cpaStr = valStr(cpaEntry, fieldDef.id);
            const differs = cdaStr !== cpaStr;

            return (
              <div
                key={fieldDef.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 1fr",
                  borderBottom: "1px solid var(--ex-border)",
                  background: differs ? "rgba(232,167,53,0.06)" : "transparent",
                }}
              >
                <div style={{ padding: "12px 16px" }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: fieldTypeColor(fieldDef.type),
                      marginBottom: 2,
                    }}
                  >
                    {fieldDef.type}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ex-text)" }}>
                    {fieldDef.name}
                  </div>
                  {differs && (
                    <div style={{ fontSize: 10, color: "#e8a735", marginTop: 3, fontWeight: 600 }}>
                      ≠ DIFFERS
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderLeft: "1px solid var(--ex-border)",
                    fontSize: 13,
                    color: "var(--ex-text-secondary)",
                    background: differs ? "rgba(46,168,143,0.06)" : "transparent",
                  }}
                >
                  {cdaEntry ? <RenderValue value={cdaRaw} /> : <span style={{ color: "var(--ex-muted)" }}>—</span>}
                </div>

                <div
                  style={{
                    padding: "12px 16px",
                    borderLeft: "1px solid var(--ex-border)",
                    fontSize: 13,
                    color: "var(--ex-text-secondary)",
                    background: differs ? "rgba(91,141,239,0.06)" : "transparent",
                  }}
                >
                  {cpaEntry ? <RenderValue value={cpaRaw} /> : <span style={{ color: "var(--ex-muted)" }}>—</span>}
                </div>
              </div>
            );
          })}

          {/* Summary footer */}
          {!cdaError && !cpaError && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--ex-muted)" }}>
              {fields.filter((f) => valStr(cdaEntry, f.id) !== valStr(cpaEntry, f.id)).length === 0
                ? "✓ CDA and CPA return identical field values — this entry has no unpublished changes."
                : `${fields.filter((f) => valStr(cdaEntry, f.id) !== valStr(cpaEntry, f.id)).length} field(s) differ between the two APIs. The CPA includes draft changes not yet published to the CDA.`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function EntriesView({
  config,
  contentTypes,
  selectedType,
  onSelectType,
  entries,
  selectedEntry,
  onSelectEntry,
  usePreview,
  locales,
  selectedLocale,
  onLocaleChange,
}) {
  // Track which entry has diff mode open; auto-resets when a different entry is selected
  const [diffModeEntryId, setDiffModeEntryId] = useState(null);
  const diffMode = diffModeEntryId === selectedEntry?.sys?.id;

  const unwrap = (val) => unwrapLocalized(val, selectedLocale);

  return (
    <div style={{ padding: 24 }}>
      {/* Controls row */}
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

        {/* Locale switcher — only shown when the space has multiple locales */}
        {locales.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ex-muted)" }}>Locale:</span>
            <div style={{ display: "flex", gap: 4 }}>
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => onLocaleChange(loc.code)}
                  title={loc.name}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--ex-border)",
                    background: selectedLocale === loc.code ? "var(--ex-accent)" : "var(--ex-surface2)",
                    color: selectedLocale === loc.code ? "#fff" : "var(--ex-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {loc.code}
                  {loc.default && (
                    <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>default</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedType && (
          <span style={{ fontSize: 12, color: "var(--ex-muted)", marginLeft: "auto" }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
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
          {/* Entry list */}
          <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
            {entries.map((entry) => {
              const titleField = selectedType.displayField;
              const rawTitle = entry.fields?.[titleField];
              const title = unwrap(rawTitle) ?? entry.sys.id;
              const badge = statusBadge(entry.sys);
              const isSelected = selectedEntry?.sys?.id === entry.sys.id;

              // Detect locale coverage: flag entries that have untranslated fields in the selected locale
              const missingInLocale =
                locales.length > 1 &&
                selectedLocale &&
                selectedType.fields?.some((f) => {
                  const v = entry.fields?.[f.id];
                  return isLocaleMap(v) && v[selectedLocale] === undefined;
                });

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
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {missingInLocale && (
                        <span
                          title={`Some fields have no value for ${selectedLocale}`}
                          style={{ fontSize: 10, color: "#e8a735", fontWeight: 700 }}
                        >
                          ⚠ {selectedLocale}
                        </span>
                      )}
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
                  </div>
                  <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)", marginTop: 4 }}>
                    {entry.sys.id}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail / Diff panel */}
          {selectedEntry && (
            diffMode ? (
              <DiffPanel
                config={config}
                entryId={selectedEntry.sys.id}
                contentType={selectedType}
                onClose={() => setDiffModeEntryId(null)}
              />
            ) : (
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
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ex-text)" }}>
                      {String(unwrap(selectedEntry.fields?.[selectedType.displayField]) ?? selectedEntry.sys.id)}
                    </div>
                    <div className="ex-mono" style={{ fontSize: 11, color: "var(--ex-muted)", marginTop: 2 }}>
                      Updated {new Date(selectedEntry.sys.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
                    <button
                      type="button"
                      onClick={() => setDiffModeEntryId(selectedEntry.sys.id)}
                      title="Compare what the CDA (published) and CPA (preview) return for this entry"
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--ex-border)",
                        background: "var(--ex-surface2)",
                        color: "var(--ex-text)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Compare APIs
                    </button>
                  </div>
                </div>

                <div style={{ padding: 20 }}>
                  {selectedType.fields?.map((fieldDef) => {
                    const rawVal = selectedEntry.fields?.[fieldDef.id];
                    const val = unwrap(rawVal);

                    // Show locale coverage chips when multiple locales exist
                    const localeChips =
                      locales.length > 1 && isLocaleMap(rawVal)
                        ? locales.map((loc) => ({
                            code: loc.code,
                            present: rawVal[loc.code] !== undefined,
                            active: loc.code === selectedLocale,
                          }))
                        : null;

                    return (
                      <div key={fieldDef.id} style={{ marginBottom: 18 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                            flexWrap: "wrap",
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
                          {localeChips && (
                            <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                              {localeChips.map((chip) => (
                                <span
                                  key={chip.code}
                                  title={chip.present ? `Has value for ${chip.code}` : `No value for ${chip.code}`}
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    border: "1px solid",
                                    borderColor: chip.active
                                      ? "var(--ex-accent)"
                                      : chip.present
                                      ? "var(--ex-border)"
                                      : "#e8a73588",
                                    color: chip.active
                                      ? "var(--ex-accent)"
                                      : chip.present
                                      ? "var(--ex-muted)"
                                      : "#e8a735",
                                    background: chip.present ? "transparent" : "rgba(232,167,53,0.08)",
                                  }}
                                >
                                  {chip.code}
                                  {!chip.present && " ✕"}
                                </span>
                              ))}
                            </div>
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
            )
          )}
        </div>
      )}
    </div>
  );
}
