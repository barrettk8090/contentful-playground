import { lessons } from "../content/learnLessons";

export function LearnView({ learnSection, onLearnSectionChange }) {
  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "var(--ex-text)" }}>
        Contentful Concepts
      </h2>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {lessons.map((l, i) => (
          <button
            key={l.title}
            type="button"
            onClick={() => onLearnSectionChange(i)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border:
                learnSection === i ? "1.5px solid var(--ex-accent)" : "1px solid var(--ex-border)",
              background: learnSection === i ? "var(--ex-accent-soft)" : "var(--ex-surface)",
              color: learnSection === i ? "var(--ex-text)" : "var(--ex-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {l.emoji} {l.title}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: 24,
          background: "var(--ex-surface)",
          borderRadius: "var(--ex-radius)",
          border: "1px solid var(--ex-border)",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: "var(--ex-text)" }}>
          {lessons[learnSection].emoji} {lessons[learnSection].title}
        </h3>
        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            fontSize: 14,
            color: "var(--ex-text-secondary)",
          }}
        >
          {lessons[learnSection].body}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button
          type="button"
          disabled={learnSection === 0}
          onClick={() => onLearnSectionChange(learnSection - 1)}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid var(--ex-border)",
            background: "var(--ex-surface)",
            color: learnSection === 0 ? "var(--ex-muted)" : "var(--ex-btn-ghost-text)",
            cursor: learnSection === 0 ? "default" : "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={learnSection === lessons.length - 1}
          onClick={() => onLearnSectionChange(learnSection + 1)}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid var(--ex-accent)",
            background: "var(--ex-accent-soft)",
            color: learnSection === lessons.length - 1 ? "var(--ex-muted)" : "var(--ex-btn-ghost-text)",
            cursor: learnSection === lessons.length - 1 ? "default" : "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
