function required(name) {
  const v = import.meta.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function optional(name) {
  const v = import.meta.env[name];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Reads Contentful credentials from Vite env (VITE_* are exposed to the client).
 * Never commit real tokens; use .env locally (see .env.example).
 *
 * @param {string|null} environmentOverride - When set, overrides VITE_CONTENTFUL_ENVIRONMENT.
 */
export function getContentfulConfig(environmentOverride = null) {
  const spaceId = required("VITE_CONTENTFUL_SPACE_ID");
  const cdaToken = required("VITE_CONTENTFUL_CDA_TOKEN");
  const cpaToken = required("VITE_CONTENTFUL_CPA_TOKEN");
  const cmaToken = optional("VITE_CONTENTFUL_CMA_TOKEN");

  const envRaw = import.meta.env.VITE_CONTENTFUL_ENVIRONMENT;
  const defaultEnvironment =
    typeof envRaw === "string" && envRaw.trim() !== "" ? envRaw.trim() : "master";

  const environment = environmentOverride ?? defaultEnvironment;

  const missing = [];
  if (!spaceId) missing.push("VITE_CONTENTFUL_SPACE_ID");
  if (!cdaToken) missing.push("VITE_CONTENTFUL_CDA_TOKEN");
  if (!cpaToken) missing.push("VITE_CONTENTFUL_CPA_TOKEN");

  if (missing.length > 0) {
    return { ok: false, missing, spaceId, environment };
  }

  return {
    ok: true,
    missing: [],
    spaceId,
    environment,
    cdaToken,
    cpaToken,
    cmaToken,
    cdaBase: `https://cdn.contentful.com/spaces/${spaceId}/environments/${environment}`,
    cpaBase: `https://preview.contentful.com/spaces/${spaceId}/environments/${environment}`,
    cmaBase: `https://api.contentful.com/spaces/${spaceId}`,
    graphqlBase: `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environment}`,
  };
}
