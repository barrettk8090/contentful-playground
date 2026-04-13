function required(name) {
  const v = import.meta.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Reads Contentful credentials from Vite env (VITE_* are exposed to the client).
 * Never commit real tokens; use .env locally (see .env.example).
 */
export function getContentfulConfig() {
  const spaceId = required("VITE_CONTENTFUL_SPACE_ID");
  const cdaToken = required("VITE_CONTENTFUL_CDA_TOKEN");
  const cpaToken = required("VITE_CONTENTFUL_CPA_TOKEN");
  const envRaw = import.meta.env.VITE_CONTENTFUL_ENVIRONMENT;
  const environment =
    typeof envRaw === "string" && envRaw.trim() !== "" ? envRaw.trim() : "master";

  const missing = [];
  if (!spaceId) missing.push("VITE_CONTENTFUL_SPACE_ID");
  if (!cdaToken) missing.push("VITE_CONTENTFUL_CDA_TOKEN");
  if (!cpaToken) missing.push("VITE_CONTENTFUL_CPA_TOKEN");

  if (missing.length > 0) {
    return { ok: false, missing, spaceId, environment };
  }

  const cdaBase = `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}`;
  const cpaBase = `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}`;

  return {
    ok: true,
    missing: [],
    spaceId,
    environment,
    cdaToken,
    cpaToken,
    cdaBase,
    cpaBase,
  };
}
