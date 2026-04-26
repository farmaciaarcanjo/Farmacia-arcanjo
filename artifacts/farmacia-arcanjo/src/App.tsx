import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatbotLara from "@/pages/ChatbotLara";
import InstagramGenerator from "@/pages/InstagramGenerator";
import Catalogo from "@/pages/Catalogo";
import { trackVisita } from "@/lib/analytics";

const queryClient = new QueryClient();

const TABS = [
  { id: "chatbot", label: "Lara", shortLabel: "Lara", emoji: "💬", description: "Atendimento virtual" },
  { id: "instagram", label: "Instagram", shortLabel: "Posts", emoji: "📱", description: "Gerador de posts" },
  { id: "catalogo", label: "Catálogo", shortLabel: "Catálogo", emoji: "🏪", description: "Medicamentos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("chatbot");
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [mostrarInstalar, setMostrarInstalar] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const installDismissed = useRef(false);

  useEffect(() => { trackVisita(); }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      if (!installDismissed.current) setMostrarInstalar(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function instalarApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setMostrarInstalar(false);
      setInstallPrompt(null);
    }
  }

  function dispensarInstalar() {
    installDismissed.current = true;
    setMostrarInstalar(false);
  }

  async function compartilhar() {
    const url = window.location.href;
    const texto = "💊 Farmácia Arcanjo — Meruoca-CE\nAtendimento virtual com a Lara, catálogo de medicamentos e pedidos pelo WhatsApp!\n";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Farmácia Arcanjo", text: texto, url });
      } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="text-white px-4 pt-3 pb-0 shadow-md" style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 pb-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
              ⚕️
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base leading-tight">Farmácia Arcanjo</h1>
              <p className="text-primary-foreground/70 text-xs">Meruoca - CE</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={compartilhar}
                title="Compartilhar app"
                className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-90"
              >
                {copiado ? "✅" : "🔗"}
              </button>
            </div>
          </div>

          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-white text-white"
                    : "border-transparent text-primary-foreground/60 hover:text-primary-foreground/80"
                }`}
              >
                <span className="text-base">{tab.emoji}</span>
                <span>{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Banner de instalação PWA */}
      {mostrarInstalar && (
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm border border-blue-200" style={{ background: "#e3f2fd" }}>
            <span className="text-2xl shrink-0">📲</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-900">Instalar app na tela inicial</p>
              <p className="text-[11px] text-blue-700">Acesse mais rápido, sem precisar abrir o navegador!</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={instalarApp}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95"
                style={{ background: "#1565c0" }}
              >
                Instalar
              </button>
              <button
                onClick={dispensarInstalar}
                className="text-xs text-blue-400 hover:text-blue-600 px-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 h-full">
          {activeTab === "chatbot" && (
            <div className="h-[calc(100vh-140px)] flex flex-col rounded-xl border border-border overflow-hidden shadow-md bg-card">
              <ChatbotLara onNavigateTab={(tab) => setActiveTab(tab as "chatbot" | "instagram" | "catalogo")} />
            </div>
          )}
          {activeTab === "instagram" && (
            <div className="pb-6">
              <InstagramGenerator />
            </div>
          )}
          {activeTab === "catalogo" && (
            <div className="pb-6">
              <Catalogo />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-card border-t border-border py-2">
        <p className="text-center text-[10px] text-muted-foreground">
          Farmácia Arcanjo · Rua Dom José, 135 — Centro, Meruoca-CE
        </p>
        <p className="text-center text-[10px] text-muted-foreground">
          WhatsApp (88) 99337-5650
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
