import { getAssetUrl } from "./includedMaps";
import { unwrapLocalized } from "./localized";

function applyMarks(children, marks) {
  let out = children;
  for (const m of marks || []) {
    if (m.type === "bold") out = <strong>{out}</strong>;
    else if (m.type === "italic") out = <em>{out}</em>;
    else if (m.type === "underline") out = <u>{out}</u>;
    else if (m.type === "code") out = <code className="site-preview-code">{out}</code>;
  }
  return out;
}

function renderText(node, key) {
  const inner = applyMarks(node.value ?? "", node.marks);
  return (
    <span key={key} className="site-preview-rt-text">
      {inner}
    </span>
  );
}

function renderChildren(nodes, ctx, baseKey) {
  if (!nodes?.length) return null;
  return nodes.map((n, i) => renderNode(n, `${baseKey}-${i}`, ctx));
}

function renderNode(node, key, ctx) {
  if (!node) return null;

  switch (node.nodeType) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return (
        <p key={key} className="site-preview-rt-p">
          {renderChildren(node.content, ctx, key)}
        </p>
      );
    case "heading-1":
      return (
        <h1 key={key} className="site-preview-rt-h1">
          {renderChildren(node.content, ctx, key)}
        </h1>
      );
    case "heading-2":
      return (
        <h2 key={key} className="site-preview-rt-h2">
          {renderChildren(node.content, ctx, key)}
        </h2>
      );
    case "heading-3":
      return (
        <h3 key={key} className="site-preview-rt-h3">
          {renderChildren(node.content, ctx, key)}
        </h3>
      );
    case "heading-4":
      return (
        <h4 key={key} className="site-preview-rt-h4">
          {renderChildren(node.content, ctx, key)}
        </h4>
      );
    case "heading-5":
      return (
        <h5 key={key} className="site-preview-rt-h5">
          {renderChildren(node.content, ctx, key)}
        </h5>
      );
    case "heading-6":
      return (
        <h6 key={key} className="site-preview-rt-h6">
          {renderChildren(node.content, ctx, key)}
        </h6>
      );
    case "blockquote":
      return (
        <blockquote key={key} className="site-preview-rt-blockquote">
          {renderChildren(node.content, ctx, key)}
        </blockquote>
      );
    case "hr":
      return <hr key={key} className="site-preview-rt-hr" />;
    case "hyperlink": {
      const uri = node.data?.uri;
      return (
        <a key={key} href={uri || "#"} className="site-preview-link" target="_blank" rel="noreferrer">
          {renderChildren(node.content, ctx, key)}
        </a>
      );
    }
    case "entry-hyperlink": {
      const id = node.data?.target?.sys?.id;
      return (
        <span key={key} className="site-preview-entry-hyperlink" title={id || undefined}>
          {renderChildren(node.content, ctx, key)}
        </span>
      );
    }
    case "asset-hyperlink": {
      const id = node.data?.target?.sys?.id;
      const asset = id ? ctx.assetById[id] : null;
      const url = asset ? getAssetUrl(asset) : null;
      const title = asset ? unwrapLocalized(asset.fields?.title) : "";
      return (
        <a key={key} href={url || "#"} className="site-preview-link" target="_blank" rel="noreferrer">
          {renderChildren(node.content, ctx, key) || title || "Asset"}
        </a>
      );
    }
    case "ordered-list":
      return (
        <ol key={key} className="site-preview-rt-ol">
          {renderChildren(node.content, ctx, key)}
        </ol>
      );
    case "unordered-list":
      return (
        <ul key={key} className="site-preview-rt-ul">
          {renderChildren(node.content, ctx, key)}
        </ul>
      );
    case "list-item":
      return (
        <li key={key} className="site-preview-rt-li">
          {renderChildren(node.content, ctx, key)}
        </li>
      );
    case "embedded-asset-block": {
      const id = node.data?.target?.sys?.id;
      const asset = id ? ctx.assetById[id] : null;
      const url = asset ? getAssetUrl(asset) : null;
      const title = asset ? unwrapLocalized(asset.fields?.title) : "";
      const file = unwrapLocalized(asset?.fields?.file);
      const ct = file?.contentType || "";
      if (!asset || !url) {
        return (
          <p key={key} className="site-preview-rt-missing">
            Embedded asset unavailable
          </p>
        );
      }
      if (ct.startsWith("image/")) {
        return (
          <figure key={key} className="site-preview-rt-figure">
            <img src={url} alt={title || ""} className="site-preview-rt-img" loading="lazy" />
            {title ? <figcaption className="site-preview-rt-caption">{title}</figcaption> : null}
          </figure>
        );
      }
      return (
        <p key={key}>
          <a href={url} className="site-preview-link" target="_blank" rel="noreferrer">
            {title || "Download"}
          </a>
        </p>
      );
    }
    case "embedded-entry-block": {
      const id = node.data?.target?.sys?.id;
      const entry = id ? ctx.entryById[id] : null;
      if (!entry) {
        return (
          <p key={key} className="site-preview-rt-missing">
            Embedded entry unavailable
          </p>
        );
      }
      return (
        <div key={key} className="site-preview-embedded-entry">
          {ctx.renderEmbeddedEntry?.(entry)}
        </div>
      );
    }
    case "embedded-entry-inline": {
      const id = node.data?.target?.sys?.id;
      const entry = id ? ctx.entryById[id] : null;
      if (!entry) return <span key={key}>…</span>;
      return (
        <span key={key} className="site-preview-embedded-entry-inline">
          {ctx.renderEmbeddedEntry?.(entry)}
        </span>
      );
    }
    default:
      return node.content ? (
        <div key={key} className="site-preview-rt-unknown">
          {renderChildren(node.content, ctx, key)}
        </div>
      ) : null;
  }
}

/**
 * Renders a Contentful Rich Text document (v1 JSON).
 * Passes through ctx: entryById, assetById, renderEmbeddedEntry, displayFieldForEntry.
 */
export function RichTextBody({ document: doc, ctx }) {
  if (!doc?.content?.length) return null;
  return (
    <div className="site-preview-rich-text">{doc.content.map((n, i) => renderNode(n, `rt-${i}`, ctx))}</div>
  );
}
