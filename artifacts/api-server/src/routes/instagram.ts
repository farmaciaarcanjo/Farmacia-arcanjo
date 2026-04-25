import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/instagram", async (req, res) => {
  try {
    const { tipo, tom, produto, topico } = req.body as {
      tipo: string;
      tom: string;
      produto?: string;
      topico?: string;
    };

    if (!tipo || !tom) {
      res.status(400).json({ error: "Tipo e tom são obrigatórios" });
      return;
    }

    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(500).json({ error: "Integração de IA não configurada" });
      return;
    }

    const tipoMap: Record<string, string> = {
      promocao: "Promoção / Oferta especial",
      dica_saude: "Dica de saúde",
      produto_destaque: "Produto em destaque",
      sazonalidade: "Data sazonal / Campanha de saúde",
    };

    const tomMap: Record<string, string> = {
      formal: "formal e profissional",
      descontraido: "descontraído, próximo e amigável",
      urgente: "urgente, criando senso de oportunidade",
    };

    const horarioMap: Record<string, string> = {
      promocao: "11h–12h ou 19h–21h (pico de engajamento para promoções)",
      dica_saude: "7h–9h (manhã, quando as pessoas pensam em saúde)",
      produto_destaque: "12h–13h ou 18h–20h (hora de almoço e pós-trabalho)",
      sazonalidade: "8h–10h (manhã da data comemorativa)",
    };

    const systemPrompt = `Você é um especialista em marketing digital para farmácias no interior do Ceará, Brasil.
Crie conteúdo autêntico, próximo e engajante para o Instagram da Farmácia Arcanjo, localizada em Meruoca-CE.
A farmácia atende a comunidade local com produtos de saúde, medicamentos e cuidados pessoais.
Evite linguagem excessivamente corporativa. Use emojis relevantes com moderação.
Responda SOMENTE com JSON válido, sem nenhum texto fora do JSON.`;

    const userPrompt = `Crie um post para o Instagram da Farmácia Arcanjo.

Tipo de post: ${tipoMap[tipo] || tipo}
Tom desejado: ${tomMap[tom] || tom}
${produto ? `Produto/tema: ${produto}` : ""}
${topico ? `Contexto adicional: ${topico}` : ""}

Responda EXATAMENTE neste formato JSON:
{
  "texto": "Texto completo do post com emojis adequados. Máximo 2200 caracteres. Seja criativo, engajante e autêntico. Inclua chamada para ação no final.",
  "hashtags": "#farmáciaarcanjo #meruoca #ceará #saúde #farmácia #cuidados #bem-estar [adicione mais 8-12 hashtags relevantes ao tipo de post]",
  "horario": "Melhor horário e dia para postar este conteúdo, com explicação curta",
  "sugestao": "Uma dica rápida de como aumentar o engajamento deste post específico"
}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 1200,
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(502).json({ error: "Formato inválido retornado pela IA" });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error("Instagram route error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;
