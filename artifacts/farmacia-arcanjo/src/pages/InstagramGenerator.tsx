import { useState } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const POST_TYPES = [
  { value: "promocao", label: "Promoção / Oferta" },
  { value: "dica_saude", label: "Dica de Saúde" },
  { value: "produto", label: "Apresentação de Produto" },
  { value: "conscientizacao", label: "Conscientização / Campanha" },
  { value: "novidade", label: "Novidade na Farmácia" },
  { value: "feriado", label: "Feriado / Data Especial" },
];

const TONES = [
  { value: "animado", label: "Animado e Energético" },
  { value: "informativo", label: "Informativo e Sério" },
  { value: "amigavel", label: "Amigável e Acolhedor" },
  { value: "urgente", label: "Urgente (promoção relâmpago)" },
];

interface GeneratedPost {
  caption: string;
  hashtags: string;
  suggestion: string;
}

export default function InstagramGenerator() {
  const [postType, setPostType] = useState("promocao");
  const [tone, setTone] = useState("amigavel");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedPost | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);

    const postTypeLabel = POST_TYPES.find((p) => p.value === postType)?.label;
    const toneLabel = TONES.find((t) => t.value === tone)?.label;

    const prompt = `Você é um especialista em marketing digital para farmácias.
Crie um post para o Instagram da Farmácia Arcanjo, localizada em Meruoca-CE.

Tipo de post: ${postTypeLabel}
Tom: ${toneLabel}
Tema/Produto/Assunto: ${topic}

Responda EXATAMENTE neste formato JSON (sem nenhum texto fora do JSON):
{
  "caption": "Texto completo do post com emojis relevantes, máximo 300 caracteres, chamativo e engajante",
  "hashtags": "#farmáciaarcanjo #meruoca #saúde [mais 8-10 hashtags relevantes separadas por espaço]",
  "suggestion": "Uma dica rápida de como melhorar o engajamento deste post (máximo 80 caracteres)"
}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 600 },
          }),
        }
      );

      if (!response.ok) throw new Error("Erro na API");

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Formato inválido");

      const parsed: GeneratedPost = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch {
      setResult({
        caption:
          "Não foi possível gerar o post. Verifique sua conexão e tente novamente.",
        hashtags: "",
        suggestion: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📱</span>
          <h2 className="font-semibold text-foreground">Gerador de Posts</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Crie legendas profissionais para o Instagram da Farmácia Arcanjo com IA
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Tipo de Post
          </label>
          <div className="grid grid-cols-2 gap-2">
            {POST_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setPostType(type.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                  postType === type.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Tom da Mensagem
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ${
                  tone === t.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Tema / Produto / Assunto
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Desconto de 20% em vitaminas e suplementos essa semana..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition-all"
          />
        </div>

        <button
          onClick={generate}
          disabled={!topic.trim() || loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Gerando...
            </span>
          ) : (
            "✨ Gerar Post"
          )}
        </button>
      </div>

      {result && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Legenda
              </span>
              <button
                onClick={() => copyToClipboard(result.caption, "caption")}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                {copied === "caption" ? "✓ Copiado!" : "Copiar"}
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {result.caption}
            </p>
          </div>

          {result.hashtags && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Hashtags
                </span>
                <button
                  onClick={() => copyToClipboard(result.hashtags, "hashtags")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  {copied === "hashtags" ? "✓ Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-primary leading-relaxed">
                {result.hashtags}
              </p>
            </div>
          )}

          {result.suggestion && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 flex items-start gap-2">
              <span className="text-base mt-0.5">💡</span>
              <p className="text-xs text-foreground">{result.suggestion}</p>
            </div>
          )}

          <button
            onClick={() =>
              copyToClipboard(
                `${result.caption}\n\n${result.hashtags}`,
                "all"
              )
            }
            className="w-full py-2.5 rounded-xl border border-primary text-primary font-semibold text-sm hover:bg-primary/5 active:scale-[0.98] transition-all"
          >
            {copied === "all" ? "✓ Copiado!" : "Copiar Tudo"}
          </button>
        </div>
      )}
    </div>
  );
}
