import { useState, useEffect, useMemo } from "react";
import { cfFetch } from "../api/contentfulClient";
import { unwrapLocalized } from "../contentful/localized";

const FORMATS = ["", "jpg", "png", "webp", "gif", "avif"];
const FIT_MODES = ["", "pad", "fill", "scale", "crop", "thumb"];
const FOCUS_AREAS = [
  "", "center", "top", "right", "left", "bottom",
  "top_right", "top_left", "bottom_right", "bottom_left", "face", "faces",
];

function buildImageUrl(baseUrl, params) {
  const search = new URLSearchParams();
  if (params.w) search.set("w", params.w);
  if (params.h) search.set("h", params.h);
  if (params.fm) search.set("fm", params.fm);
  if (params.q && (params.fm === "jpg" || params.fm === "webp" || params.fm === "")) search.set("q", params.q);
  if (params.fit) search.set("fit", params.fit);
  if (params.f && params.fit) search.set("f", params.f);
  const qs = search.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function ParamRow({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ex-text)" }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: "var(--ex-muted)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SliderControl({ value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value || min}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--ex-accent)" }}
      />
      <button
        type="button"
        onClick={() => onChange(0)}
        style={{
          background: value ? "var(--ex-surface2)" : "transparent",
          border: "1px solid var(--ex-border)",
          borderRadius: 5,
          color: value ? "var(--ex-text)" : "var(--ex-muted)",
          cursor: "pointer",
          fontSize: 12,
          padding: "2px 8px",
          fontFamily: "inherit",
          minWidth: 54,
          textAlign: "center",
        }}
      >
        {value ? `${value}${unit}` : "off"}
      </button>
    </div>
  );
}

