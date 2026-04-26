import { useState, useRef, useEffect } from "react";
import { PRODUTOS_INICIAIS, calcularPreco, resumoCatalogo, type Produto } from "../data/produtos";
import { trackLaraMensagem, trackWhatsAppClick, trackProdutoAdicionado } from "../lib/analytics";
import { registrarInteracaoLara, registrarCliqueWhatsAppFirebase } from "../lib/firebase";

const LS_INTERACOES_KEY = "farmacia_interacoes_lara";
const LS_CLIQUES_KEY = "farmacia_cliques_whatsapp";

function salvarInteracaoLocal(sessao: string, primeiraMensagem: string, ts: number) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_INTERACOES_KEY) || "[]");
    arr.push({ sessao, primeiraMensagem, ts });
    localStorage.setItem(LS_INTERACOES_KEY, JSON.stringify(arr.slice(-500)));
  } catch {}
}

function salvarCliqueLocal(produtos: string[], ts: number, url: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_CLIQUES_KEY) || "[]");
    arr.push({ tipo: "clique_whatsapp", ts, produtos, url });
    localStorage.setItem(LS_CLIQUES_KEY, JSON.stringify(arr.slice(-500)));
  } catch {}
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  produtosDetectados?: Produto[];
  mostrarBotaoCatalogo?: boolean;
}

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const produtosSalvos = (() => {
  try { return JSON.parse(localStorage.getItem("farmacia_produtos_v3") || "[]"); }
  catch { return []; }
})();
const todosProdutos: Produto[] = [...PRODUTOS_INICIAIS, ...produtosSalvos];
const CATALOGO_TEXTO = resumoCatalogo(todosProdutos);
const PROMOCOES = todosProdutos.filter((p) => p.desc?.includes("PROMOÇÃO") || p.promocao);

const MENSAGEM_BOAS_VINDAS =
  "Olá! 👋 Sou a Lara, assistente virtual da Farmácia Arcanjo!\n" +
  "Posso te ajudar a encontrar medicamentos, tirar dúvidas e fazer pedidos.\n" +
  "Como posso te ajudar hoje? 💊";

const SYSTEM_PROMPT = `Você é Lara, a assistente virtual da Farmácia Arcanjo, localizada em Meruoca-CE.
Você é simpática, prestativa, profissional e fala português brasileiro.

INFORMAÇÕES DA FARMÁCIA:
- Horário: Segunda a Sábado das 7h às 19h. Aos domingos das 8h às 13h.
- Localização: Meruoca, Ceará
- Telefone/WhatsApp: (88) 99337-5650
- Entrega: Sim! Fazemos entrega. Ligue ou chame no WhatsApp.
- Pagamento: Aceitamos dinheiro, Pix, débito e crédito.

${CATALOGO_TEXTO}

REGRAS GERAIS:
1. Quando o cliente descrever um SINTOMA, recomende 2 ou 3 produtos do CATÁLOGO acima pelo nome EXATO, sempre incluindo nome e preço.
2. Sempre destaque promoções quando aplicáveis.
3. Após recomendar produto do catálogo, oriente: "Pra fazer o pedido, vai na aba Catálogo ou chama no WhatsApp (88) 99337-5650 😊"
4. Se o cliente perguntar sobre um produto que NÃO está no catálogo, oriente o WhatsApp.
5. NUNCA dê diagnósticos médicos. Para sintomas graves, recomende consultar médico ou farmacêutico.
6. Seja CONCISA (máximo 5-6 linhas), direta e simpática. Use 1 ou 2 emojis no máximo.
7. NÃO recomende antibióticos sem mencionar que precisam de prescrição médica.

REGRAS PARA PERGUNTAS SOBRE MEDICAMENTOS (bula, princípio ativo, posologia, indicação):
8. Você pode buscar o medicamento TANTO pelo nome comercial (ex: "Tylenol", "Buscopan") QUANTO pelo princípio ativo (ex: "paracetamol", "escopolamina").
9. Ao responder sobre um medicamento, estruture assim:
   💊 MEDICAMENTO: [nome comercial / princípio ativo]
   ✅ Indicação: [para que serve]
   📋 Posologia: [dose e frequência comum]
   (NÃO inclua contraindicações automaticamente — só inclua ⚠️ Contraindicações se o usuário perguntar diretamente)
   (SÓ inclua 🔴 Controlado: Sim ⚠️ se o medicamento FOR controlado/tarja vermelha/preta ou requerer receita — NUNCA escreva "Controlado: Não", apenas omita esse campo quando não for controlado)
10. Se o medicamento estiver no CATÁLOGO LOCAL, informe o preço e disponibilidade na farmácia.
11. Se NÃO encontrar o medicamento no catálogo local, informe que pode ser solicitado pelo WhatsApp e responda com o conhecimento farmacêutico geral.
12. OBRIGATÓRIO: TODA resposta sobre medicamentos (indicação, bula, posologia, interações) DEVE TERMINAR EXATAMENTE COM: "Consulte um farmacêutico para orientações completas."
13. Para interações medicamentosas, alerte claramente e sempre indique consulta ao farmacêutico ou médico.
14. Quando receber DADOS ANVISA no contexto, mencione: "✔️ Registro ANVISA confirmado" e use esses dados como referência oficial para nome e princípio ativo.`;

