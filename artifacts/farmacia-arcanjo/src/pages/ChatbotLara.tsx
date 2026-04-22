import { useState, useRef, useEffect } from "react";
import { PRODUTOS_INICIAIS, resumoCatalogo } from "../data/produtos";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GEMINI_API_KEY = "AIzaSyAY7F-FU-kwBS7WbwOGWSiU6OGu9sLFRtY";

const CATALOGO_TEXTO = resumoCatalogo(PRODUTOS_INICIAIS);

const PROMOCOES = PRODUTOS_INICIAIS.filter(
  (p) => typeof p.desc === "string" && p.desc.includes("PROMOÇÃO")
);

const MENSAGEM_BOAS_VINDAS =
  "Olá! Sou a Lara, assistente virtual da Farmácia Arcanjo 💊\n\n" +
  (PROMOCOES.length > 0
    ? "🔥 *Ofertas da Semana:*\n" +
      PROMOCOES.map(
        (p) => `• ${p.nome} — ${p.desc.replace("🔥 PROMOÇÃO: ", "")}`
      ).join("\n") +
      "\n\nComo posso te ajudar hoje? Posso indicar produtos pelo seu sintoma! 😊"
    : "Como posso te ajudar hoje?");

const SYSTEM_PROMPT = `Você é Lara, a assistente virtual da Farmácia Arcanjo, localizada em Meruoca-CE.
Você é simpática, prestativa, profissional e fala português brasileiro.

INFORMAÇÕES DA FARMÁCIA:
- Horários: Segunda a Sábado das 7h às 21h, Domingo das 8h às 14h
- Localização: Meruoca, Ceará
- WhatsApp: (88) 99337-5650

CATÁLOGO DE PRODUTOS DISPONÍVEIS (com preços):
${CATALOGO_TEXTO}

REGRAS IMPORTANTES:
1. Quando o cliente descrever um SINTOMA (ex: "dor de cabeça", "azia", "tô com cólica", "febre", "tontura", "alergia", "queimadura", "diarreia", "constipação", "gases", "pressão alta", "diabetes", "infecção", "tosse", "gripe"), recomende 2 ou 3 produtos do CATÁLOGO acima que sejam apropriados, sempre incluindo nome e preço.
2. Sempre destaque PROMOÇÕES quando aplicáveis (Nimesulida gotas: 2 por R$8, Losartana: 3 por R$10).
3. Após recomendar, oriente: "Pra fazer o pedido, vai na aba Catálogo ou chama no WhatsApp (88) 99337-5650 😊"
4. Se o cliente perguntar sobre um produto que NÃO está no catálogo, diga que vai consultar e oriente o WhatsApp.
5. NUNCA dê diagnósticos médicos. Para sintomas graves, persistentes ou em crianças, sempre recomende consultar médico ou farmacêutico.
6. Seja CONCISA (máximo 4-5 linhas), direta e simpática. Use 1 ou 2 emojis no máximo.
7. NÃO recomende antibióticos sem mencionar que precisam de prescrição médica.`;

export default function ChatbotLara() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: MENSAGEM_BOAS_VINDAS,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (textoOverride?: string) => {
    const trimmed = (textoOverride ?? input).trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: conversationHistory,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 512,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro na API");
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Desculpe, não consegui processar sua mensagem. Tente novamente.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Ops! Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente ou entre em contato pelo WhatsApp: (88) 99337-5650.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 rounded-t-xl">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
            L
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></span>
        </div>
        <div>
          <p className="font-semibold text-sm">Lara</p>
          <p className="text-xs text-primary-foreground/70">Assistente Virtual</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold mr-2 mt-1 shrink-0">
                L
              </div>
            )}
            <div
              className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-xs ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card text-foreground border border-border rounded-bl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === "user"
                    ? "text-primary-foreground/60 text-right"
                    : "text-muted-foreground"
                }`}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
              L
            </div>
            <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 mt-3 px-1">
            {[
              "🤕 Tô com dor de cabeça",
              "🔥 Azia e queimação",
              "💩 Tô com diarreia",
              "🤧 Sintomas de gripe",
              "💊 Quero ver as ofertas",
              "🕐 Qual o horário?",
            ].map((sugestao) => (
              <button
                key={sugestao}
                onClick={() => sendMessage(sugestao.replace(/^[^\s]+\s/, ""))}
                className="text-xs bg-card border border-primary/30 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all shadow-xs"
              >
                {sugestao}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-card border-t border-border rounded-b-xl">
        <div className="flex gap-2 items-end bg-muted rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px] py-1"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-95"
            aria-label="Enviar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Lara pode cometer erros. Consulte um farmacêutico para orientações específicas.
        </p>
      </div>
    </div>
  );
}
