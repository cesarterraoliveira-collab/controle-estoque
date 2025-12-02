import { collection, doc, runTransaction } from "firebase/firestore";
import { db } from "../configuracoes/firebaseConfig";

export async function registrarMovimentoTransacao({
  produtoId,
  tipo,
  quantidade,
  observacao = "",
  usuario = "sistema",
  licencaCnpj, // 💡 NOVO: Recebe o CNPJ para vincular
}) {
  if (!licencaCnpj) throw new Error("CNPJ da licença é obrigatório para movimentar.");

  const produtoRef = doc(db, "produtos", produtoId);
  // 💡 CORREÇÃO: Nome da coleção padronizado para 'movimentacoes'
  const movimentosRef = collection(db, "movimentacoes"); 

  return runTransaction(db, async (transaction) => {
    const produtoSnap = await transaction.get(produtoRef);
    if (!produtoSnap.exists()) {
      throw new Error("Produto não encontrado.");
    }

    const produto = produtoSnap.data();
    // Verifica se o produto pertence à mesma licença (segurança extra)
    if (produto.licencaCnpj !== licencaCnpj) {
        throw new Error("Produto não pertence a esta licença.");
    }

    const estoqueAtual = Number(produto.estoqueAtual || 0); // Use estoqueAtual (camelCase) conforme Produtos.js
    const delta = tipo === "entrada" ? Number(quantidade) : -Number(quantidade);
    const novoEstoque = estoqueAtual + delta;

    if (novoEstoque < 0) {
      throw new Error("Estoque insuficiente para realizar esta operação.");
    }

    // Atualiza o estoque
    transaction.update(produtoRef, { estoqueAtual: novoEstoque });

    // Cria o registro de movimentação
    const movimento = {
      produtoId,
      produtoNome: produto.nome, // Salva o nome para facilitar relatórios
      tipo,
      quantidade: Number(quantidade),
      observacao,
      dataMovimentacao: new Date(), // Use dataMovimentacao para ordenar em Relatorios.js
      usuario,
      licencaCnpj, // 💡 VINCULA À LICENÇA
    };

    const novoDoc = doc(movimentosRef);
    transaction.set(novoDoc, movimento);

    return { novoEstoque };
  });
}