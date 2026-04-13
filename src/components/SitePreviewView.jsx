import { useEffect, useMemo, useState } from "react";
import { cfFetch } from "../api/contentfulClient";
import { RichTextBody } from "../contentful/RichTextBody";
import { getAssetUrl, mergeIncludedMaps, resolveLink } from "../contentful/includedMaps";
import { unwrapLocalized } from "../contentful/localized";

const MAX_DEPTH = 8;

const defaultTypeId = () => {
  const raw = import.meta.env.VITE_SITE_PREVIEW_CONTENT_TYPE;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : "";
};

function contentTypeForEntry(entry, contentTypesById) {
  const id = entry?.sys?.contentType?.sys?.id;
  return id ? contentTypesById[id] : null;
}

function displayFieldForEntry(entry, contentTypesById) {
  const ct = contentTypeForEntry(entry, contentTypesById);
  return ct?.displayField || "title";
}

function entryTitle(entry, contentTypesById) {
  const df = displayFieldForEntry(entry, contentTypesById);
  const v = unwrapLocalized(entry?.fields?.[df]);
  if (v != null && String(v).trim() !== "") return String(v);
  return entry?.sys?.id || "Untitled";
}

function SiteAssetBlock({ asset }) {
  const url = getAssetUrl(asset);
  const title = unwrapLocalized(asset?.fields?.title);
  const file = unwrapLocalized(asset?.fields?.file);
  const ct = file?.contentType || "";
  if (!url) return <span className="site-preview-muted">Missing file</span>;
  if (ct.startsWith("image/")) {
    return <img src={url} alt={title || ""} className="site-preview-img" loading="lazy" />;
  }
  return (
    <a href={url} className="site-preview-download" target="_blank" rel="noreferrer">
      {title || "Download file"}
    </a>
  );
}

function FieldLabel({ children }) {
  return <div className="site-preview-field-label">{children}</div>;
}

function EntryCard({ title, kicker, children }) {
  return (
    <article className="site-preview-card">
      {kicker ? <div className="site-preview-card-kicker">{kicker}</div> : null}
      {title ? <h3 className="site-preview-card-title">{title}</h3> : null}
      <div className="site-preview-card-body">{children}</div>
    </article>
  );
}

