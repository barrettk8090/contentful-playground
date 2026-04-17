import { useState, useEffect, useCallback, useMemo } from "react";
import { getContentfulConfig } from "./config/contentfulEnv";
import { cfFetch, cfCmaFetch } from "./api/contentfulClient";
import { MissingConfig } from "./components/MissingConfig";
import { ExplorerHeader } from "./components/ExplorerHeader";
import { ExplorerNav } from "./components/ExplorerNav";
import { ContentTypesView } from "./components/ContentTypesView";
import { EntriesView } from "./components/EntriesView";
import { AssetsView } from "./components/AssetsView";
import { GraphQLView } from "./components/GraphQLView";
import { LearnView } from "./components/LearnView";
import { SitePreviewView } from "./components/SitePreviewView";
import "./styles/explorer.css";

export default function ContentfulExplorer() {
  // activeEnvironment: null = use default from .env, string = override
  const [activeEnvironment, setActiveEnvironment] = useState(null);
  const config = useMemo(() => getContentfulConfig(activeEnvironment), [activeEnvironment]);

  const [view, setView] = useState("types");
  const [usePreview, setUsePreview] = useState(false);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [learnSection, setLearnSection] = useState(0);
  const [locales, setLocales] = useState([]);
  const [selectedLocale, setSelectedLocale] = useState(null);
  const [environments, setEnvironments] = useState([]);

  const fetchLocales = useCallback(async () => {
    if (!config.ok) return;
    try {
      const data = await cfFetch(config, "/locales", false);
      const items = data.items || [];
      setLocales(items);
      const defaultLocale = items.find((l) => l.default) || items[0];
      if (defaultLocale) setSelectedLocale(defaultLocale.code);
    } catch {
      // locales are non-critical; silently ignore
    }
  }, [config]);

  const fetchEnvironments = useCallback(async () => {
    if (!config.ok || !config.cmaToken) return;
    try {
      const data = await cfCmaFetch(config, "/environments");
      setEnvironments(data.items || []);
    } catch {
      // non-critical; CMA token may lack permissions
    }
  }, [config]);

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
        const data = await cfFetch(config, `/entries?content_type=${typeId}&limit=25&locale=*`, usePreview);
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
      fetchLocales();
      fetchEnvironments();
    }, 0);
    return () => clearTimeout(id);
  }, [config.ok, fetchTypes, fetchLocales, fetchEnvironments]);

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

  const handleEnvironmentChange = (envId) => {
    // Clear type/entry selection immediately when switching environments,
    // since content types differ per environment
    setSelectedType(null);
    setSelectedEntry(null);
    setEntries([]);
    setActiveEnvironment(envId === config.environment && !activeEnvironment ? null : envId);
  };

  if (!config.ok) {
    return <MissingConfig missing={config.missing} />;
  }

  return (
    <div className="contentful-explorer">
      <ExplorerHeader
        spaceId={config.spaceId}
        environment={config.environment}
        environments={environments}
        hasCmaToken={!!config.cmaToken}
        onEnvironmentChange={handleEnvironmentChange}
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
          config={config}
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
          locales={locales}
          selectedLocale={selectedLocale}
          onLocaleChange={setSelectedLocale}
        />
      )}

      {view === "assets" && <AssetsView config={config} usePreview={usePreview} />}

      {view === "graphql" && (
        <GraphQLView config={config} contentTypes={contentTypes} usePreview={usePreview} />
      )}

      {view === "site" && !loading && (
        <SitePreviewView config={config} contentTypes={contentTypes} usePreview={usePreview} />
      )}

      {view === "learn" && <LearnView learnSection={learnSection} onLearnSectionChange={setLearnSection} />}
    </div>
  );
}
