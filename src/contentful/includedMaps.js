import { unwrapLocalized } from "./localized";

export function mergeIncludedMaps(json) {
  const entryById = {};
  const assetById = {};

  const addEntry = (e) => {
    if (e?.sys?.id) entryById[e.sys.id] = e;
  };

  for (const item of json.items || []) addEntry(item);
  if (json.sys?.type === "Entry") addEntry(json);
  for (const e of json.includes?.Entry || []) addEntry(e);
  for (const a of json.includes?.Asset || []) {
    if (a?.sys?.id) assetById[a.sys.id] = a;
  }

  return { entryById, assetById };
}

export function getAssetUrl(asset) {
  const file = unwrapLocalized(asset?.fields?.file);
  const raw = file?.url;
  if (!raw || typeof raw !== "string") return null;
  return raw.startsWith("//") ? `https:${raw}` : raw;
}

export function resolveLink(link, entryById, assetById) {
  if (!link?.sys || link.sys.type !== "Link") return null;
  if (link.sys.linkType === "Entry") {
    const entity = entryById[link.sys.id];
    return entity ? { kind: "entry", entity } : null;
  }
  if (link.sys.linkType === "Asset") {
    const entity = assetById[link.sys.id];
    return entity ? { kind: "asset", entity } : null;
  }
  return null;
}
