import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChatbotLara from "@/pages/ChatbotLara";
import InstagramGenerator from "@/pages/InstagramGenerator";
import Catalogo from "@/pages/Catalogo";
import { trackVisita } from "@/lib/analytics";

const queryClient = new QueryClient();

const TABS = [
  {
    id: "chatbot",
    label: "Lara",
    shortLabel: "Lara",
    emoji: "💬",
    description: "Atendimento virtual",
  },
  {
    id: "instagram",
    label: "Instagram",
    shortLabel: "Posts",
    emoji: "📱",
    description: "Gerador de posts",
  },
  {
    id: "catalogo",
    label: "Catálogo",
    shortLabel: "Catálogo",
    emoji: "🏪",
    description: "Medicamentos",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("chatbot");

  useEffect(() => { trackVisita(); }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="text-white px-4 pt-3 pb-0 shadow-md" style={{ background: "linear-gradient(135deg, #0d47a1, #1565c0)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 pb-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
              ⚕️
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">Farmácia Arcanjo</h1>
              <p className="text-primary-foreground/70 text-xs">Meruoca - CE</p>
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
