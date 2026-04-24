// ═══════════════════════════════════════════════════
//  FIREBASE — Farmácia Arcanjo
//  Cole este arquivo no seu projeto Replit
// ═══════════════════════════════════════════════════

import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc,
         addDoc, setDoc, getDoc, getDocs,
         deleteDoc, onSnapshot, query,
         orderBy, serverTimestamp }             from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── CREDENCIAIS REAIS ──────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBojIfPxkkNnk-OYP80k6bGP6Fc_a4KJT4",
  authDomain:        "farmacia-arcanjo.firebaseapp.com",
  projectId:         "farmacia-arcanjo",
  storageBucket:     "farmacia-arcanjo.firebasestorage.app",
  messagingSenderId: "934974132501",
  appId:             "1:934974132501:web:d8248e9d6b76143874d91c",
  measurementId:     "G-XZZ7KT3W2N",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ═══════════════════════════════════════════════════
//  PRODUTOS
// ═══════════════════════════════════════════════════

/** Salvar ou atualizar produto */
export async function salvarProduto(produto) {
  try {
    if (produto.id) {
      await setDoc(doc(db, 'produtos', produto.id), {
        nome:      produto.nome,
        preco:     produto.preco,
        codigo:    produto.codigo    || '',
        categoria: produto.categoria || '',
        estoque:   produto.estoque   || 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await addDoc(collection(db, 'produtos'), {
        nome:      produto.nome,
        preco:     produto.preco,
        codigo:    produto.codigo    || '',
        categoria: produto.categoria || '',
        estoque:   produto.estoque   || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch(e) { console.error('salvarProduto:', e); return false; }
}

/** Buscar todos os produtos */
export async function buscarProdutos() {
  try {
    const snap = await getDocs(collection(db, 'produtos'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('buscarProdutos:', e); return []; }
}

/** Deletar produto */
export async function deletarProduto(id) {
  try {
    await deleteDoc(doc(db, 'produtos', id));
    return true;
  } catch(e) { console.error('deletarProduto:', e); return false; }
}

/** Escutar produtos em tempo real */
export function escutarProdutos(callback) {
  return onSnapshot(collection(db, 'produtos'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ═══════════════════════════════════════════════════
//  PEDIDOS
// ═══════════════════════════════════════════════════

/** Registrar novo pedido */
export async function registrarPedido(pedido) {
  try {
    const ref = await addDoc(collection(db, 'pedidos'), {
      cliente:   pedido.cliente   || 'Não informado',
      itens:     pedido.itens,
      total:     pedido.total,
      pagamento: pedido.pagamento,
      troco:     pedido.troco     || 0,
      status:    'concluido',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch(e) { console.error('registrarPedido:', e); return null; }
}

/** Buscar pedidos (mais recentes primeiro) */
export async function buscarPedidos() {
  try {
    const q    = query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('buscarPedidos:', e); return []; }
}

/** Escutar pedidos em tempo real */
export function escutarPedidos(callback) {
  const q = query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ═══════════════════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════════════════

/** Salvar cliente */
export async function salvarCliente(cliente) {
  try {
    if (cliente.id) {
      await setDoc(doc(db, 'clientes', cliente.id), {
        nome:      cliente.nome,
        telefone:  cliente.telefone || '',
        email:     cliente.email    || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await addDoc(collection(db, 'clientes'), {
        nome:      cliente.nome,
        telefone:  cliente.telefone || '',
        email:     cliente.email    || '',
        createdAt: serverTimestamp(),
      });
    }
    return true;
  } catch(e) { console.error('salvarCliente:', e); return false; }
}

/** Buscar todos os clientes */
export async function buscarClientes() {
  try {
    const snap = await getDocs(collection(db, 'clientes'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('buscarClientes:', e); return []; }
}

/** Deletar cliente */
export async function deletarCliente(id) {
  try {
    await deleteDoc(doc(db, 'clientes', id));
    return true;
  } catch(e) { console.error('deletarCliente:', e); return false; }
}

// ═══════════════════════════════════════════════════
//  LEMBRETES
// ═══════════════════════════════════════════════════

/** Salvar lembrete */
export async function salvarLembrete(lembrete) {
  try {
    if (lembrete.id) {
      await setDoc(doc(db, 'lembretes', lembrete.id), {
        titulo:     lembrete.titulo,
        mensagem:   lembrete.mensagem   || '',
        data:       lembrete.data       || '',
        recorrente: lembrete.recorrente || false,
        updatedAt:  serverTimestamp(),
      }, { merge: true });
    } else {
      await addDoc(collection(db, 'lembretes'), {
        titulo:     lembrete.titulo,
        mensagem:   lembrete.mensagem   || '',
        data:       lembrete.data       || '',
        recorrente: lembrete.recorrente || false,
        createdAt:  serverTimestamp(),
      });
    }
    return true;
  } catch(e) { console.error('salvarLembrete:', e); return false; }
}

/** Buscar lembretes */
export async function buscarLembretes() {
  try {
    const snap = await getDocs(collection(db, 'lembretes'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('buscarLembretes:', e); return []; }
}

/** Deletar lembrete */
export async function deletarLembrete(id) {
  try {
    await deleteDoc(doc(db, 'lembretes', id));
    return true;
  } catch(e) { console.error('deletarLembrete:', e); return false; }
}

// ═══════════════════════════════════════════════════
//  CAIXA
// ═══════════════════════════════════════════════════

/** Registrar fechamento de caixa */
export async function registrarFechamentoCaixa(dados) {
  try {
    await addDoc(collection(db, 'caixa'), {
      data:       dados.data,
      totalVendas: dados.totalVendas,
      totalPedidos: dados.totalPedidos,
      dinheiro:   dados.dinheiro   || 0,
      pix:        dados.pix        || 0,
      debito:     dados.debito     || 0,
      credito:    dados.credito    || 0,
      observacao: dados.observacao || '',
      createdAt:  serverTimestamp(),
    });
    return true;
  } catch(e) { console.error('registrarFechamentoCaixa:', e); return false; }
}

/** Buscar histórico de caixa */
export async function buscarHistoricoCaixa() {
  try {
    const q    = query(collection(db, 'caixa'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { console.error('buscarHistoricoCaixa:', e); return []; }
}

// Exporta db para uso direto se necessário
export { db };