function SelectControl({ value, onChange, options, placeholder = "off" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "7px 12px",
        borderRadius: 7,
        border: "1px solid var(--ex-border)",
        background: "var(--ex-surface2)",
        color: "var(--ex-text)",
        fontSize: 13,
        fontFamily: "inherit",
        width: "100%",
      }}
    >
      <option value="">{placeholder}</option>
      {options.filter(Boolean).map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function AssetsView({ config, usePreview }) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ w: 0, h: 0, fm: "", q: 80, fit: "", f: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cfFetch(config, "/assets?limit=50&locale=*", usePreview)
      .then((data) => {
        if (cancelled) return;
        const images = (data.items || []).filter((a) => {
          const file = unwrapLocalized(a?.fields?.file);
          return file?.contentType?.startsWith("image/");
        });
        setAssets(images);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [config, usePreview]);

  const setParam = (key, val) => setParams((p) => ({ ...p, [key]: val }));

  const assetFile = useMemo(() => {
    if (!selectedAsset) return null;
    return unwrapLocalized(selectedAsset.fields?.file);
  }, [selectedAsset]);

  const baseUrl = useMemo(() => {
    if (!assetFile?.url) return null;
    const raw = assetFile.url;
    return raw.startsWith("//") ? `https:${raw}` : raw;
  }, [assetFile]);

  const transformedUrl = useMemo(() => {
    if (!baseUrl) return null;
    return buildImageUrl(baseUrl, params);
  }, [baseUrl, params]);

  const handleCopy = () => {
    if (!transformedUrl) return;
    navigator.clipboard.writeText(transformedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setParams({ w: 0, h: 0, fm: "", q: 80, fit: "", f: "" });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ex-text)", marginBottom: 4 }}>
          Images API Playground
        </div>
        <div style={{ fontSize: 13, color: "var(--ex-muted)", maxWidth: 640 }}>
          Contentful&apos;s Images API lets you transform any image asset on the fly using URL parameters — no
          image processing code needed. Adjust the controls to see the URL and preview update in real time.
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            background: "var(--ex-error-bg)",
            border: "1px solid var(--ex-error-border)",
            borderRadius: "var(--ex-radius)",
            color: "var(--ex-error-text)",
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ex-muted)" }}>
          <div className="ex-spinner" />
          Loading assets…
        </div>
      )}

      {!loading && assets.length === 0 && !error && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--ex-surface)",
            borderRadius: "var(--ex-radius)",
            border: "1px dashed var(--ex-border)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🖼️</div>
          <div style={{ fontWeight: 600, color: "var(--ex-text)", marginBottom: 6 }}>No image assets found</div>
          <div style={{ color: "var(--ex-muted)", fontSize: 13 }}>
            Upload some images to your Contentful space to use the playground.
          </div>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
          {/* Asset list */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ex-muted)", marginBottom: 10 }}>
              {assets.length} image{assets.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {assets.map((asset) => {
                const file = unwrapLocalized(asset.fields?.file);
                const title = unwrapLocalized(asset.fields?.title) || file?.fileName || asset.sys.id;
                const thumbUrl = file?.url ? `https:${file.url}?w=80&h=60&fit=fill&f=center` : null;
                const isSelected = selectedAsset?.sys?.id === asset.sys.id;
                return (
                  <div
                    key={asset.sys.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectAsset(asset)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectAsset(asset);
                      }
                    }}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: isSelected ? "1px solid var(--ex-accent)" : "1px solid var(--ex-border)",
                      background: isSelected ? "var(--ex-surface2)" : "var(--ex-surface)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--ex-surface2)"; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--ex-surface)"; }}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt=""
                        style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 30, borderRadius: 4, background: "var(--ex-border)", flexShrink: 0 }} />
                    )}
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ex-text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {String(title)}
                      </div>
                      {file?.details?.image && (
                        <div style={{ fontSize: 10, color: "var(--ex-muted)" }}>
                          {file.details.image.width} × {file.details.image.height}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel */}
          {!selectedAsset && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                background: "var(--ex-surface)",
                borderRadius: "var(--ex-radius)",
                border: "1px dashed var(--ex-border)",
                alignSelf: "start",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>👈</div>
              <div style={{ fontWeight: 600, color: "var(--ex-text)", marginBottom: 6 }}>Select an image</div>
              <div style={{ color: "var(--ex-muted)", fontSize: 13 }}>
                Pick any image from the list to start experimenting with the Images API.
              </div>
            </div>
          )}

          {selectedAsset && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Preview */}
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
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--ex-border)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ex-text)",
                  }}
                >
                  {String(unwrapLocalized(selectedAsset.fields?.title) || assetFile?.fileName || selectedAsset.sys.id)}
                  {assetFile?.details?.image && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ex-muted)", marginLeft: 8 }}>
                      Original: {assetFile.details.image.width} × {assetFile.details.image.height}px
                      {" · "}
                      {(assetFile.details.size / 1024).toFixed(0)} KB
                      {" · "}
                      {assetFile.contentType}
                    </span>
                  )}
                </div>

                {/* Image preview — checkerboard shows transparency */}
                <div
                  style={{
                    padding: 20,
                    display: "flex",
                    justifyContent: "center",
                    background: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
                    minHeight: 200,
                    alignItems: "center",
                  }}
                >
                  {transformedUrl && (
                    <img
                      key={transformedUrl}
                      src={transformedUrl}
                      alt="transformed"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 400,
                        display: "block",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      }}
                    />
                  )}
                </div>

                {/* Generated URL */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ex-border)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ex-muted)" }}>
                      Generated URL
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        background: "var(--ex-surface2)",
                        border: "1px solid var(--ex-border)",
                        borderRadius: 5,
                        color: copied ? "#2ea88f" : "var(--ex-muted)",
                        cursor: "pointer",
                        fontSize: 11,
                        padding: "3px 10px",
                        fontFamily: "inherit",
                        fontWeight: 600,
                        transition: "color 0.15s",
                      }}
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <code
                    className="ex-mono"
                    style={{
                      display: "block",
                      fontSize: 11,
                      padding: "8px 12px",
                      background: "var(--ex-surface2)",
                      borderRadius: 6,
                      color: "var(--ex-text-secondary)",
                      wordBreak: "break-all",
                      lineHeight: 1.6,
                    }}
                  >
                    {transformedUrl ? (
                      <>
                        <span style={{ color: "var(--ex-muted)" }}>
                          {transformedUrl.split("?")[0]}
                        </span>
                        {transformedUrl.includes("?") && (
                          <span style={{ color: "var(--ex-accent)" }}>
                            ?{transformedUrl.split("?")[1]}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--ex-muted)" }}>No URL available</span>
                    )}
                  </code>
                </div>
              </div>

              {/* Controls */}
              <div
                style={{
                  background: "var(--ex-surface)",
                  borderRadius: "var(--ex-radius)",
                  border: "1px solid var(--ex-border)",
                  padding: 20,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ex-text)", marginBottom: 18 }}>
                  Transform Parameters
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
                  <ParamRow label="Width" hint={`?w=${params.w || "…"}`}>
                    <SliderControl
                      value={params.w}
                      onChange={(v) => setParam("w", v)}
                      min={0}
                      max={4000}
                      step={10}
                      unit="px"
                    />
                  </ParamRow>

                  <ParamRow label="Height" hint={`?h=${params.h || "…"}`}>
                    <SliderControl
                      value={params.h}
                      onChange={(v) => setParam("h", v)}
                      min={0}
                      max={4000}
                      step={10}
                      unit="px"
                    />
                  </ParamRow>

                  <ParamRow label="Format" hint="?fm=…">
                    <SelectControl
                      value={params.fm}
                      onChange={(v) => setParam("fm", v)}
                      options={FORMATS}
                      placeholder="original"
                    />
                  </ParamRow>

                  <ParamRow label="Quality" hint="?q=… (jpg/webp only)">
                    <SliderControl
                      value={params.q}
                      onChange={(v) => setParam("q", v)}
                      min={1}
                      max={100}
                      unit="%"
                    />
                  </ParamRow>

                  <ParamRow label="Fit" hint="?fit=…">
                    <SelectControl
                      value={params.fit}
                      onChange={(v) => { setParam("fit", v); if (!v) setParam("f", ""); }}
                      options={FIT_MODES}
                      placeholder="default (scale)"
                    />
                  </ParamRow>

                  <ParamRow label="Focus area" hint="?f=… (requires fit)">
                    <SelectControl
                      value={params.f}
                      onChange={(v) => setParam("f", v)}
                      options={FOCUS_AREAS}
                      placeholder="center"
                    />
                  </ParamRow>
                </div>

                {/* Fit mode explanations */}
                {params.fit && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "10px 14px",
                      background: "var(--ex-surface2)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--ex-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    {{
                      pad: "pad — Resize to fit within the bounding box, adding letterbox padding to fill remaining space. Use ?bg=rgb:RRGGBB to set the padding color.",
                      fill: "fill — Resize to completely fill the bounding box, cropping the image to fit.",
                      scale: "scale — Stretch or shrink to fit exactly. May distort the image.",
                      crop: "crop — Resize to fill, cropping excess. Respects the focus area (?f=) to pick which part to keep.",
                      thumb: "thumb — Like crop, but uses smart detection to keep the most relevant portion (great with ?f=face).",
                    }[params.fit]}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setParams({ w: 0, h: 0, fm: "", q: 80, fit: "", f: "" })}
                  style={{
                    marginTop: 16,
                    background: "none",
                    border: "1px solid var(--ex-border)",
                    borderRadius: 6,
                    color: "var(--ex-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "5px 14px",
                    fontFamily: "inherit",
                  }}
                >
                  Reset all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
