import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

router.post("/lara", async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body as {
      messages: ChatMessage[];
      systemPrompt: string;
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

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
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
