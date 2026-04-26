import { useState, useRef, useEffect } from "react";
import { PRODUTOS_INICIAIS, calcularPreco, resumoCatalogo, type Produto } from "../data/produtos";
import { trackLaraMensagem, trackWhatsAppClick, trackProdutoAdicionado } from "../lib/analytics";
import { registrarInteracaoLara, registrarCliqueWhatsAppFirebase } from "../lib/firebase";

const LS_INTERACOES_KEY = "farmacia_interacoes_lara";
const LS_CLIQUES_KEY = "farmacia_cliques_whatsapp";
const LS_CONVERSA_KEY = "farmacia_lara_conversa";

function salvarConversa(msgs: Array<{ id: string; role: string; content: string; timestamp: Date; produtosDetectados?: Produto[]; mostrarBotaoCatalogo?: boolean; mostrarMapa?: boolean }>) {
  try {
    const serialized = msgs.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() }));
    localStorage.setItem(LS_CONVERSA_KEY, JSON.stringify(serialized));
  } catch {}
}

function carregarConversa(): Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: Date; produtosDetectados?: Produto[]; mostrarBotaoCatalogo?: boolean; mostrarMapa?: boolean }> | null {
  try {
    const raw = localStorage.getItem(LS_CONVERSA_KEY);
    if (!raw) return null;
    const parsed: Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: string; produtosDetectados?: Produto[]; mostrarBotaoCatalogo?: boolean; mostrarMapa?: boolean }> = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return null; }
}

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
  mostrarMapa?: boolean;
  imagemUrl?: string;
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

const ASSOCIACOES_TEXTO = (() => {
  const comAssoc = todosProdutos.filter(p => p.produtosAssociados && p.produtosAssociados.length > 0);
  if (comAssoc.length === 0) return "";
  const linhas = comAssoc.map(p => {
    const nomes = (p.produtosAssociados ?? []).map(id => todosProdutos.find(x => x.id === id)?.nome).filter(Boolean);
    return `- ${p.nome} → sugira junto: ${nomes.join(", ")}`;
  }).join("\n");
  return `\nASSOCIAÇÕES TERAPÊUTICAS (sugira automaticamente quando o cliente mencionar ou pedir o produto principal):\n${linhas}\nAo sugerir, use a frase: "💊 Clientes também levam junto:" e liste os associados com o preço.\n`;
})();

function getMensagemBoasVindas(): string {
  try {
    const count = parseInt(localStorage.getItem("fa_visit_count") || "0") + 1;
    localStorage.setItem("fa_visit_count", String(count));
    if (count >= 5) {
      return "Olá, cliente fiel! 🌟 Fico sempre feliz quando você volta!\nComo posso te ajudar hoje? 💊";
    } else if (count >= 2) {
      return `Bem-vindo de volta! 👋 Que bom te ver de novo!\nComo posso te ajudar hoje? 💊`;
    }
  } catch {}
  return "Olá! 👋 Sou a Lara, assistente virtual da Farmácia Arcanjo!\nPosso te ajudar a encontrar medicamentos, tirar dúvidas e fazer pedidos.\nComo posso te ajudar hoje? 💊";
}
const MENSAGEM_BOAS_VINDAS = getMensagemBoasVindas();

const SYSTEM_PROMPT = `Você é Lara, a assistente virtual da Farmácia Arcanjo, localizada em Meruoca-CE.
Você é simpática, prestativa, profissional e fala português brasileiro.

INFORMAÇÕES DA FARMÁCIA:
- Horário: Segunda a Sábado das 8h às 20h. Aos domingos das 8h às 12h.
- Endereço: Rua Dom José, 135 — Centro, Meruoca-CE, CEP 62.130-000
- WhatsApp: (88) 99337-5650
- Entrega: Sim! Fazemos entrega. Chame no WhatsApp.
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
14. Quando receber DADOS ANVISA no contexto, mencione: "✔️ Registro ANVISA confirmado" e use esses dados como referência oficial para nome e princípio ativo.
15. GENÉRICO vs. MARCA: Quando o cliente perguntar por um medicamento de marca (ex: "Tylenol", "Buscopan", "Cataflam"), SEMPRE verifique se há genérico equivalente no catálogo. Se houver, informe: "💸 Alternativa genérica: [nome do genérico] — R$ [preço]". Isso ajuda o cliente a economizar. Se não tiver no catálogo, oriente consultar pelo WhatsApp.
${ASSOCIACOES_TEXTO}`;

