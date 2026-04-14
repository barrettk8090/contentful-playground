import { useEffect, useMemo, useState } from "react";
import { cfFetch } from "../api/contentfulClient";
import { RichTextBody } from "../contentful/RichTextBody";
import { getAssetUrl, mergeIncludedMaps, resolveLink } from "../contentful/includedMaps";
import { extractRichText } from "../contentful/helpers";
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

function entrySnippet(entry) {
  const fields = entry?.fields || {};
  const candidates = [
    fields.homepageSnippet,
    fields.homepageTextSnippet,
    fields.blogSnippetForHomepage,
    fields.blogSnippetForHomePage,
    fields.blogSnippetHomepage,
    fields.snippetForHomepage,
    fields.snippet,
    fields.excerpt,
    fields.summary,
    fields.description,
    fields.body,
    fields.content,
  ];

  for (const c of candidates) {
    const v = unwrapLocalized(c);
    if (!v) continue;
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (v?.nodeType === "document") {
      const plain = extractRichText(v);
      if (plain.trim() !== "") return plain.trim();
    }
  }
  return "";
}

function fieldIdByName(ct, nameIncludes) {
  const needle = String(nameIncludes || "").toLowerCase().trim();
  if (!needle) return null;
  const f = (ct?.fields || []).find((x) => String(x?.name || "").toLowerCase().includes(needle));
  return f?.id || null;
}

function unwrapField(entry, fieldId) {
  if (!fieldId) return undefined;
  return unwrapLocalized(entry?.fields?.[fieldId]);
}

function resolveAssetFromValue(val, entryById, assetById) {
  if (!val) return null;
  // Already-resolved Asset
  if (val?.sys?.type === "Asset" || (val?.fields?.file && val?.sys?.id)) return val;
  // Sometimes a file-like object may be embedded directly
  if (typeof val === "object" && !Array.isArray(val) && typeof val.url === "string") {
    return { sys: { id: "inline-file", type: "Asset" }, fields: { file: { url: val.url, contentType: val.contentType } } };
  }
  const resolved = resolveLink(val, entryById, assetById);
  return resolved?.kind === "asset" ? resolved.entity : null;
}

function resolveEntryFromValue(val, entryById, assetById) {
  if (!val) return null;
  if (val?.sys?.type === "Entry" || (val?.fields && val?.sys?.id)) return val;
  const resolved = resolveLink(val, entryById, assetById);
  return resolved?.kind === "entry" ? resolved.entity : null;
}

