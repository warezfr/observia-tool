import { useEffect, useState, type ComponentType } from "react";
import { useAIProviders } from "../contexts/AIProvidersContext";
import type { AIProviderCreate, AIProviderType } from "../types";
import {
  Brain,
  Cloud,
  Cpu,
  Database,
  Globe,
  Key,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";

const PROVIDER_MODELS: Record<AIProviderType, string[]> = {
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-4"],
  anthropic: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  gemini: ["gemini-1.5-pro", "gemini-1.5-flash"],
  azure_openai: ["gpt-4o", "gpt-4-turbo"],
  aws_bedrock: ["anthropic.claude-3-5-sonnet-20241022-v2:0", "amazon.titan-text-express-v1"],
  ollama: ["llama3", "mistral", "mixtral"],
};

type ProviderPreset = {
  id: string;
  title: string;
  subtitle: string;
  provider_type: AIProviderType;
  icon: ComponentType<{ className?: string }>;
  defaults: Partial<AIProviderCreate>;
};

const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: "openai", title: "OpenAI", subtitle: "api.openai.com (or compatible)", provider_type: "openai", icon: Sparkles, defaults: { name: "OpenAI", provider_type: "openai", model: "gpt-4o", endpoint: "https://api.openai.com/v1", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "openai-compatible", title: "OpenAI compatible", subtitle: "proxy / gateway / self-hosted", provider_type: "openai", icon: Globe, defaults: { name: "OpenAI compatible", provider_type: "openai", model: "gpt-4o", endpoint: "https://your-endpoint.example.com/v1", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "anthropic", title: "Anthropic", subtitle: "api.anthropic.com (or custom)", provider_type: "anthropic", icon: Brain, defaults: { name: "Anthropic", provider_type: "anthropic", model: "claude-sonnet-4-6", endpoint: "https://api.anthropic.com", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "gemini", title: "Google Gemini", subtitle: "AI Studio / Vertex", provider_type: "gemini", icon: Wand2, defaults: { name: "Gemini", provider_type: "gemini", model: "gemini-1.5-pro", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "azure-openai", title: "Azure OpenAI", subtitle: "resource.openai.azure.com", provider_type: "azure_openai", icon: Cloud, defaults: { name: "Azure OpenAI", provider_type: "azure_openai", model: "gpt-4o", endpoint: "https://<resource>.openai.azure.com", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "bedrock", title: "AWS Bedrock", subtitle: "Claude / Titan / etc.", provider_type: "aws_bedrock", icon: Database, defaults: { name: "AWS Bedrock", provider_type: "aws_bedrock", model: "anthropic.claude-3-5-sonnet-20241022-v2:0", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
  { id: "ollama", title: "Ollama", subtitle: "local / LAN", provider_type: "ollama", icon: Cpu, defaults: { name: "Ollama", provider_type: "ollama", model: "llama3", endpoint: "http://localhost:11434", extra_config: {}, api_key: "", is_default: false, fallback_order: 1 } },
];

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent";

export default function AIProviders() {
  const { providers, loading, fetchProviders, createProvider, deleteProvider, detectModels } = useAIProviders();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<AIProviderCreate>({
    name: "",
    provider_type: "anthropic",
    model: "claude-sonnet-4-6",
    api_key: "",
    is_default: false,
    fallback_order: 1,
  });
  const [error, setError] = useState("");
  const [detectedModels, setDetectedModels] = useState<string[] | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createProvider(form);
      setShowForm(false);
      setForm({ name: "", provider_type: "anthropic", model: "claude-sonnet-4-6", api_key: "", is_default: false, fallback_order: 1 });
      setDetectedModels(null);
    } catch {
      setError("Failed to save provider.");
    } finally {
      setSubmitting(false);
    }
  };

  const applyPreset = (preset: ProviderPreset) => {
    setError("");
    setShowForm(true);
    const defaults = preset.defaults;
    setDetectedModels(null);
    setForm({
      name: defaults.name ?? preset.title,
      provider_type: preset.provider_type,
      model: defaults.model ?? PROVIDER_MODELS[preset.provider_type][0],
      api_key: defaults.api_key ?? "",
      endpoint: defaults.endpoint,
      extra_config: defaults.extra_config ?? {},
      is_default: defaults.is_default ?? false,
      fallback_order: defaults.fallback_order ?? 1,
    });
  };

  const needsEndpoint =
    form.provider_type === "openai" ||
    form.provider_type === "anthropic" ||
    form.provider_type === "azure_openai" ||
    form.provider_type === "ollama";
  const endpointLabel =
    form.provider_type === "openai"
      ? "Base URL (OpenAI compatible)"
      : form.provider_type === "anthropic"
        ? "Endpoint (optional)"
        : form.provider_type === "azure_openai"
          ? "Azure endpoint (resource URL)"
          : form.provider_type === "ollama"
            ? "Ollama base URL"
            : "Endpoint";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">AI Providers</h1>
        <p className="text-fg-muted text-sm mt-1">Configure the models that power your analyses</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROVIDER_PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left bg-surface border border-border hover:border-accent-ring hover:shadow-soft rounded-xl p-4 flex items-start gap-3 transition-all"
            >
              <div className="mt-0.5 h-9 w-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-fg truncate">{p.title}</div>
                <div className="text-xs text-fg-muted truncate">{p.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {showForm && (
        <Card title="Configure provider">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Display Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            <select
              value={form.provider_type}
              onChange={(e) => {
                const t = e.target.value as AIProviderType;
                setDetectedModels(null);
                setForm((f) => ({ ...f, provider_type: t, model: PROVIDER_MODELS[t][0] }));
              }}
              className={inputClass}
            >
              {Object.keys(PROVIDER_MODELS).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className={inputClass}>
              {(detectedModels ?? PROVIDER_MODELS[form.provider_type]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {needsEndpoint && (
              <div className="space-y-1">
                <label className="text-xs text-fg-muted flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  {endpointLabel}
                </label>
                <input
                  placeholder={form.provider_type === "openai" ? "https://api.openai.com/v1" : "https://…"}
                  value={form.endpoint ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
                  className={inputClass}
                />
                {form.provider_type === "openai" && (
                  <p className="text-xs text-fg-muted">
                    For OpenAI-compatible endpoints, use a base URL that usually includes <span className="font-mono">/v1</span>.
                  </p>
                )}
              </div>
            )}

            <label className="text-xs text-fg-muted flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key / Token
            </label>
            <input
              type="password"
              placeholder="API Key (leave empty for Ollama)"
              value={form.api_key}
              onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
              className={inputClass}
            />

            {form.provider_type === "openai" && (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-fg-muted">
                  Auto-detection via <span className="font-mono">GET /v1/models</span>.
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={detecting}
                  disabled={detecting || !form.endpoint || !form.api_key}
                  onClick={async () => {
                    setError("");
                    setDetecting(true);
                    setDetectedModels(null);
                    try {
                      const { models } = await detectModels({ endpoint: form.endpoint ?? "", api_key: form.api_key ?? "" });
                      setDetectedModels(models);
                      if (models[0]) setForm((f) => ({ ...f, model: models[0] }));
                    } catch (e: any) {
                      const detail = e?.response?.data?.detail;
                      setError(typeof detail === "string" ? detail : "Failed to detect models.");
                    } finally {
                      setDetecting(false);
                    }
                  }}
                >
                  Detect models
                </Button>
              </div>
            )}
            <input
              type="number"
              placeholder="Fallback order (1 = highest priority)"
              value={form.fallback_order}
              onChange={(e) => setForm((f) => ({ ...f, fallback_order: Number(e.target.value) }))}
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="accent-[rgb(var(--accent))]"
              />
              Set as default provider
            </label>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={submitting}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!loading && providers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Brain size={40} className="text-fg-muted" />}
            title="No AI providers configured"
            description="Pick a preset above or add a provider to enable analyses."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {providers.map((p) => (
            <Card key={p.id} bodyClassName="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-fg flex items-center gap-2">
                    {p.name}
                    {p.is_default && <Badge variant="success">Default</Badge>}
                  </div>
                  <div className="text-sm text-fg-muted">
                    {p.provider_type} / {p.model}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5">Fallback order: {p.fallback_order}</div>
                </div>
                <button
                  onClick={() => deleteProvider(p.id)}
                  title="Delete provider"
                  className="p-2 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
