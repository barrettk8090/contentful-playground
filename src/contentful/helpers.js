export const fieldTypeColor = (t) => {
  const map = {
    Symbol: "#e8a735",
    Text: "#d4793a",
    RichText: "#c45e3a",
    Integer: "#5b8def",
    Number: "#5b8def",
    Boolean: "#8b5cf6",
    Date: "#2ea88f",
    Link: "#e05a9c",
    Array: "#ef6c57",
    Object: "#9ca3af",
    Location: "#2ea88f",
  };
  return map[t] || "#6b7280";
};

export const statusBadge = (sys) => {
  if (!sys) return null;
  const published = sys.publishedVersion;
  const updated = sys.version;
  if (!published) return { label: "DRAFT", color: "#e8a735", bg: "rgba(232,167,53,0.12)" };
  if (updated > published + 1) return { label: "CHANGED", color: "#5b8def", bg: "rgba(91,141,239,0.12)" };
  return { label: "PUBLISHED", color: "#2ea88f", bg: "rgba(46,168,143,0.12)" };
};

export function extractRichText(doc) {
  if (!doc?.content) return "";
  return doc.content
    .map((node) => {
      if (node.nodeType === "paragraph" || node.nodeType === "heading-1" || node.nodeType === "heading-2") {
        return (node.content || []).map((c) => c.value || "").join("");
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}