function collectLinksDeep(value, out, depth = 0) {
  if (value == null || depth > 6) return;
  if (Array.isArray(value)) {
    for (const v of value) collectLinksDeep(v, out, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  // Contentful Link object
  if (value?.sys?.type === "Link" && (value.sys.linkType === "Entry" || value.sys.linkType === "Asset")) {
    out.push({ linkType: value.sys.linkType, id: value.sys.id });
    return;
  }

  // Rich text doc: embedded targets are in node.data.target
  if (value?.nodeType === "document" || value?.nodeType) {
    const content = value.content;
    if (Array.isArray(content)) collectLinksDeep(content, out, depth + 1);
    const target = value.data?.target;
    if (target?.sys?.type === "Link") collectLinksDeep(target, out, depth + 1);
    return;
  }

  // Locale map or plain object: walk values
  for (const v of Object.values(value)) collectLinksDeep(v, out, depth + 1);
}

function collectLinksFromEntryGraph(rootEntry, entryById) {
  const out = [];
  const seenEntryIds = new Set();

  const walkEntry = (entry, depth = 0) => {
    if (!entry?.sys?.id || depth > 4) return;
    if (seenEntryIds.has(entry.sys.id)) return;
    seenEntryIds.add(entry.sys.id);

    collectLinksDeep(entry.fields, out, 0);

    // Follow entry links so we also see assets nested in referenced entries.
    const links = [];
    collectLinksDeep(entry.fields, links, 0);
    for (const l of links) {
      if (l.linkType === "Entry") {
        const next = entryById[l.id];
        if (next) walkEntry(next, depth + 1);
      }
    }
  };

  walkEntry(rootEntry, 0);
  return out;
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

function EntryCard({ title, kicker, onOpen, children }) {
  return (
    <article className="site-preview-card">
      {kicker ? <div className="site-preview-card-kicker">{kicker}</div> : null}
      {title ? (
        <h3 className="site-preview-card-title">
          {onOpen ? (
            <button type="button" className="site-preview-card-open" onClick={onOpen}>
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
      ) : null}
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
  const [extraEntries, setExtraEntries] = useState({});
  const [extraAssets, setExtraAssets] = useState({});
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
          setExtraEntries({});
          setExtraAssets({});
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

  const maps = useMemo(() => {
    if (!detailJson) return null;
    const base = mergeIncludedMaps(detailJson);
    return {
      entryById: { ...base.entryById, ...extraEntries },
      assetById: { ...base.assetById, ...extraAssets },
    };
  }, [detailJson, extraEntries, extraAssets]);

  const rootEntry = useMemo(() => {
    if (!detailJson) return null;
    if (detailJson.sys?.type === "Entry") return detailJson;
    return null;
  }, [detailJson]);

  // If some links aren't in `includes`, fetch them explicitly (covers links inside Object fields too).
  useEffect(() => {
    if (!rootEntry || !maps || !config?.ok) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const links = collectLinksFromEntryGraph(rootEntry, maps.entryById);
      const missing = links.filter((l) => {
        if (l.linkType === "Entry") return !maps.entryById[l.id];
        return !maps.assetById[l.id];
      });
      if (missing.length === 0) return;

      // De-dupe and cap to avoid runaway
      const uniq = [];
      const seen = new Set();
      for (const m of missing) {
        const k = `${m.linkType}:${m.id}`;
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(m);
        }
      }

      uniq.slice(0, 80).forEach((m) => {
        const path =
          m.linkType === "Asset"
            ? `/assets/${encodeURIComponent(m.id)}`
            : `/entries/${encodeURIComponent(m.id)}?include=2`;
        cfFetch(config, path, usePreview)
          .then((data) => {
            if (cancelled) return;
            if (data?.sys?.id) {
              if (m.linkType === "Asset") setExtraAssets((p) => ({ ...p, [data.sys.id]: data }));
              else setExtraEntries((p) => ({ ...p, [data.sys.id]: data }));
            }
          })
          .catch(() => {
            // ignore per-link failures; we'll just keep it unresolved
          });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [rootEntry, maps, config, usePreview]);

  const openEntryInPreview = (entry) => {
    const nextTypeId = entry?.sys?.contentType?.sys?.id || "";
    const nextEntryId = entry?.sys?.id || "";
    if (!nextTypeId || !nextEntryId) return;
    setTypeId(nextTypeId);
    setEntryId(nextEntryId);
    setDetailJson(null);
  };

  const rootCt = rootEntry ? contentTypeForEntry(rootEntry, contentTypesById) : null;
  const rootCtName = String(rootCt?.name || "").toLowerCase();
  const isHomepage = rootCtName.includes("homepage");
  const isBlogPost = rootCtName.includes("blog");

  const urlPath = useMemo(() => {
    if (!rootEntry) return "…";
    const slugFieldId = rootCt ? fieldIdByName(rootCt, "slug") : null;
    const slug = unwrapField(rootEntry, slugFieldId);
    if (typeof slug === "string" && slug.trim() !== "") return slug.trim();
    return `${rootEntry.sys.id.slice(0, 8)}…`;
  }, [rootEntry, rootCt]);

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
            <span className="site-preview-url-path"> / {entryId ? urlPath : "…"}</span>
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
              {isHomepage ? (
                <HomepagePage
                  entry={rootEntry}
                  contentTypesById={contentTypesById}
                  entryById={maps.entryById}
                  assetById={maps.assetById}
                  onOpenEntry={openEntryInPreview}
                />
              ) : isBlogPost ? (
                <BlogPostPage
                  entry={rootEntry}
                  ct={rootCt}
                  contentTypesById={contentTypesById}
                  entryById={maps.entryById}
                  assetById={maps.assetById}
                />
              ) : (
                <>
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
                    onOpenEntry={openEntryInPreview}
                    skipDisplayField
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomepagePage({ entry, contentTypesById, entryById, assetById, onOpenEntry }) {
  const ct = contentTypeForEntry(entry, contentTypesById);

  const heroFieldId = fieldIdByName(ct, "hero");
  const productsFieldId = fieldIdByName(ct, "featured products");
  const calloutsFieldId = fieldIdByName(ct, "special callouts");
  const blogsFieldId = fieldIdByName(ct, "featured blog posts");

  const heroEntry = resolveEntryFromValue(unwrapField(entry, heroFieldId), entryById, assetById);
  const products = unwrapField(entry, productsFieldId);
  const calloutsEntry = resolveEntryFromValue(unwrapField(entry, calloutsFieldId), entryById, assetById);
  const blogs = unwrapField(entry, blogsFieldId);

  return (
    <div className="site-home">
      <HeroSection entry={heroEntry} contentTypesById={contentTypesById} entryById={entryById} assetById={assetById} onOpenEntry={onOpenEntry} />

      <section className="site-home-section">
        <div className="site-home-section-title">Featured products</div>
        <ProductRow
          items={Array.isArray(products) ? products : []}
          contentTypesById={contentTypesById}
          entryById={entryById}
          assetById={assetById}
        />
      </section>

      <section className="site-home-section">
        <div className="site-home-section-title">Special callouts</div>
        <SplitCallout entry={calloutsEntry} contentTypesById={contentTypesById} entryById={entryById} assetById={assetById} />
      </section>

      <section className="site-home-section">
        <div className="site-home-section-title">Featured blog posts</div>
        <BlogList
          items={Array.isArray(blogs) ? blogs : []}
          contentTypesById={contentTypesById}
          entryById={entryById}
          assetById={assetById}
          onOpenEntry={onOpenEntry}
        />
      </section>
    </div>
  );
}

function HeroSection({ entry, contentTypesById, entryById, assetById, onOpenEntry }) {
  if (!entry) {
    return (
      <div className="site-hero site-hero--empty">
        <div className="site-hero-empty">Add a Hero reference to see the hero section.</div>
      </div>
    );
  }
  const ct = contentTypeForEntry(entry, contentTypesById);
  const imageFieldId = fieldIdByName(ct, "desktopimage") || fieldIdByName(ct, "desktop image") || fieldIdByName(ct, "image");
  const textFieldId = fieldIdByName(ct, "hero text") || fieldIdByName(ct, "text");
  const buttonFieldId = fieldIdByName(ct, "herobutton") || fieldIdByName(ct, "hero button") || fieldIdByName(ct, "button");

  const heroText = unwrapField(entry, textFieldId);
  const asset = resolveAssetFromValue(unwrapField(entry, imageFieldId), entryById, assetById);
  const buttonEntry = resolveEntryFromValue(unwrapField(entry, buttonFieldId), entryById, assetById);

  const btnCt = buttonEntry ? contentTypeForEntry(buttonEntry, contentTypesById) : null;
  const btnTextId = btnCt ? (fieldIdByName(btnCt, "buttontext") || fieldIdByName(btnCt, "button text") || fieldIdByName(btnCt, "text")) : null;
  const btnUrlId = btnCt ? (fieldIdByName(btnCt, "buttonurl") || fieldIdByName(btnCt, "button url") || fieldIdByName(btnCt, "url")) : null;
  const btnText = buttonEntry ? unwrapField(buttonEntry, btnTextId) : null;
  const btnUrl = buttonEntry ? unwrapField(buttonEntry, btnUrlId) : null;

  const bgUrl = asset ? getAssetUrl(asset) : null;

  return (
    <section className="site-hero" style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}>
      <div className="site-hero-overlay" />
      <div className="site-hero-inner">
        <h1 className="site-hero-title">{heroText ? String(heroText) : entryTitle(entry, contentTypesById)}</h1>
        {btnText ? (
          <div className="site-hero-actions">
            {typeof btnUrl === "string" && btnUrl.trim() !== "" ? (
              <a className="site-hero-cta" href={btnUrl} target="_blank" rel="noreferrer">
                {String(btnText)}
              </a>
            ) : (
              <button type="button" className="site-hero-cta" onClick={() => onOpenEntry?.(buttonEntry)}>
                {String(btnText)}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProductRow({ items, contentTypesById, entryById, assetById }) {
  const resolved = items
    .map((v) => resolveEntryFromValue(v, entryById, assetById))
    .filter(Boolean)
    .slice(0, 4);

  if (resolved.length === 0) {
    return <div className="site-home-muted">Add some Product Card references to show products here.</div>;
  }

  return (
    <div className="site-products">
      {resolved.map((p) => {
        const ct = contentTypeForEntry(p, contentTypesById);
        const nameId = fieldIdByName(ct, "product name") || fieldIdByName(ct, "name");
        const priceId = fieldIdByName(ct, "product price") || fieldIdByName(ct, "price");
        const imgId = fieldIdByName(ct, "product image") || fieldIdByName(ct, "image");
        const name = unwrapField(p, nameId) || entryTitle(p, contentTypesById);
        const price = unwrapField(p, priceId);
        const asset = resolveAssetFromValue(unwrapField(p, imgId), entryById, assetById);
        const imgUrl = asset ? getAssetUrl(asset) : null;

        return (
          <div key={p.sys.id} className="site-product">
            <div className="site-product-img">
              {imgUrl ? <img src={imgUrl} alt={String(name)} loading="lazy" /> : <div className="site-product-img-missing">No image</div>}
            </div>
            <div className="site-product-name">{String(name)}</div>
            {price != null && price !== "" ? (
              <div className="site-product-price">${typeof price === "number" ? price.toFixed(2) : String(price)}</div>
            ) : (
              <div className="site-product-price site-home-muted">No price</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SplitCallout({ entry, contentTypesById, entryById, assetById }) {
  if (!entry) return <div className="site-home-muted">Add a Special Callouts reference to show this section.</div>;
  const ct = contentTypeForEntry(entry, contentTypesById);
  const titleId = fieldIdByName(ct, "title");
  const leftId = fieldIdByName(ct, "left text") || fieldIdByName(ct, "text");
  const rightImgId = fieldIdByName(ct, "right image") || fieldIdByName(ct, "image");

  const title = unwrapField(entry, titleId);
  const left = unwrapField(entry, leftId);
  const asset = resolveAssetFromValue(unwrapField(entry, rightImgId), entryById, assetById);
  const imgUrl = asset ? getAssetUrl(asset) : null;

  return (
    <div className="site-split">
      <div className="site-split-left">
        {title ? <h2 className="site-split-title">{String(title)}</h2> : null}
        {left?.nodeType === "document" ? (
          <RichTextBody
            document={left}
            ctx={{
              entryById,
              assetById,
              displayFieldForEntry: (e) => displayFieldForEntry(e, contentTypesById),
              renderEmbeddedEntry: (e) => (
                <SiteEntryBody
                  entry={e}
                  depth={2}
                  contentTypesById={contentTypesById}
                  entryById={entryById}
                  assetById={assetById}
                  skipDisplayField={false}
                />
              ),
            }}
          />
        ) : left ? (
          <p className="site-split-text">{String(left)}</p>
        ) : (
          <p className="site-home-muted">Add Left Text rich text to show copy here.</p>
        )}
      </div>
      <div className="site-split-right">
        {imgUrl ? <img src={imgUrl} alt={title ? String(title) : ""} loading="lazy" /> : <div className="site-home-muted">Add a Right Image.</div>}
      </div>
    </div>
  );
}

function BlogList({ items, contentTypesById, entryById, assetById, onOpenEntry }) {
  const resolved = items.map((v) => resolveEntryFromValue(v, entryById, assetById)).filter(Boolean);
  if (resolved.length === 0) return <div className="site-home-muted">Add Blog Post references to show posts here.</div>;

  return (
    <div className="site-blogs">
      {resolved.map((b) => {
        const title = entryTitle(b, contentTypesById);
        const snippet = entrySnippet(b);
        return (
          <button key={b.sys.id} type="button" className="site-blog" onClick={() => onOpenEntry?.(b)}>
            <div className="site-blog-title">{title}</div>
            {snippet ? <div className="site-blog-snippet">{snippet.slice(0, 220)}{snippet.length > 220 ? "…" : ""}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

function BlogPostPage({ entry, ct, contentTypesById, entryById, assetById }) {
  const titleId = ct ? (fieldIdByName(ct, "title") || ct.displayField) : null;
  const bodyId = ct ? fieldIdByName(ct, "body") : null;
  const title = unwrapField(entry, titleId) || entryTitle(entry, contentTypesById);
  const body = unwrapField(entry, bodyId);

  return (
    <article className="site-blogpage">
      <header className="site-blogpage-header">
        <h1 className="site-blogpage-title">{String(title)}</h1>
      </header>
      {body?.nodeType === "document" ? (
        <RichTextBody
          document={body}
          ctx={{
            entryById,
            assetById,
            displayFieldForEntry: (e) => displayFieldForEntry(e, contentTypesById),
            renderEmbeddedEntry: (e) => (
              <SiteEntryBody
                entry={e}
                depth={1}
                contentTypesById={contentTypesById}
                entryById={entryById}
                assetById={assetById}
                skipDisplayField={false}
              />
            ),
          }}
        />
      ) : (
        <div className="site-home-muted">Add Body rich text to your blog post to see it here.</div>
      )}
    </article>
  );
}

function SiteEntryBody({ entry, depth, contentTypesById, entryById, assetById, onOpenEntry, skipDisplayField }) {
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
        onOpenEntry={onOpenEntry}
      />
    );
  });

  if (depth > 0) {
    const t = entryTitle(entry, contentTypesById);
    const snippet = entrySnippet(entry);
    const kicker = ct?.name || "Block";
    return (
      <EntryCard title={t} kicker={kicker} onOpen={onOpenEntry ? () => onOpenEntry(entry) : null}>
        {snippet ? <p className="site-preview-card-snippet">{snippet.slice(0, 220)}{snippet.length > 220 ? "…" : ""}</p> : null}
        {inner}
      </EntryCard>
    );
  }

  return <div className="site-preview-sections">{inner}</div>;
}

function SiteField({ fieldDef, value, depth, contentTypesById, entryById, assetById, onOpenEntry }) {
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
          onOpenEntry={onOpenEntry}
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
          <p className="site-preview-muted">Unresolved link (not in include graph). Fetching…</p>
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
          onOpenEntry={onOpenEntry}
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
                  onOpenEntry={onOpenEntry}
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
