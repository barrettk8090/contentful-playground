import { useState, useEffect, useCallback, useMemo } from "react";
import { getContentfulConfig } from "./config/contentfulEnv";
import { cfFetch } from "./api/contentfulClient";
import { MissingConfig } from "./components/MissingConfig";
import { ExplorerHeader } from "./components/ExplorerHeader";
import { ExplorerNav } from "./components/ExplorerNav";
import { ContentTypesView } from "./components/ContentTypesView";
import { EntriesView } from "./components/EntriesView";
import { LearnView } from "./components/LearnView";
import "./styles/explorer.css";

export default function ContentfulExplorer() {
  const config = useMemo(() => getContentfulConfig(), []);

  const [view, setView] = useState("types");
  const [usePreview, setUsePreview] = useState(false);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [learnSection, setLearnSection] = useState(0);

  const fetchTypes = useCallback(async () => {
    if (!config.ok) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cfFetch(config, "/content_types?order=sys.createdAt", usePreview);
      setContentTypes(data.items || []);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [config, usePreview]);

  const fetchEntries = useCallback(
    async (typeId) => {
      if (!config.ok) return;
      setLoading(true);
      setError(null);
      try {
        const data = await cfFetch(config, `/entries?content_type=${typeId}&limit=25`, usePreview);
        setEntries(data.items || []);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    },
    [config, usePreview]
  );

  useEffect(() => {
    if (!config.ok) return;
    const id = setTimeout(() => {
      fetchTypes();
    }, 0);
    return () => clearTimeout(id);
  }, [config.ok, fetchTypes]);

  useEffect(() => {
    if (!selectedType || !config.ok) return;
    const typeId = selectedType.sys.id;
    const id = setTimeout(() => {
      fetchEntries(typeId);
    }, 0);
    return () => clearTimeout(id);
  }, [selectedType, fetchEntries, config.ok]);

  const handleSelectType = (ct) => {
    setSelectedType(ct);
    setSelectedEntry(null);
    setView("entries");
  };

  if (!config.ok) {
    return <MissingConfig missing={config.missing} />;
  }

  return (
    <div className="contentful-explorer">
      <ExplorerHeader
        spaceId={config.spaceId}
        usePreview={usePreview}
        onTogglePreview={() => setUsePreview((p) => !p)}
      />

      <ExplorerNav view={view} onViewChange={setView} />

      {error && (
        <div
          style={{
            margin: "16px 24px",
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
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ex-muted)" }}>
          <div className="ex-spinner" />
          Loading…
        </div>
      )}

      {view === "types" && !loading && (
        <ContentTypesView
          contentTypes={contentTypes}
          onRefresh={fetchTypes}
          onSelectType={handleSelectType}
        />
      )}

      {view === "entries" && !loading && (
        <EntriesView
          contentTypes={contentTypes}
          selectedType={selectedType}
          onSelectType={(ct) => {
            setSelectedType(ct);
            setSelectedEntry(null);
          }}
          entries={entries}
          selectedEntry={selectedEntry}
          onSelectEntry={setSelectedEntry}
          usePreview={usePreview}
        />
      )}

      {view === "learn" && <LearnView learnSection={learnSection} onLearnSectionChange={setLearnSection} />}
    </div>
  );
}