const RESPOSTAS_RAPIDAS: Array<{ padroes: RegExp; resposta: string }> = [
  {
    padroes: /hor[aá]rio|que horas|quando abre|quando fecha|funciona/i,
    resposta: "Funcionamos de segunda a sábado das 7h às 19h e domingos das 8h às 13h 🕐",
  },
  {
    padroes: /onde fica|endere[çc]o|localiza[çc]|como chegar/i,
    resposta: "Estamos em Meruoca, Ceará 📍 Tel: (88) 99337-5650",
  },
  {
    padroes: /delivery|entrega|entreg|motoboy/i,
    resposta: "Sim! Fazemos entrega. Chame no WhatsApp: (88) 99337-5650 🛵",
  },
  {
    padroes: /pagamento|pagar|pix|cart[aã]o|cr[eé]dito|d[eé]bito|dinheiro/i,
    resposta: "Aceitamos dinheiro, Pix, débito e crédito 💳",
  },
  {
    padroes: /promo[çc][aã]o|oferta|desconto|promo/i,
    resposta:
      PROMOCOES.length > 0
        ? "🔥 Ofertas da Semana:\n" +
          PROMOCOES.map((p) => {
            const desc = p.promocao?.descricao ?? p.desc?.replace("🔥 PROMOÇÃO: ", "");
            return `• ${p.nome} — ${desc}`;
          }).join("\n") +
          "\n\nVá na aba Catálogo para adicionar ao pedido! 😊"
        : "No momento não temos promoções ativas. Confira o catálogo completo! 😊",
  },
];

function detectarResposta(texto: string): string | null {
  for (const item of RESPOSTAS_RAPIDAS) {
    if (item.padroes.test(texto)) return item.resposta;
  }
  return null;
}

function detectarProdutos(texto: string): Produto[] {
  const ordenados = [...todosProdutos].sort((a, b) => b.nome.length - a.nome.length);
  const encontrados: Produto[] = [];
  const textoLower = texto.toLowerCase();
  for (const p of ordenados) {
    if (textoLower.includes(p.nome.toLowerCase()) && !encontrados.find(e => e.id === p.id)) {
      encontrados.push(p);
    }
  }
  return encontrados.slice(0, 8);
}

function detectarBotaoCatalogo(texto: string): boolean {
  return /cat[aá]logo|aba cat[aá]logo|ver cat[aá]logo|conferir cat[aá]logo/i.test(texto);
}

const REGEX_INTENCAO_MEDICAMENTO =
  /\b(bula|posologia|indica[çc][aã]o|contraindicac|contra.indica|para que serve|o que [eé]|princ[ií]pio ativo|dom[ií]nio|controlad[oa]|rec[eé]ita|efeito|dose|dosagem|tomar|mg|comprimido|medicamento|rem[eé]dio|f[aá]rmaco|gen[eé]rico|antibi[oó]tico|analgésico|anti-inflamatorio|anti inflamatorio)\b/i;

interface AnvisaDados {
  encontrado: boolean;
  nomeProduto?: string;
  principioAtivo?: string;
  indicacao?: string;
  posologia?: string;
  contraindicacoes?: string;
  ehControlado?: boolean;
  fonte?: string;
}

interface AnvisaItem {
  idProduto?: number;
  nomeProduto?: string;
  nomeGenerico?: string;
  principioAtivo?: string;
  laboratorio?: string;
  tipo?: string;
  situacao?: string;
  vencimento?: string;
}

