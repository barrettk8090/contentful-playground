import { useState, useMemo } from "react";
import { cfGraphQL, cfFetch } from "../api/contentfulClient";

// ─── Query generator ─────────────────────────────────────────────────────────

/**
 * Contentful's GraphQL schema auto-generates from your content types.
 * The collection query name is the content type ID with a capital first letter
 * followed by "Collection". Field names match the field IDs directly.
 */
function generateQuery(contentType, limit = 5) {
  const typeId = contentType.sys.id;
  // Contentful GraphQL collection name: e.g. "blogPost" → "blogPostCollection"
  const collectionName = typeId.charAt(0).toLowerCase() + typeId.slice(1) + "Collection";

  const fieldLines = (contentType.fields || [])
    .map((field) => {
      // RichText → needs a nested `json` selection
      if (field.type === "RichText") return `${field.id} { json }`;
      // Location → lat/lon sub-fields
      if (field.type === "Location") return `${field.id} { lat lon }`;
      // Link to Entry or Asset → request basic sys info
      if (field.type === "Link") {
        if (field.linkType === "Asset") return `${field.id} { url contentType }`;
        return `${field.id} { sys { id } }`;
      }
      // Array of Links → GraphQL uses a nested collection pattern
      if (field.type === "Array" && field.items?.type === "Link") {
        if (field.items.linkType === "Asset") {
          return `${field.id}Collection { items { url contentType } }`;
        }
        return `${field.id}Collection { items { sys { id } } }`;
      }
      // Scalars (Symbol, Text, Integer, Number, Boolean, Date, Object) → just the field name
      return field.id;
    })
    .map((line) => `      ${line}`)
    .join("\n");

  return `{
  ${collectionName}(limit: ${limit}) {
    total
    items {
      sys {
        id
        publishedAt
        firstPublishedAt
      }
${fieldLines}
    }
  }
}`;
}

// ─── JSON pretty-printer ─────────────────────────────────────────────────────