const RESPOSTAS_RAPIDAS: Array<{ padroes: RegExp; resposta: string }> = [
  {
    padroes: /hor[aá]rio|que horas|quando abre|quando fecha|funciona/i,
    resposta: "Funcionamos de segunda a sábado das 8h às 20h e domingos das 8h às 12h 🕐",
  },
  {
    padroes: /onde fica|endere[çc]o|localiza[çc]|como chegar|mapa|gps/i,
    resposta: "📍 Rua Dom José, 135 — Centro, Meruoca-CE\n🕐 Seg–Sáb: 8h às 20h · Dom: 8h às 12h\n📲 WhatsApp: (88) 99337-5650\n\n🗺️ Abra no mapa para me encontrar!",
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

function detectarMapa(texto: string): boolean {
  return /rua dom jos[eé]|centro.{0,20}meruoca|meruoca.{0,20}centro|abra no mapa|encontrar no mapa|gps|google maps|waze/i.test(texto);
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
    const res = await fetch(`/api/anvisa/buscar?q=${encodeURIComponent(termo)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AnvisaDados;
    return data;
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

function renderTextoFormatado(texto: string, isUser: boolean) {
  const paragrafos = texto.split(/\n\n+/);
  return (
    <div className="space-y-1.5">
      {paragrafos.map((paragrafo, pi) => {
        const linhas = paragrafo.split("\n");
        const isBulletBlock = linhas.every(l => /^[•\-\*]\s/.test(l.trim()) || l.trim() === "");
        if (isBulletBlock && linhas.some(l => /^[•\-\*]\s/.test(l.trim()))) {
          return (
            <ul key={pi} className="space-y-0.5 pl-1">
              {linhas.filter(l => /^[•\-\*]\s/.test(l.trim())).map((l, li) => {
                const txt = l.trim().replace(/^[•\-\*]\s*/, "");
                return (
                  <li key={li} className="flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 text-[10px] ${isUser ? "text-primary-foreground/80" : "text-primary"}`}>●</span>
                    <span>{renderInline(txt, isUser)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return (
          <div key={pi}>
            {linhas.map((l, li) => {
              if (/^[•\-\*]\s/.test(l.trim())) {
                const txt = l.trim().replace(/^[•\-\*]\s*/, "");
                return (
                  <div key={li} className="flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 text-[10px] ${isUser ? "text-primary-foreground/80" : "text-primary"}`}>●</span>
                    <span>{renderInline(txt, isUser)}</span>
                  </div>
                );
              }
              return <p key={li}>{renderInline(l, isUser)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(texto: string, isUser: boolean) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i} className={isUser ? "font-extrabold" : "font-bold text-blue-900"}>{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
    </>
  );
}

export default function ChatbotLara({ onNavigateTab }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const salvas = carregarConversa();
    if (salvas && salvas.length > 0) return salvas;
    return [{ id: "welcome", role: "assistant", content: MENSAGEM_BOAS_VINDAS, timestamp: new Date() }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quantidades, setQuantidades] = useState<Record<number, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("lara_carrinho_qtd") || "{}") as Record<number, number>;
    } catch { return {}; }
  });
  const [imagemPendente, setImagemPendente] = useState<string | null>(null);
  const [escutando, setEscutando] = useState(false);
  const [vozAtiva, setVozAtiva] = useState(() => localStorage.getItem("fa_voz_ativa") === "1");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessaoId = useRef<string>(crypto.randomUUID());
  const primeiraMensagemRegistrada = useRef(false);
  const recognitionRef = useRef<any>(null);

  function toggleVoz() {
    const novo = !vozAtiva;
    setVozAtiva(novo);
    localStorage.setItem("fa_voz_ativa", novo ? "1" : "0");
    if (!novo) window.speechSynthesis?.cancel();
  }

  function falarTexto(texto: string) {
    if (!vozAtiva) return;
    window.speechSynthesis?.cancel();
    const limpo = texto.replace(/[*#_~`]/g, "").replace(/\n+/g, ". ").slice(0, 500);
    const utt = new SpeechSynthesisUtterance(limpo);
    utt.lang = "pt-BR";
    utt.rate = 1.05;
    utt.pitch = 1.1;
    const vozes = window.speechSynthesis?.getVoices() ?? [];
    const voz = vozes.find(v => v.lang === "pt-BR") ?? vozes.find(v => v.lang.startsWith("pt"));
    if (voz) utt.voice = voz;
    window.speechSynthesis?.speak(utt);
  }

  function iniciarMicrofone() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Microfone não suportado neste navegador. Use o Chrome!"); return; }
    if (escutando) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setEscutando(true);
    rec.onresult = (e: any) => {
      const texto = e.results[0][0].transcript;
      setInput(prev => prev + texto);
    };
    rec.onerror = () => setEscutando(false);
    rec.onend = () => setEscutando(false);
    rec.start();
  }

  const carrinhoCount = Object.values(quantidades).reduce((a, b) => a + b, 0);

  useEffect(() => {
    salvarConversa(messages);
  }, [messages]);

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
    const mostrarMapa = detectarMapa(content);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date(), produtosDetectados, mostrarBotaoCatalogo, mostrarMapa },
    ]);
    falarTexto(content);
  }

  const sendMessage = async (textoOverride?: string) => {
    const trimmed = (textoOverride ?? input).trim();
    const imagemAtual = imagemPendente;
    if (!trimmed && !imagemAtual) return;
    if (loading) return;

    const textoFinal = trimmed || (imagemAtual ? "📷 Foto da receita enviada" : "");
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: textoFinal, timestamp: new Date(), imagemUrl: imagemAtual ?? undefined };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImagemPendente(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    trackLaraMensagem();

    if (!primeiraMensagemRegistrada.current) {
      primeiraMensagemRegistrada.current = true;
      const ts = Date.now();
      const sessao = sessaoId.current;
      salvarInteracaoLocal(sessao, textoFinal, ts);
      registrarInteracaoLara({ sessao, primeiraMensagem: textoFinal, ts });
    }

    if (!imagemAtual) {
      const respostaRapida = detectarResposta(trimmed);
      if (respostaRapida) {
        setTimeout(() => appendAssistantMessage(respostaRapida), 400);
        return;
      }
    }

    setLoading(true);
    try {
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      let dadosAnvisa: AnvisaDados | null = null;
      if (!imagemAtual && REGEX_INTENCAO_MEDICAMENTO.test(trimmed)) {
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
          imagemBase64: imagemAtual ?? undefined,
          textoComImagem: imagemAtual ? (trimmed || "") : undefined,
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

  function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1600;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.88);
        setImagemPendente(compressed);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function atualizarQuantidade(produto: Produto, delta: number) {
    if (delta > 0) trackProdutoAdicionado(produto.nome);
    setQuantidades((prev) => {
      const atual = prev[produto.id] || 0;
      const nova = Math.max(0, atual + delta);
      const novoEstado: Record<number, number> = { ...prev };
      if (nova === 0) {
        delete novoEstado[produto.id];
      } else {
        novoEstado[produto.id] = nova;
      }
      try {
        const ids = Object.keys(novoEstado).map(Number);
        localStorage.setItem("lara_carrinho", JSON.stringify(ids));
        localStorage.setItem("lara_carrinho_qtd", JSON.stringify(novoEstado));
      } catch {}
      return novoEstado;
    });
  }

  function verCarrinho() {
    onNavigateTab?.("catalogo");
  }

  const LS_HISTORICO_KEY = "fa_historico_pedidos";

  function salvarHistoricoPedido(nomes: string[]) {
    try {
      const hist: Array<{ ts: number; produtos: string[] }> = JSON.parse(localStorage.getItem(LS_HISTORICO_KEY) || "[]");
      hist.unshift({ ts: Date.now(), produtos: nomes });
      localStorage.setItem(LS_HISTORICO_KEY, JSON.stringify(hist.slice(0, 30)));
    } catch {}
  }

  function pedirWhatsApp(produto: Produto) {
    trackWhatsAppClick(produto.nome);
    const ts = Date.now();
    const url = window.location.href;
    salvarCliqueLocal([produto.nome], ts, url);
    registrarCliqueWhatsAppFirebase({ tipo: "clique_whatsapp", ts, produtos: [produto.nome], url });
    salvarHistoricoPedido([produto.nome]);
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
    salvarHistoricoPedido(nomes);
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

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const historicoPedidos: Array<{ ts: number; produtos: string[] }> = (() => {
    try { return JSON.parse(localStorage.getItem(LS_HISTORICO_KEY) || "[]"); } catch { return []; }
  })();

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
        <button
          onClick={() => setMostrarHistorico(true)}
          title="Meu histórico de pedidos"
          className="p-1.5 rounded-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-all active:scale-95"
          aria-label="Histórico de pedidos"
        >
          🕐
        </button>
        <button
          onClick={toggleVoz}
          title={vozAtiva ? "Desativar voz da Lara" : "Ativar voz da Lara"}
          className="p-1.5 rounded-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-all active:scale-95"
          aria-label="Ativar/desativar voz"
        >
          {vozAtiva ? "🔊" : "🔇"}
        </button>
        <button
          onClick={() => {
            if (confirm("Apagar toda a conversa com a Lara?")) {
              localStorage.removeItem(LS_CONVERSA_KEY);
              setMessages([{ id: "welcome", role: "assistant", content: MENSAGEM_BOAS_VINDAS, timestamp: new Date() }]);
            }
          }}
          className="p-1.5 rounded-full text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/10 transition-all active:scale-95"
          aria-label="Limpar conversa"
          title="Limpar conversa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </button>
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
                className={`max-w-[78%] rounded-2xl text-sm leading-relaxed shadow-xs overflow-hidden ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "text-foreground rounded-bl-sm"
                }`}
                style={msg.role === "assistant" ? { background: "#e3f2fd", borderLeft: "3px solid #1565c0" } : {}}
              >
                {msg.imagemUrl && (
                  <img
                    src={msg.imagemUrl}
                    alt="Receita enviada"
                    className="w-full max-h-52 object-cover rounded-t-2xl"
                    style={{ display: "block" }}
                  />
                )}
                <div className="px-3 py-2 text-sm leading-relaxed">
                  {renderTextoFormatado(msg.content, msg.role === "user")}
                  <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-primary-foreground/60 text-right" : "text-muted-foreground"}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
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

            {/* Card de Localização com botões de mapa */}
            {msg.role === "assistant" && msg.mostrarMapa && (
              <div className="ml-9 mt-2 rounded-2xl overflow-hidden shadow-sm border border-blue-100" style={{ background: "#f0f4ff" }}>
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-blue-900 mb-1">📍 Farmácia Arcanjo</p>
                  <p className="text-xs text-blue-800">Rua Dom José, 135 — Centro</p>
                  <p className="text-xs text-blue-800 mb-3">Meruoca-CE · CEP 62.130-000</p>
                  <div className="flex gap-2">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Farmácia+Arcanjo+Rua+Dom+José+135+Centro+Meruoca+CE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl text-white active:scale-95 transition-all"
                      style={{ background: "#4285f4" }}
                    >
                      <span>🗺️</span> Google Maps
                    </a>
                    <a
                      href="https://waze.com/ul?q=Farmácia+Arcanjo+Meruoca+CE&navigate=yes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-xl text-white active:scale-95 transition-all"
                      style={{ background: "#33ccff" }}
                    >
                      <span>🚗</span> Waze
                    </a>
                  </div>
                </div>
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
                        <div className="flex gap-2 items-center">
                          {(quantidades[produto.id] || 0) > 0 ? (
                            <div className="flex items-center gap-1.5 flex-1 bg-blue-50 rounded-lg px-2 py-1">
                              <button
                                onClick={() => atualizarQuantidade(produto, -1)}
                                className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-base flex items-center justify-center active:scale-90 shadow-sm"
                              >−</button>
                              <span className="flex-1 text-center font-bold text-sm text-primary">{quantidades[produto.id]}</span>
                              <button
                                onClick={() => atualizarQuantidade(produto, 1)}
                                className="w-7 h-7 rounded-full text-white font-bold text-base flex items-center justify-center active:scale-90 shadow-sm"
                                style={{ background: "#1565c0" }}
                              >+</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => atualizarQuantidade(produto, 1)}
                              className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
                            >
                              🛒 Adicionar
                            </button>
                          )}
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

                {/* Produtos Associados — "Clientes também levam junto" */}
                {(() => {
                  const idsDetectados = new Set(msg.produtosDetectados.map(p => p.id));

                  // 1) Associações cadastradas pelo admin
                  const assocIds = new Set<number>();
                  msg.produtosDetectados.forEach(p => {
                    (p.produtosAssociados ?? []).forEach(id => {
                      if (!idsDetectados.has(id)) assocIds.add(id);
                    });
                  });
                  let sugeridos = [...assocIds]
                    .map(id => todosProdutos.find(p => p.id === id))
                    .filter(Boolean) as Produto[];

                  // 2) Fallback automático: produtos da mesma categoria que NÃO estão na lista
                  if (sugeridos.length === 0 && msg.produtosDetectados.length > 0) {
                    const categorias = new Set(msg.produtosDetectados.map(p => p.categoria));
                    sugeridos = todosProdutos
                      .filter(p =>
                        categorias.has(p.categoria) &&
                        !idsDetectados.has(p.id) &&
                        p.estoque !== 0 &&
                        !p.usoControlado
                      )
                      .slice(0, 3);
                  }

                  const disponiveis = sugeridos.filter(p => p.estoque !== 0).slice(0, 3);
                  if (disponiveis.length === 0) return null;
                  return (
                    <div className="mt-2 rounded-xl border-2 border-blue-100 bg-blue-50 overflow-hidden">
                      <div className="px-3 py-2 text-xs font-bold text-blue-800 bg-blue-100">💊 Leve também:</div>
                      {disponiveis.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 border-t border-blue-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg shrink-0">{p.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{p.nome}</p>
                              <p className="text-xs font-bold" style={{ color: "#1565c0" }}>R$ {p.preco.toFixed(2)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => atualizarQuantidade(p, 1)}
                            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                              (quantidades[p.id] || 0) > 0
                                ? "bg-green-100 text-green-700 border border-green-400"
                                : "border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            {(quantidades[p.id] || 0) > 0 ? `✅ ${quantidades[p.id]}x` : "➕ Adicionar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}

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
          {/* Preview da imagem selecionada */}
          {imagemPendente && (
            <div className="relative mb-2 inline-block">
              <img src={imagemPendente} alt="Foto selecionada" className="h-20 w-auto rounded-xl border-2 border-primary object-cover shadow-sm" />
              <button
                onClick={() => setImagemPendente(null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow font-bold"
              >✕</button>
            </div>
          )}
          <div className="flex gap-2 items-end bg-muted rounded-xl px-3 py-2">
            {/* Botão câmera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoSelecionada}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-40"
              aria-label="Enviar foto de medicamento"
              title="Identificar medicamento por foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <button
              onClick={iniciarMicrofone}
              disabled={loading}
              title={escutando ? "Parar microfone" : "Falar com a Lara"}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 ${
                escutando
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
              aria-label="Falar com a Lara por voz"
            >
              🎤
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={imagemPendente ? "Adicione uma mensagem (opcional)..." : "Digite sua mensagem para a Lara..."}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-[120px] py-1"
            />
            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !imagemPendente) || loading}
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

      {/* Modal histórico de pedidos */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b">
              <div>
                <p className="font-bold text-base text-gray-900">🕐 Meu Histórico de Pedidos</p>
                <p className="text-xs text-gray-400 mt-0.5">{historicoPedidos.length} pedido(s) pelo WhatsApp</p>
              </div>
              <button onClick={() => setMostrarHistorico(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-lg font-bold hover:bg-gray-200">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {historicoPedidos.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">Nenhum pedido ainda.</p>
                  <p className="text-xs mt-1">Seus pedidos enviados via WhatsApp aparecerão aqui.</p>
                </div>
              ) : historicoPedidos.map((pedido, i) => (
                <div key={i} className="py-3 border-b last:border-b-0">
                  <p className="text-[11px] text-gray-400 mb-1">
                    {new Date(pedido.ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  {pedido.produtos.map((nome, j) => (
                    <p key={j} className="text-sm text-gray-700 font-semibold">• {nome}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