async function buscarAnvisa(termo: string): Promise<AnvisaDados | null> {
  try {
    const url =
      `https://consultas.anvisa.gov.br/api/medicamento/?count=5` +
      `&filter%5BnomeProduto%5D=${encodeURIComponent(termo.toUpperCase())}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { content?: AnvisaItem[]; totalElements?: number };
    const items = data?.content;
    if (!items || items.length === 0) return { encontrado: false };

    const item = items[0];
    return {
      encontrado: true,
      nomeProduto: item.nomeProduto,
      principioAtivo: item.nomeGenerico || item.principioAtivo,
      fonte: "ANVISA",
    };
  } catch {
    return null;
  }
}

function extrairTermoMedicamento(texto: string): string {
  const padroes = [
    /(?:sobre|bula|posologia|dose|indica[çc][aã]o|para que serve|o que [eé])\s+(?:o\s+|a\s+|do\s+|da\s+)?([A-Za-záàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ0-9\s-]{2,30}?)(?:\?|$|\s+(?:é|serve|funciona|trata))/i,
    /([A-Za-záàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ0-9\s-]{3,25}?)\s+(?:\d+\s*mg|\d+\s*ml|comprimido|xarope|cápsula|pomada|injetável|gotas)/i,
  ];
  for (const p of padroes) {
    const m = texto.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return texto.replace(/[^\w\sáàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ]/g, " ").trim().slice(0, 50);
}

export default function ChatbotLara({ onNavigateTab }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: MENSAGEM_BOAS_VINDAS, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [adicionadosIds, setAdicionadosIds] = useState<Set<number>>(() => {
    try {
      const carrinho: number[] = JSON.parse(localStorage.getItem("lara_carrinho") || "[]");
      return new Set(carrinho);
    } catch { return new Set(); }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessaoId = useRef<string>(crypto.randomUUID());
  const primeiraMensagemRegistrada = useRef(false);

  const carrinhoCount = adicionadosIds.size;

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const delay = lastMsg.role === "assistant" ? 80 : 30;
    setTimeout(() => {
      if (lastMsg.role === "assistant") {
        lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, delay);
  }, [messages]);

  function appendAssistantMessage(content: string) {
    const produtosDetectados = detectarProdutos(content);
    const mostrarBotaoCatalogo = detectarBotaoCatalogo(content);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date(), produtosDetectados, mostrarBotaoCatalogo },
    ]);
  }

  const sendMessage = async (textoOverride?: string) => {
    const trimmed = (textoOverride ?? input).trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    trackLaraMensagem();

    if (!primeiraMensagemRegistrada.current) {
      primeiraMensagemRegistrada.current = true;
      const ts = Date.now();
      const sessao = sessaoId.current;
      salvarInteracaoLocal(sessao, trimmed, ts);
      registrarInteracaoLara({ sessao, primeiraMensagem: trimmed, ts });
    }

    const respostaRapida = detectarResposta(trimmed);
    if (respostaRapida) {
      setTimeout(() => appendAssistantMessage(respostaRapida), 400);
      return;
    }

    setLoading(true);
    try {
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      let dadosAnvisa: AnvisaDados | null = null;
      if (REGEX_INTENCAO_MEDICAMENTO.test(trimmed)) {
        const termo = extrairTermoMedicamento(trimmed);
        if (termo.length >= 3) {
          dadosAnvisa = await buscarAnvisa(termo);
        }
      }

      const response = await fetch("/api/lara", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          messages: conversationHistory,
          dadosAnvisa: dadosAnvisa?.encontrado ? dadosAnvisa : null,
        }),
      });

      if (!response.ok) throw new Error("Erro na API");
      const data = await response.json();
      const text = data?.content || "Desculpe, não consegui processar sua mensagem. Tente novamente.";
      appendAssistantMessage(text);
    } catch {
      appendAssistantMessage("Ops! Ocorreu um erro. Tente novamente ou chame no WhatsApp: (88) 99337-5650.");
    } finally {
      setLoading(false);
    }
  };

  function adicionarAoCatalogo(produto: Produto) {
    trackProdutoAdicionado(produto.nome);
    try {
      const carrinho: number[] = JSON.parse(localStorage.getItem("lara_carrinho") || "[]");
      if (!carrinho.includes(produto.id)) carrinho.push(produto.id);
      localStorage.setItem("lara_carrinho", JSON.stringify(carrinho));
      localStorage.setItem("lara_produto_pendente", String(produto.id));
    } catch {}
    setAdicionadosIds((prev) => new Set([...prev, produto.id]));
  }

  function verCarrinho() {
    onNavigateTab?.("catalogo");
  }

  function pedirWhatsApp(produto: Produto) {
    trackWhatsAppClick(produto.nome);
    const ts = Date.now();
    const url = window.location.href;
    salvarCliqueLocal([produto.nome], ts, url);
    registrarCliqueWhatsAppFirebase({ tipo: "clique_whatsapp", ts, produtos: [produto.nome], url });
    const preco = calcularPreco(produto, 1);
    const msg = `Olá! Vi no app da Farmácia Arcanjo e gostaria de pedir:\n• ${produto.nome} — R$${preco.toFixed(2)}\n\nPoderia confirmar disponibilidade? 😊`;
    window.open(`https://wa.me/5588993375650?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function pedirWhatsAppLista(produtos: Produto[]) {
    const nomes = produtos.map((p) => p.nome);
    trackWhatsAppClick(nomes.join(", "));
    const ts = Date.now();
    const url = window.location.href;
    salvarCliqueLocal(nomes, ts, url);
    registrarCliqueWhatsAppFirebase({ tipo: "clique_whatsapp", ts, produtos: nomes, url });
    const linhas = produtos
      .map((p) => {
        const preco = calcularPreco(p, 1);
        const semEstoque = p.estoque === 0 ? " ❌ (verificar estoque)" : "";
        return `• ${p.nome} — R$${preco.toFixed(2)}${semEstoque}`;
      })
      .join("\n");
    const msg = `Olá! Vi no app da Farmácia Arcanjo e gostaria de pedir:\n${linhas}\n\nPoderia confirmar disponibilidade e entrega? 😊`;
    window.open(`https://wa.me/5588993375650?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const ACOES_RAPIDAS = [
    { label: "💊 Ver Catálogo", acao: () => onNavigateTab?.("catalogo") },
    { label: "🔥 Promoções", acao: () => sendMessage("Quais são as promoções da semana?") },
    { label: "📍 Horário e Localização", acao: () => sendMessage("Qual o horário e onde fica a farmácia?") },
    { label: "📲 Falar com Atendente", acao: () => window.open("https://wa.me/5588993375650?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20atendente.", "_blank") },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 rounded-t-xl">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">L</div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-primary rounded-full"></span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Lara</p>
          <p className="text-xs text-primary-foreground/70">Assistente Virtual · Online</p>
        </div>
        <a
          href={`https://wa.me/5588993375650?text=${encodeURIComponent("Olá! Estou no app da Farmácia Arcanjo e gostaria de falar com o farmacêutico 😊")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xs transition-all active:scale-95"
        >
          💬 Farmacêutico
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;
          return (
          <div key={msg.id} ref={isLast && msg.role === "assistant" ? lastMsgRef : undefined}>
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold mr-2 mt-1 shrink-0">L</div>
              )}
              <div
                className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "text-foreground rounded-bl-sm"
                }`}
                style={msg.role === "assistant" ? { background: "#e3f2fd", borderLeft: "3px solid #1565c0" } : {}}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>

            {/* Botão Ir ao Catálogo */}
            {msg.role === "assistant" && msg.mostrarBotaoCatalogo && (
              <div className="ml-9 mt-2">
                <button
                  onClick={() => onNavigateTab?.("catalogo")}
                  className="text-xs font-bold px-4 py-2 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-xs"
                >
                  🏪 Ir para o Catálogo
                </button>
              </div>
            )}

            {/* Cards de produtos detectados */}
            {msg.role === "assistant" && msg.produtosDetectados && msg.produtosDetectados.length > 0 && (
              <div className="ml-9 mt-2 space-y-2">
                {msg.produtosDetectados.map((produto) => {
                  const emPromocao = produto.desc?.includes("PROMOÇÃO") || !!produto.promocao;
                  const descPromo = produto.promocao?.descricao ?? produto.desc?.replace("🔥 PROMOÇÃO: ", "");
                  const semEstoque = produto.estoque === 0;
                  return (
                    <div
                      key={produto.id}
                      className="bg-card border rounded-xl p-3 shadow-xs"
                      style={{ borderColor: semEstoque ? "#9e9e9e" : emPromocao ? "#c62828" : "#e0e0e0", opacity: semEstoque ? 0.75 : 1 }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xl mt-0.5">{produto.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground">{produto.nome}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {produto.precoOriginal && (
                              <span className="text-xs text-muted-foreground line-through">R${produto.precoOriginal.toFixed(2)}</span>
                            )}
                            {!semEstoque && (
                              <span className="text-sm font-bold" style={{ color: emPromocao ? "#c62828" : "#1565c0" }}>
                                R${produto.preco.toFixed(2)}
                              </span>
                            )}
                            {emPromocao && !semEstoque && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#ffebee", color: "#c62828" }}>🔥 {descPromo}</span>
                            )}
                            {semEstoque && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">🔴 Sem Estoque</span>
                            )}
                          </div>
                          {produto.prescricao && (
                            <p className="text-[10px] text-red-600 font-semibold mt-0.5">⚠️ Requer receita médica</p>
                          )}
                        </div>
                      </div>
                      {!semEstoque && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => adicionarAoCatalogo(produto)}
                            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all active:scale-95 ${
                              adicionadosIds.has(produto.id)
                                ? "bg-green-100 text-green-700 border border-green-400"
                                : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            {adicionadosIds.has(produto.id) ? "✅ Adicionado" : "🛒 Adicionar"}
                          </button>
                          <button
                            onClick={() => pedirWhatsApp(produto)}
                            className="flex-1 text-xs font-bold py-1.5 rounded-lg text-white transition-all active:scale-95"
                            style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}
                          >
                            📲 WhatsApp
                          </button>
                        </div>
                      )}
                      {semEstoque && (
                        <p className="text-[11px] text-muted-foreground text-center mt-1">
                          Consulte disponibilidade pelo WhatsApp: (88) 99337-5650
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Botão "Pedir Todos" quando há 2+ produtos disponíveis */}
                {msg.produtosDetectados.filter((p) => p.estoque !== 0).length >= 2 && (
                  <button
                    onClick={() => pedirWhatsAppLista(msg.produtosDetectados!.filter((p) => p.estoque !== 0))}
                    className="w-full text-sm font-bold py-2.5 rounded-xl text-white transition-all active:scale-95 shadow-sm mt-1"
                    style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}
                  >
                    📲 Pedir Todos pelo WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
          );
        })}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">L</div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-xs" style={{ background: "#e3f2fd", borderLeft: "3px solid #1565c0" }}>
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]"></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]"></span>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]"></span>
              </div>
            </div>
          </div>
        )}

        {/* Botões de ação rápida — só na boas-vindas */}
        {messages.length === 1 && !loading && (
          <div className="ml-9 mt-2 space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-1">Escolha uma opção ou digite sua dúvida:</p>
            <div className="grid grid-cols-2 gap-2">
              {ACOES_RAPIDAS.map((acao) => (
                <button
                  key={acao.label}
                  onClick={acao.acao}
                  className="text-xs bg-card border border-primary/30 text-primary px-3 py-2.5 rounded-xl font-semibold hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all shadow-xs text-left"
                >
                  {acao.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="bg-card border-t border-border rounded-b-xl">

        {/* Barra do carrinho — aparece quando há itens adicionados */}
        {carrinhoCount > 0 && (
          <div className="px-3 pt-2">
            <button
              onClick={verCarrinho}
              className="w-full flex items-center justify-between text-xs font-bold py-2.5 px-4 rounded-xl text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #1565c0, #0d47a1)" }}
            >
              <span>🛒 Ver Pedido no Catálogo</span>
              <span className="bg-white text-primary rounded-full px-2 py-0.5 font-extrabold">
                {carrinhoCount} {carrinhoCount === 1 ? "item" : "itens"}
              </span>
            </button>
          </div>
        )}

        {/* Input de mensagem */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex gap-2 items-end bg-muted rounded-xl px-3 py-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem para a Lara..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px] py-1"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-95"
              aria-label="Enviar mensagem para a Lara"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Link WhatsApp com Atendente — estilo sutil, não confunde com enviar */}
        <div className="px-3 pb-2 pt-1 flex items-center justify-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-green-600 shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M11.996 0C5.373 0 0 5.373 0 12c0 2.09.543 4.052 1.491 5.762L.018 23.895a.5.5 0 00.608.625l6.318-1.656A11.945 11.945 0 0011.996 24C18.619 24 24 18.627 24 12S18.619 0 11.996 0zm0 21.818a9.818 9.818 0 01-5.007-1.374l-.36-.214-3.726.977.997-3.634-.235-.374A9.818 9.818 0 012.182 12c0-5.413 4.401-9.818 9.814-9.818S21.818 6.587 21.818 12c0 5.415-4.403 9.818-9.822 9.818z"/>
          </svg>
          <a
            href="https://wa.me/5588993375650?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20atendente."
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-green-700 underline underline-offset-2"
          >
            Falar com atendente pelo WhatsApp
          </a>
        </div>

        <p className="text-[10px] text-muted-foreground text-center pb-2 px-3">
          Lara pode cometer erros. Consulte um farmacêutico para orientações.
        </p>
      </div>
    </div>
  );
}
