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

router.get("/anvisa/buscar", async (req, res) => {
  const { q } = req.query as { q?: string };
  if (!q || q.trim().length < 2) {
    res.json({ encontrado: false });
    return;
  }

  const termo = q.trim();

  try {
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; FarmaciaArcanjo/1.0)",
      Referer: "https://consultas.anvisa.gov.br/",
      Origin: "https://consultas.anvisa.gov.br",
    };

    const clientId = process.env.ANVISA_CLIENT_ID;
    const clientSecret = process.env.ANVISA_CLIENT_SECRET;

    if (clientId && clientSecret) {
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
        if (tokenRes.ok) {
          const tokenData = (await tokenRes.json()) as { access_token?: string };
          if (tokenData.access_token) {
            headers["Authorization"] = `Bearer ${tokenData.access_token}`;
          }
        }
      } catch {
        // sem token, tenta sem auth
      }
    }

    const url = `https://consultas.anvisa.gov.br/api/consulta/bulario?count=5&filter%5BnomeProduto%5D=${encodeURIComponent(termo)}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      res.json({ encontrado: false });
      return;
    }

    const data = (await response.json()) as {
      content?: Array<{
        nomeProduto?: string;
        nomeGenerico?: string;
        principioAtivo?: string;
        idProduto?: number;
        tipo?: string;
      }>;
    };

    const items = data?.content;
    if (!items || items.length === 0) {
      res.json({ encontrado: false });
      return;
    }

    const item = items[0];
    const resultado: AnvisaResultado = {
      encontrado: true,
      nomeProduto: item.nomeProduto,
      principioAtivo: item.nomeGenerico || item.principioAtivo,
      fonte: "ANVISA",
    };

    res.json(resultado);
  } catch (err) {
    console.error("Erro ao consultar ANVISA:", err);
    res.json({ encontrado: false });
  }
});

router.post("/lara", async (req, res) => {
  try {
    const { messages, systemPrompt, dadosAnvisa } = req.body as {
      messages: ChatMessage[];
      systemPrompt: string;
      dadosAnvisa?: AnvisaResultado | null;
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
      systemFinal += `\n\n--- DADOS ANVISA (use como base para responder) ---
Medicamento: ${dadosAnvisa.nomeProduto ?? ""}
Princípio Ativo: ${dadosAnvisa.principioAtivo ?? ""}
${dadosAnvisa.indicacao ? `Indicação: ${dadosAnvisa.indicacao}` : ""}
${dadosAnvisa.posologia ? `Posologia: ${dadosAnvisa.posologia}` : ""}
${dadosAnvisa.contraindicacoes ? `Contraindicações: ${dadosAnvisa.contraindicacoes}` : ""}
${dadosAnvisa.ehControlado !== undefined ? `Medicamento Controlado: ${dadosAnvisa.ehControlado ? "SIM ⚠️ (exige receita)" : "Não"}` : ""}
Fonte: ANVISA
---`;
    }

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemFinal },
      ...messages,
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        messages: fullMessages,
        max_completion_tokens: 1024,
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
