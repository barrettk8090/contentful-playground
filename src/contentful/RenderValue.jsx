import { extractRichText } from "./helpers";

export function RenderValue({ value, depth = 0 }) {
  if (value === null || value === undefined)
    return <span style={{ color: "var(--ex-muted)" }}>—</span>;
  if (typeof value === "boolean")
    return <span style={{ color: "#8b5cf6" }}>{value ? "true" : "false"}</span>;
  if (typeof value === "number") return <span style={{ color: "#5b8def" }}>{value}</span>;
  if (typeof value === "string") {
    if (value.length > 200) return <span>{value.slice(0, 200)}…</span>;
    return <span>{value}</span>;
  }
  if (value?.sys?.type === "Link") {
    return (
      <span style={{ color: "#e05a9c", fontSize: 12 }}>
        🔗 {value.sys.linkType}:{value.sys.id}
      </span>
    );
  }
  if (value?.nodeType === "document") {
    const plain = extractRichText(value);
    return (
      <span>
        {plain.slice(0, 200)}
        {plain.length > 200 ? "…" : ""}
      </span>
    );
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: "var(--ex-muted)" }}>[]</span>;
    return (
      <div style={{ paddingLeft: depth < 2 ? 12 : 0 }}>
        {value.slice(0, 5).map((v, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <RenderValue value={v} depth={depth + 1} />
          </div>
        ))}
        {value.length > 5 && (
          <span style={{ color: "var(--ex-muted)", fontSize: 12 }}>+{value.length - 5} more</span>
        )}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <span style={{ color: "var(--ex-muted)", fontSize: 12 }}>
        {JSON.stringify(value).slice(0, 120)}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}
