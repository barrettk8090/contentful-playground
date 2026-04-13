export const lessons = [
  {
    title: "Content Types",
    emoji: "🧱",
    body: `A Content Type is like a blueprint or schema. It defines the shape of your content — what fields exist, what types they are, and what validations apply.\n\nThink of it like a database table definition. A "Blog Post" content type might have fields for title, body, slug, author, and a featured image.\n\nYou create content types in the Contentful web app under Content model. Every entry you create is an instance of a content type.`,
  },
  {
    title: "Fields & Field Types",
    emoji: "📐",
    body: `Each content type is made up of fields. Contentful supports these field types:\n\n• Short text (Symbol) — titles, slugs, tags\n• Long text (Text) — plain text blocks\n• Rich Text — structured WYSIWYG content with embedded entries/assets\n• Number / Integer — numeric values\n• Date & Time — timestamps\n• Boolean — true/false toggles\n• Media (Link to Asset) — images, PDFs, videos\n• Reference (Link to Entry) — relationships between entries\n• JSON Object — arbitrary structured data\n• Location — lat/lng coordinates\n\nFields can have validations like required, unique, regex patterns, size limits, and more.`,
  },
  {
    title: "Entries & Publishing",
    emoji: "📝",
    body: `An Entry is a single piece of content created from a content type — like one blog post, one author profile, etc.\n\nEntries have a lifecycle:\n1. Draft — just created, not visible via the Delivery API\n2. Changed — published before but has unpublished edits\n3. Published — live and available via the Delivery API\n4. Archived — hidden from default views\n\nThis lifecycle is what makes the Preview vs. Delivery API distinction so powerful. Your editors can work on drafts that are visible in a preview environment but invisible to production users.`,
  },
  {
    title: "Delivery vs. Preview API",
    emoji: "🔀",
    body: `Contentful gives you two read APIs:\n\n• Content Delivery API (CDA) — cached, fast CDN. Only returns published entries. This is what your production site uses.\n\n• Content Preview API (CPA) — returns ALL entries including drafts and unpublished changes. Slower, not cached. Used for preview/staging environments.\n\nBoth APIs have the exact same interface — the only difference is the base URL and token. That's why the toggle in this app is so simple: we just swap the base URL and auth token.\n\nThis means you can build one frontend and show different content depending on the context.`,
  },
  {
    title: "Environments",
    emoji: "🌿",
    body: `Environments let you branch your entire content model (and optionally content) — like Git branches for your CMS.\n\nEvery space starts with a "master" environment. You can create new environments to:\n\n• Test content model changes without affecting production\n• Stage migrations before applying them\n• Let different teams work in isolation\n\nEnvironments are accessed via the API URL path:\n/spaces/{id}/environments/master\n/spaces/{id}/environments/staging\n\nWhen you're happy with changes in a non-master environment, you can alias it to master or merge manually.`,
  },
  {
    title: "Localization",
    emoji: "🌍",
    body: `Contentful has built-in localization. You define which locales your space supports (e.g., en-US, es, fr) and which fields are localizable.\n\nWhen you fetch entries, you can request a specific locale:\n/entries?locale=es\n\nOr get all locales at once:\n/entries?locale=*\n\nNon-localized fields return the same value regardless of locale. This lets you mix — maybe your slug is universal but your title and body are translated.\n\nSet up locales under Settings → Locales in the web app.`,
  },
];
