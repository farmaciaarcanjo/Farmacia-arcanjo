import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AnvisaResultado {
  encontrado: boolean;
  nomeProduto?: string;
  principioAtivo?: string;
  indicacao?: string;
  posologia?: string;
  contraindicacoes?: string;
  ehControlado?: boolean;
  fonte?: string;
}

type AnvisaContentItem = {
  nomeProduto?: string;
  nomeGenerico?: string;
  principioAtivo?: string;
  idProduto?: number;
  idBulaProfissional?: string;
  idBulaPaciente?: string;
  tipo?: string;
  numeroRegistro?: string;
  expediente?: string;
  situacao?: string;
  categoriasRegulatoria?: string;
  empresa?: string;
};

async function obterTokenAnvisa(): Promise<string | null> {
  const clientId = process.env.ANVISA_CLIENT_ID;
  const clientSecret = process.env.ANVISA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  try {
    const tokenRes = await fetch(
      "https://keycloak.anvisa.gov.br/auth/realms/anvisa/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );
    if (!tokenRes.ok) return null;
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    return tokenData.access_token ?? null;
  } catch {
    return null;
  }
}

async function buscarNaAnvisa(
  token: string | null,
  filtroParam: string,
  termo: string
): Promise<AnvisaContentItem[] | null> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (compatible; FarmaciaArcanjo/1.0)",
    Referer: "https://consultas.anvisa.gov.br/",
    Origin: "https://consultas.anvisa.gov.br",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url =
    `https://consultas.anvisa.gov.br/api/consulta/bulario?count=5` +
    `&filter%5B${encodeURIComponent(filtroParam)}%5D=${encodeURIComponent(termo)}`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: AnvisaContentItem[] };
    return data?.content ?? null;
  } catch {
    return null;
  }
}

async function buscarDetalhesBula(
  token: string | null,
  idProduto: number
): Promise<{ indicacao?: string; posologia?: string; contraindicacoes?: string } | null> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (compatible; FarmaciaArcanjo/1.0)",
    Referer: "https://consultas.anvisa.gov.br/",
    Origin: "https://consultas.anvisa.gov.br",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const url = `https://consultas.anvisa.gov.br/api/consulta/bulario/${idProduto}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      indicacao: String(data.indicacaoTerapeutica ?? data.indicacao ?? ""),
      posologia: String(data.posologia ?? data.dosagemAdministracao ?? ""),
      contraindicacoes: String(data.contraindicacoes ?? data.contraindicacao ?? ""),
    };
  } catch {
    return null;
  }
}

router.get("/anvisa/buscar", async (req, res) => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) {
    res.json({ encontrado: false });
    return;
  }

  const termo = q.trim();

  try {
    const token = await obterTokenAnvisa();

    let items = await buscarNaAnvisa(token, "nomeProduto", termo.toUpperCase());

    if (!items || items.length === 0) {
      items = await buscarNaAnvisa(token, "principioAtivo", termo.toUpperCase());
    }

    if (!items || items.length === 0) {
      res.json({ encontrado: false });
      return;
    }

    const item = items[0];

    const nomeProduto = item.nomeProduto ?? "";
    const principioAtivo = item.nomeGenerico || item.principioAtivo || "";
    const ehControlado =
      item.categoriasRegulatoria?.toLowerCase().includes("controlad") ||
      item.tipo?.toLowerCase().includes("controlad") ||
      false;

    const resultado: AnvisaResultado = {
      encontrado: true,
      nomeProduto,
      principioAtivo,
      ehControlado,
      fonte: "ANVISA",
    };

    if (item.idProduto) {
      const detalhes = await buscarDetalhesBula(token, item.idProduto);
      if (detalhes) {
        if (detalhes.indicacao) resultado.indicacao = detalhes.indicacao;
        if (detalhes.posologia) resultado.posologia = detalhes.posologia;
        if (detalhes.contraindicacoes) resultado.contraindicacoes = detalhes.contraindicacoes;
      }
    }

    res.json(resultado);
  } catch (err) {
    console.error("Erro ao consultar ANVISA:", err);
    res.json({ encontrado: false });
  }
});

router.post("/lara", async (req, res) => {
  try {
    const { messages, systemPrompt, dadosAnvisa, imagemBase64, textoComImagem } = req.body as {
      messages: ChatMessage[];
      systemPrompt: string;
      dadosAnvisa?: AnvisaResultado | null;
      imagemBase64?: string;
      textoComImagem?: string;
    };

    if (!Array.isArray(messages) || typeof systemPrompt !== "string") {
      res.status(400).json({ error: "Requisição inválida" });
      return;
    }

    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(500).json({ error: "Integração de IA não configurada" });
      return;
    }

    let systemFinal = systemPrompt;

    if (dadosAnvisa?.encontrado) {
      const temDetalhesBula = dadosAnvisa.indicacao || dadosAnvisa.posologia || dadosAnvisa.contraindicacoes;
      systemFinal += `\n\n--- DADOS ANVISA (registro oficial confirmado) ---
✔️ Registro ANVISA confirmado para: ${dadosAnvisa.nomeProduto ?? ""}
Princípio Ativo: ${dadosAnvisa.principioAtivo ?? ""}
${dadosAnvisa.ehControlado ? `🔴 Medicamento Controlado: SIM ⚠️ (exige receita)` : ""}
${dadosAnvisa.indicacao ? `Indicação (ANVISA): ${dadosAnvisa.indicacao}` : ""}
${dadosAnvisa.posologia ? `Posologia (ANVISA): ${dadosAnvisa.posologia}` : ""}
${dadosAnvisa.contraindicacoes ? `Contraindicações (ANVISA): ${dadosAnvisa.contraindicacoes}` : ""}
${!temDetalhesBula ? `⚠️ Bula detalhada não disponível via API no momento. Use seu conhecimento farmacêutico para fornecer indicação, posologia e contraindicações deste medicamento, marcando como "informação farmacêutica geral".` : ""}
Fonte: ANVISA
---`;
    }

    type MultimodalContent = Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }>;
    type ApiMessage = { role: "system" | "user" | "assistant"; content: string | MultimodalContent };

    const apiMessages: ApiMessage[] = [
      { role: "system", content: systemFinal },
      ...messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    ];

    const lastMsg = messages[messages.length - 1];
    if (imagemBase64 && lastMsg) {
      const multiContent: MultimodalContent = [
        {
          type: "text",
          text: textoComImagem && textoComImagem !== "Por favor, leia esta receita médica e me diga os medicamentos, dosagens e orientações."
            ? textoComImagem
            : `Você é a Lara, assistente virtual da Farmácia Arcanjo.
O cliente enviou uma foto de um medicamento. Identifique o produto na imagem e responda em português brasileiro.

Informe:
• Nome do medicamento e fabricante (se visível)
• Princípio ativo principal
• Para que serve (indicação geral)
• Se está disponível no catálogo da farmácia, sugira verificar com o atendente

Não leia nem interprete receituários médicos — para isso, o cliente deve procurar diretamente o farmacêutico.
Finalize sempre com: "Consulte um farmacêutico para orientações completas." 💊`,
        },
        { type: "image_url", image_url: { url: imagemBase64, detail: "high" } },
      ];
      apiMessages.push({ role: "user", content: multiContent });
    } else if (lastMsg) {
      apiMessages.push({ role: lastMsg.role, content: lastMsg.content });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: apiMessages,
        max_completion_tokens: imagemBase64 ? 2048 : 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI provider error:", response.status, errText);
      res.status(502).json({ error: "Erro ao consultar a IA" });
      return;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";

    res.json({ content });
  } catch (err) {
    console.error("Lara route error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
