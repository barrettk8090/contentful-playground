/** CDA / CPA REST fetch — the main API used throughout the app. */
export async function cfFetch(config, path, usePreview = false) {
  const base = usePreview ? config.cpaBase : config.cdaBase;
  const token = usePreview ? config.cpaToken : config.cdaToken;
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Contentful ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Content Management API fetch — requires VITE_CONTENTFUL_CMA_TOKEN.
 * Used only for reading environment lists (read-only calls).
 */
export async function cfCmaFetch(config, path) {
  if (!config.cmaToken) throw new Error("No CMA token configured (VITE_CONTENTFUL_CMA_TOKEN)");
  const res = await fetch(`${config.cmaBase}${path}`, {
    headers: { Authorization: `Bearer ${config.cmaToken}` },
  });
  if (!res.ok) throw new Error(`Contentful CMA ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * GraphQL Content API fetch — uses the CDA token (or CPA token for preview).
 * Endpoint: graphql.contentful.com
 */
export async function cfGraphQL(config, query, usePreview = false) {
  const token = usePreview ? config.cpaToken : config.cdaToken;
  const res = await fetch(config.graphqlBase, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}: ${res.statusText}`);
  return res.json();
}
