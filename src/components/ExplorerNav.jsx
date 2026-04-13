const TABS = [
  { id: "types", label: "Content Model", icon: "🧱" },
  { id: "entries", label: "Entries", icon: "📝" },
  { id: "site", label: "Site preview", icon: "🌐" },
  { id: "learn", label: "Learn", icon: "📚" },
];

export function ExplorerNav({ view, onViewChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--ex-border)",
        padding: "0 24px",
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onViewChange(tab.id)}
          style={{
            padding: "12px 20px",
            background: "none",
            border: "none",
            borderBottom: view === tab.id ? "2px solid var(--ex-accent)" : "2px solid transparent",
            color: view === tab.id ? "var(--ex-tab-active)" : "var(--ex-muted)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}
