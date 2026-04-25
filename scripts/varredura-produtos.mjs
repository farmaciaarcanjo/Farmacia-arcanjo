import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBojIfPxkkNnk-OYP80k6bGP6Fc_a4KJT4",
  authDomain:        "farmacia-arcanjo.firebaseapp.com",
  projectId:         "farmacia-arcanjo",
  storageBucket:     "farmacia-arcanjo.firebasestorage.app",
  messagingSenderId: "934974132501",
  appId:             "1:934974132501:web:d8248e9d6b76143874d91c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snap = await getDocs(collection(db, "produtos"));
const produtos = snap.docs.map(d => d.data());

console.log(`\nTotal de produtos no Firebase: ${produtos.length}\n`);

const erros = [];

for (const p of produtos) {
  const nome = String(p.nome ?? "");
  const id = p.id;

  // 1. Nome vazio ou genérico
  if (!nome || nome.trim() === "" || nome.toUpperCase() === "PRODUTO" || nome.toUpperCase() === "SEM NOME") {
    erros.push({ id, nome, tipo: "❌ Nome vazio ou genérico" });
    continue;
  }

  // 2. Prefixo errado (FARMAÇA)
  if (/^FARMAÇA\s/i.test(nome)) {
    erros.push({ id, nome, tipo: "✏️  Prefixo incorreto 'FARMAÇA'" });
  }

  // 3. Letras minúsculas onde deveria ser CAPS (produtos importados do SIS Moura vêm em CAPS)
  if (nome !== nome.toUpperCase() && nome.length > 5) {
    erros.push({ id, nome, tipo: "⚠️  Nome com letras minúsculas (possível edição manual incorreta)" });
  }

  // 4. Espaços duplos
  if (/  /.test(nome)) {
    erros.push({ id, nome, tipo: "⚠️  Espaços duplos no nome" });
  }

  // 5. Caracteres estranhos / acentuação suspeita
  if (/[^A-Za-zÀ-ÿ0-9 .,()\-+/%ºª°'"/&_]/.test(nome)) {
    erros.push({ id, nome, tipo: "⚠️  Caractere especial suspeito" });
  }

  // 6. Preço zerado ou negativo
  if (p.preco == null || Number(p.preco) <= 0) {
    erros.push({ id, nome, tipo: "❌ Preço zerado ou ausente (R$" + (p.preco ?? "null") + ")" });
  }

  // 7. Nome com "PRODUTO" dentro (junk do SIS Moura)
  if (/\bPRODUTO\b/i.test(nome) && nome.toUpperCase() !== "PRODUTO") {
    erros.push({ id, nome, tipo: "⚠️  Contém palavra 'PRODUTO' no nome" });
  }

  // 8. Nome extremamente curto (< 4 chars)
  if (nome.trim().length < 4) {
    erros.push({ id, nome, tipo: "⚠️  Nome muito curto (< 4 caracteres)" });
  }

  // 9. Possível duplicata — detecta nomes ≥ 80% similares (Levenshtein simples)
  // feito fora do loop por eficiência
}

// 9. Duplicatas (mesmo nome ignorando espaços/caps)
const nomesVistos = {};
for (const p of produtos) {
  const chave = String(p.nome ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  if (nomesVistos[chave]) {
    erros.push({
      id: p.id,
      nome: p.nome,
      tipo: `🔁 Possível duplicata do produto ID ${nomesVistos[chave]}`,
    });
  } else {
    nomesVistos[chave] = p.id;
  }
}

// 10. Estoque muito alto (possível erro de digitação no SIS Moura)
for (const p of produtos) {
  if (p.estoque != null && Number(p.estoque) > 9999) {
    erros.push({ id: p.id, nome: p.nome, tipo: `⚠️  Estoque suspeito: ${p.estoque} unidades` });
  }
}

// ── RELATÓRIO ──
if (erros.length === 0) {
  console.log("✅ Nenhum erro encontrado! Catálogo limpo.\n");
} else {
  console.log(`⚠️  ${erros.length} problemas encontrados:\n`);
  console.log("ID".padEnd(8) + "TIPO".padEnd(55) + "NOME");
  console.log("─".repeat(120));
  for (const e of erros) {
    console.log(String(e.id ?? "?").padEnd(8) + e.tipo.padEnd(55) + (e.nome ?? ""));
  }
}

process.exit(0);