function JsonDisplay({ data, maxHeight = 480 }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <pre
      className="ex-mono"
      style={{
        margin: 0,
        padding: "14px 16px",
        fontSize: 11.5,
        lineHeight: 1.6,
        overflowY: "auto",
        maxHeight,
        color: "var(--ex-text-secondary)",
        background: "var(--ex-surface2)",
        borderRadius: 8,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {text}
    </pre>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function ResultPanel({ label, badge, badgeColor, badgeBg, data, error, loading, hint }) {
  return (
    <div
      style={{
        background: "var(--ex-surface)",
        border: "1px solid var(--ex-border)",
        borderRadius: "var(--ex-radius)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--ex-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--ex-surface2)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ex-text)" }}>{label}</span>
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "2px 8px",
              borderRadius: 10,
              color: badgeColor,
              background: badgeBg,
            }}
          >
            {badge}
          </span>
        )}
        {hint && <span style={{ fontSize: 11, color: "var(--ex-muted)", marginLeft: "auto" }}>{hint}</span>}
      </div>
      <div style={{ padding: 14, flex: 1 }}>
        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ex-muted)" }}>
            <div className="ex-spinner" />
          </div>
        )}
        {!loading && error && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--ex-error-bg)",
              border: "1px solid var(--ex-error-border)",
              borderRadius: 8,
              color: "var(--ex-error-text)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && data && <JsonDisplay data={data} />}
        {!loading && !error && !data && (
          <div style={{ color: "var(--ex-muted)", fontSize: 13, padding: "10px 0" }}>
            Run a query to see results here.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function GraphQLView({ config, contentTypes, usePreview }) {
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [query, setQuery] = useState("");
  const [queryForTypeId, setQueryForTypeId] = useState(null);
  const [gqlResult, setGqlResult] = useState(null);
  const [restResult, setRestResult] = useState(null);
  const [gqlError, setGqlError] = useState(null);
  const [restError, setRestError] = useState(null);
  const [gqlLoading, setGqlLoading] = useState(false);
  const [restLoading, setRestLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const selectedType = useMemo(
    () => contentTypes.find((ct) => ct.sys.id === selectedTypeId) || null,
    [contentTypes, selectedTypeId]
  );

  // Regenerate query synchronously during render when the selected type changes.
  // React's recommended pattern for deriving state from props without useEffect.
  if (selectedTypeId !== queryForTypeId) {
    setQueryForTypeId(selectedTypeId);
    setQuery(selectedType ? generateQuery(selectedType) : "");
  }

  const handleRun = async () => {
    if (!query.trim()) return;
    setHasRun(true);
    setGqlResult(null);
    setRestResult(null);
    setGqlError(null);
    setRestError(null);
    setGqlLoading(true);
    setRestLoading(true);

    // Run GraphQL and REST in parallel
    cfGraphQL(config, query, usePreview)
      .then((data) => {
        setGqlResult(data);
        // Surface GraphQL errors returned in the response body
        if (data.errors) setGqlError(data.errors.map((e) => e.message).join("\n"));
      })
      .catch((e) => setGqlError(e.message))
      .finally(() => setGqlLoading(false));

    if (selectedType) {
      cfFetch(config, `/entries?content_type=${selectedTypeId}&limit=5`, usePreview)
        .then(setRestResult)
        .catch((e) => setRestError(e.message))
        .finally(() => setRestLoading(false));
    } else {
      setRestLoading(false);
      setRestError("Select a content type to see the REST comparison.");
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
    // Tab inserts two spaces instead of moving focus
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.target;
      const next = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
      e.target.value = next;
      e.target.selectionStart = e.target.selectionEnd = selectionStart + 2;
      setQuery(next);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Intro */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ex-text)", marginBottom: 4 }}>
          GraphQL Explorer
        </div>
        <div style={{ fontSize: 13, color: "var(--ex-muted)", maxWidth: 700, lineHeight: 1.6 }}>
          Contentful has two REST APIs (CDA and CPA) <em>and</em> a GraphQL Content API — all using
          the same tokens. GraphQL lets you request exactly the fields you need and resolves linked
          entries inline rather than in a separate{" "}
          <code className="ex-mono" style={{ fontSize: 12 }}>includes</code> array. Select a content
          type below to auto-generate a query, then run it to compare the two response shapes.
        </div>
      </div>

      {/* Type selector */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <select
          value={selectedTypeId}
          onChange={(e) => { setSelectedTypeId(e.target.value); setHasRun(false); }}
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
            <option key={ct.sys.id} value={ct.sys.id}>{ct.name}</option>
          ))}
        </select>
        {selectedType && (
          <span style={{ fontSize: 12, color: "var(--ex-muted)" }}>
            GraphQL type:{" "}
            <code className="ex-mono" style={{ fontSize: 12 }}>
              {selectedType.sys.id.charAt(0).toUpperCase() + selectedType.sys.id.slice(1)}
            </code>
            {" / collection: "}
            <code className="ex-mono" style={{ fontSize: 12 }}>
              {selectedType.sys.id.charAt(0).toLowerCase() + selectedType.sys.id.slice(1)}Collection
            </code>
          </span>
        )}
      </div>

      {/* Query editor + results */}
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 16 }}>
        {/* Editor */}
        <div
          style={{
            background: "var(--ex-surface)",
            border: "1px solid var(--ex-border)",
            borderRadius: "var(--ex-radius)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--ex-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--ex-surface2)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ex-text)" }}>
              GraphQL Query
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "var(--ex-muted)" }}>
                {usePreview ? "CPA token" : "CDA token"} · {config.graphqlBase}
              </span>
              <button
                type="button"
                onClick={handleRun}
                disabled={!query.trim()}
                style={{
                  padding: "5px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: query.trim() ? "var(--ex-accent)" : "var(--ex-border)",
                  color: query.trim() ? "#fff" : "var(--ex-muted)",
                  cursor: query.trim() ? "pointer" : "default",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                ▶ Run
              </button>
            </div>
          </div>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Select a content type above or write a GraphQL query…"
            spellCheck={false}
            style={{
              display: "block",
              width: "100%",
              minHeight: 220,
              padding: "14px 16px",
              background: "var(--ex-surface)",
              border: "none",
              color: "var(--ex-text)",
              fontFamily: "var(--ex-font-mono, 'JetBrains Mono', monospace)",
              fontSize: 12.5,
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              padding: "6px 16px",
              borderTop: "1px solid var(--ex-border)",
              fontSize: 11,
              color: "var(--ex-muted)",
            }}
          >
            Ctrl/Cmd + Enter to run · Tab inserts spaces
          </div>
        </div>

        {/* Results comparison */}
        {hasRun && (
          <>
            {/* Structural difference callout */}
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(91,141,239,0.08)",
                border: "1px solid rgba(91,141,239,0.25)",
                borderRadius: "var(--ex-radius)",
                fontSize: 12,
                color: "var(--ex-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--ex-text)" }}>What to compare:</strong> GraphQL returns
              your data nested directly under{" "}
              <code className="ex-mono" style={{ fontSize: 11 }}>data.{"{"}collectionName{"}"}.items</code>.
              REST returns it under <code className="ex-mono" style={{ fontSize: 11 }}>items[]</code>{" "}
              with linked entries in a separate{" "}
              <code className="ex-mono" style={{ fontSize: 11 }}>includes.Entry[]</code> array that
              you resolve manually. GraphQL also only returns the fields you explicitly requested —
              no over-fetching.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <ResultPanel
                label="GraphQL Response"
                badge="POST graphql.contentful.com"
                badgeColor="#5b8def"
                badgeBg="rgba(91,141,239,0.12)"
                data={gqlResult}
                error={gqlError}
                loading={gqlLoading}
                hint="fields you requested, links resolved inline"
              />
              <ResultPanel
                label="REST CDA Response"
                badge="GET cdn.contentful.com"
                badgeColor="#2ea88f"
                badgeBg="rgba(46,168,143,0.12)"
                data={restResult}
                error={restError}
                loading={restLoading}
                hint="all fields + separate includes[] for links"
              />
            </div>
          </>
        )}

        {!hasRun && selectedType && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--ex-surface)",
              borderRadius: "var(--ex-radius)",
              border: "1px dashed var(--ex-border)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>▶</div>
            <div style={{ fontWeight: 600, color: "var(--ex-text)", marginBottom: 4 }}>
              Query ready — click Run
            </div>
            <div style={{ fontSize: 12, color: "var(--ex-muted)" }}>
              The GraphQL and REST responses will appear side by side so you can compare their shapes.
            </div>
          </div>
        )}

        {!hasRun && !selectedType && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--ex-surface)",
              borderRadius: "var(--ex-radius)",
              border: "1px dashed var(--ex-border)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔭</div>
            <div style={{ fontWeight: 600, color: "var(--ex-text)", marginBottom: 4 }}>
              Select a content type to get started
            </div>
            <div style={{ fontSize: 12, color: "var(--ex-muted)" }}>
              A query will be auto-generated from your content model, or write your own.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