export function SitePreviewView({ config, contentTypes, usePreview }) {
  const contentTypesById = useMemo(
    () => Object.fromEntries((contentTypes || []).map((c) => [c.sys.id, c])),
    [contentTypes]
  );

  const [typeId, setTypeId] = useState(defaultTypeId);
  const [entryId, setEntryId] = useState("");
  const [listEntries, setListEntries] = useState([]);
  const [detailJson, setDetailJson] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!typeId || !config?.ok) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setListLoading(true);
      setLocalError(null);
      cfFetch(config, `/entries?content_type=${encodeURIComponent(typeId)}&limit=100`, usePreview)
        .then((data) => {
          if (cancelled) return;
          setListEntries(data.items || []);
          setEntryId((prev) => {
            const ids = new Set((data.items || []).map((e) => e.sys.id));
            if (prev && ids.has(prev)) return prev;
            return data.items?.[0]?.sys?.id || "";
          });
        })
        .catch((e) => {
          if (!cancelled) setLocalError(e.message);
        })
        .finally(() => {
          if (!cancelled) setListLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [config, typeId, usePreview]);

  useEffect(() => {
    if (!entryId || !config?.ok) {
      queueMicrotask(() => setDetailJson(null));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDetailLoading(true);
      setLocalError(null);
      cfFetch(config, `/entries/${encodeURIComponent(entryId)}?include=10`, usePreview)
        .then((data) => {
          if (cancelled) return;
          setDetailJson(data);
        })
        .catch((e) => {
          if (!cancelled) setLocalError(e.message);
        })
        .finally(() => {
          if (!cancelled) setDetailLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [config, entryId, usePreview]);

  const maps = useMemo(() => (detailJson ? mergeIncludedMaps(detailJson) : null), [detailJson]);

  const rootEntry = useMemo(() => {
    if (!detailJson) return null;
    if (detailJson.sys?.type === "Entry") return detailJson;
    return null;
  }, [detailJson]);

  return (
    <div className="site-preview-root">
      <div style={{ padding: "0 24px 16px" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ex-muted)", maxWidth: 720, lineHeight: 1.5 }}>
          Pick a page (or any entry) to render it like a simple site. Linked entries and assets resolve up to 10 levels
          via <code className="ex-mono">include</code>. Model a homepage with references — hero, callouts, blog lists —
          and see them composed here. The header toggle still switches published vs preview.
        </p>
      </div>

      <div
        style={{
          padding: "0 24px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ex-muted)" }}>
          Content type
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setEntryId("");
              setDetailJson(null);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--ex-border)",
              background: "var(--ex-surface2)",
              color: "var(--ex-text)",
              fontSize: 13,
              fontFamily: "inherit",
              minWidth: 220,
            }}
          >
            <option value="">Select…</option>
            {contentTypes.map((ct) => (
              <option key={ct.sys.id} value={ct.sys.id}>
                {ct.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ex-muted)" }}>
          Entry
          <select
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
            disabled={!typeId || listLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--ex-border)",
              background: "var(--ex-surface2)",
              color: "var(--ex-text)",
              fontSize: 13,
              fontFamily: "inherit",
              minWidth: 260,
            }}
          >
            <option value="">{listLoading ? "Loading…" : "Select…"}</option>
            {listEntries.map((e) => (
              <option key={e.sys.id} value={e.sys.id}>
                {entryTitle(e, contentTypesById)}
              </option>
            ))}
          </select>
        </label>

        {(listLoading || detailLoading) && (
          <span style={{ fontSize: 13, color: "var(--ex-muted)" }}>
            <span className="ex-spinner" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />
            Loading…
          </span>
        )}
      </div>

      {localError && (
        <div
          style={{
            margin: "0 24px 16px",
            padding: "12px 16px",
            background: "var(--ex-error-bg)",
            border: "1px solid var(--ex-error-border)",
            borderRadius: "var(--ex-radius)",
            color: "var(--ex-error-text)",
            fontSize: 13,
          }}
        >
          ⚠️ {localError}
        </div>
      )}

      <div className="site-preview-frame">
        <div className="site-preview-chrome">
          <span className="site-preview-chrome-dot" />
          <span className="site-preview-chrome-dot" />
          <span className="site-preview-chrome-dot" />
          <div className="site-preview-url ex-mono" title={usePreview ? "Preview API" : "Delivery API"}>
            {usePreview ? "preview.contentful.com" : "cdn.contentful.com"}
            <span className="site-preview-url-path"> / {entryId ? `${entryId.slice(0, 8)}…` : "…"}</span>
          </div>
          <span className={`site-preview-api-pill ${usePreview ? "is-preview" : "is-delivery"}`}>
            {usePreview ? "Preview" : "Published"}
          </span>
        </div>

        <div className="site-preview-canvas">
          {!typeId && (
            <div className="site-preview-empty">
              <div className="site-preview-empty-icon">🌐</div>
              <p>Select a content type to render your first page.</p>
            </div>
          )}

          {typeId && !entryId && !listLoading && listEntries.length === 0 && (
            <div className="site-preview-empty">
              <div className="site-preview-empty-icon">📭</div>
              <p>No entries for this type. Create one in the Contentful web app, then refresh.</p>
            </div>
          )}

          {rootEntry && maps && (
            <div className="site-preview-page">
              <header className="site-preview-page-header">
                <h1 className="site-preview-page-title">{entryTitle(rootEntry, contentTypesById)}</h1>
                <p className="site-preview-page-meta ex-mono">
                  {contentTypeForEntry(rootEntry, contentTypesById)?.name || "Entry"} · {rootEntry.sys.id}
                </p>
              </header>

              <SiteEntryBody
                entry={rootEntry}
                depth={0}
                contentTypesById={contentTypesById}
                entryById={maps.entryById}
                assetById={maps.assetById}
                skipDisplayField
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteEntryBody({ entry, depth, contentTypesById, entryById, assetById, skipDisplayField }) {
  if (!entry || depth > MAX_DEPTH) return null;

  const ct = contentTypeForEntry(entry, contentTypesById);
  const fieldsDef = ct?.fields || [];
  const displayFieldId = displayFieldForEntry(entry, contentTypesById);

  const inner = fieldsDef.map((fieldDef) => {
    const raw = entry.fields?.[fieldDef.id];
    const val = unwrapLocalized(raw);
    if (val === undefined || val === null || val === "") return null;

    if (fieldDef.id === displayFieldId && (skipDisplayField || depth > 0)) return null;

    return (
      <SiteField
        key={`${entry.sys.id}-${fieldDef.id}`}
        fieldDef={fieldDef}
        value={val}
        depth={depth}
        contentTypesById={contentTypesById}
        entryById={entryById}
        assetById={assetById}
      />
    );
  });

  if (depth > 0) {
    const t = entryTitle(entry, contentTypesById);
    const kicker = ct?.name || "Block";
    return (
      <EntryCard title={t} kicker={kicker}>
        {inner}
      </EntryCard>
    );
  }

  return <div className="site-preview-sections">{inner}</div>;
}

function SiteField({ fieldDef, value, depth, contentTypesById, entryById, assetById }) {
  const label = fieldDef.name;
  const t = fieldDef.type;

  if (t === "RichText" && value?.nodeType === "document") {
    const rtCtx = {
      entryById,
      assetById,
      displayFieldForEntry: (e) => displayFieldForEntry(e, contentTypesById),
      renderEmbeddedEntry: (e) => (
        <SiteEntryBody
          entry={e}
          depth={depth + 1}
          contentTypesById={contentTypesById}
          entryById={entryById}
          assetById={assetById}
          skipDisplayField={false}
        />
      ),
    };
    return (
      <section className="site-preview-section">
        <FieldLabel>{label}</FieldLabel>
        <RichTextBody document={value} ctx={rtCtx} />
      </section>
    );
  }

  if (t === "Link") {
    const resolved = resolveLink(value, entryById, assetById);
    if (!resolved) {
      return (
        <section className="site-preview-section">
          <FieldLabel>{label}</FieldLabel>
          <p className="site-preview-muted">Unresolved link (not in include graph)</p>
        </section>
      );
    }
    if (resolved.kind === "asset") {
      return (
        <section className="site-preview-section">
          <FieldLabel>{label}</FieldLabel>
          <SiteAssetBlock asset={resolved.entity} />
        </section>
      );
    }
    return (
      <section className="site-preview-section site-preview-section-nested">
        <FieldLabel>{label}</FieldLabel>
        <SiteEntryBody
          entry={resolved.entity}
          depth={depth + 1}
          contentTypesById={contentTypesById}
          entryById={entryById}
          assetById={assetById}
          skipDisplayField={false}
        />
      </section>
    );
  }

  if (t === "Array") {
    const items = Array.isArray(value) ? value : [];
    if (items.length === 0) return null;

    const first = items[0];
    if (first?.sys?.type === "Link") {
      const resolvedItems = items
        .map((link) => resolveLink(link, entryById, assetById))
        .filter(Boolean);

      const assets = resolvedItems.filter((x) => x.kind === "asset");
      const entries = resolvedItems.filter((x) => x.kind === "entry");

      if (assets.length === resolvedItems.length) {
        return (
          <section className="site-preview-section">
            <FieldLabel>{label}</FieldLabel>
            <div className="site-preview-grid">
              {assets.map((a, i) => (
                <SiteAssetBlock key={i} asset={a.entity} />
              ))}
            </div>
          </section>
        );
      }

      if (entries.length === resolvedItems.length) {
        return (
          <section className="site-preview-section">
            <FieldLabel>{label}</FieldLabel>
            <div className="site-preview-cards">
              {entries.map((en, i) => (
                <SiteEntryBody
                  key={en.entity.sys.id + String(i)}
                  entry={en.entity}
                  depth={depth + 1}
                  contentTypesById={contentTypesById}
                  entryById={entryById}
                  assetById={assetById}
                  skipDisplayField={false}
                />
              ))}
            </div>
          </section>
        );
      }

      return (
        <section className="site-preview-section">
          <FieldLabel>{label}</FieldLabel>
          <p className="site-preview-muted">Mixed or unresolved references ({items.length} items)</p>
        </section>
      );
    }

    return (
      <section className="site-preview-section">
        <FieldLabel>{label}</FieldLabel>
        <ul className="site-preview-plain-list">
          {items.map((item, i) => (
            <li key={i}>{formatPrimitive(item, fieldDef)}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="site-preview-section">
      <FieldLabel>{label}</FieldLabel>
      <div className="site-preview-primitive">{formatPrimitive(value, fieldDef)}</div>
    </section>
  );
}

function formatPrimitive(value, fieldDef) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (fieldDef?.type === "Date") return unwrapLocalized(value);
  if (fieldDef?.type === "Location" && value && typeof value === "object") {
    const lat = value.lat ?? value.latitude;
    const lon = value.lon ?? value.longitude;
    if (lat != null && lon != null) return `${lat}, ${lon}`;
  }
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}
