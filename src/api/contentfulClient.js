export async function cfFetch(config, path, usePreview = false) {
  const base = usePreview ? config.cpaBase : config.cdaBase;
  const token = usePreview ? config.cpaToken : config.cdaToken;
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Contentful ${res.status}: ${res.statusText}`);
  return res.json();
}
