// src/componentes/FormMovimentacao.js
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  runTransaction
} from "firebase/firestore";
import { db } from "../configuracoes/firebaseConfig";
import { useAuth } from "../configuracoes/AuthContext";

export default function FormMovimentacao({ onMovimentacaoSucesso }) {
  const { licenca, cnpj } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filtroProduto, setFiltroProduto] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [tipo, setTipo] = useState("venda");
  const [quantidade, setQuantidade] = useState(1);
  const [clienteId, setClienteId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Carrega produtos + clientes
  useEffect(() => {
    if (!cnpj) return;

    const carregar = async () => {
      try {
        const qP = query(collection(db, "produtos"), where("licencaCnpj", "==", cnpj));
        const snapP = await getDocs(qP);
        const arrP = snapP.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!mountedRef.current) return;
        setProdutos(arrP);
        setProdutosFiltrados(arrP.slice(0, 20));

        const qC = query(collection(db, "clientes"), where("licencaCnpj", "==", cnpj));
        const snapC = await getDocs(qC);
        const arrC = snapC.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!mountedRef.current) return;
        setClientes(arrC);
      } catch (error) {
        console.error("Erro ao carregar produtos/clientes:", error);
      }
    };

    carregar();
  }, [cnpj]);

  // Filtrar produtos em tempo real
  useEffect(() => {
    const term = (filtroProduto || "").trim().toLowerCase();
    if (!term) {
      setProdutosFiltrados(produtos.slice(0, 50));
      return;
    }
    const filtrados = produtos.filter(p => {
      return (
        (p.nome && p.nome.toLowerCase().includes(term)) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term)) ||
        (p.tamanho && p.tamanho.toLowerCase().includes(term)) ||
        (p.cor && p.cor.toLowerCase().includes(term))
      );
    });
    setProdutosFiltrados(filtrados.slice(0, 100));
  }, [filtroProduto, produtos]);

  const selecionarProduto = (p) => {
    setProdutoSelecionado(p);
    setFiltroProduto(p.nome || p.codigoBarras || "");
  };

  const limpar = () => {
    setProdutoSelecionado(null);
    setTipo("venda");
    setQuantidade(1);
    setClienteId("");
    setObservacao("");
    setFiltroProduto("");
  };

  const tiposMap = [
    { value: "venda", label: "SAÍDA - Venda", sinal: -1 },
    { value: "extravio", label: "SAÍDA - Extravio", sinal: -1 },
    { value: "outros", label: "SAÍDA - Outros", sinal: -1 },
    { value: "compra", label: "ENTRADA - Compra", sinal: +1 },
    { value: "devolucao", label: "ENTRADA - Devolução", sinal: +1 },
    { value: "ajuste", label: "AJUSTE", sinal: 0 }
  ];

  // 💾 SALVAR MOVIMENTAÇÃO
  const handleSalvar = async (e) => {
    e && e.preventDefault();

    if (!produtoSelecionado) {
      alert("Selecione um produto antes de registrar a movimentação.");
      return;
    }

    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      alert("Informe uma quantidade válida (>0).");
      return;
    }

    setLoading(true);

    try {
      const produtoRef = doc(db, "produtos", produtoSelecionado.id);
      const movCollection = collection(db, "movimentacoes");

      await runTransaction(db, async (transaction) => {
        const prodSnap = await transaction.get(produtoRef);
        if (!prodSnap.exists()) throw new Error("Produto não encontrado.");

        const prodData = prodSnap.data();
        const estoqueAtual = Number(prodData.estoqueAtual || 0);

        const tipoObj = tiposMap.find(t => t.value === tipo) || { sinal: 0 };
        let novoEstoque =
          tipoObj.value === "ajuste"
            ? estoqueAtual + qtd
            : estoqueAtual + (tipoObj.sinal * qtd);

        if (novoEstoque < 0) throw new Error("Estoque insuficiente.");

        transaction.update(produtoRef, { estoqueAtual: novoEstoque });

        // 🔵 NOVO: Adiciona clienteNome à movimentação
        const clienteNome =
          clienteId ? clientes.find(c => c.id === clienteId)?.nome || null : null;

        const movDados = {
          licenca: licenca || null,
          produtoId: produtoSelecionado.id,
          produtoNome: produtoSelecionado.nome || null,
          tipo: tipoObj.value,
          quantidade: qtd,
          clienteId: clienteId || null,
          clienteNome, // <-- AQUI O AJUSTE
          observacao: observacao || null,
          usuario: "manual",
          data: serverTimestamp(),
        };

        const novoDocRef = doc(movCollection);
        transaction.set(novoDocRef, movDados);
      });

      alert("Movimentação registrada com sucesso!");
      if (onMovimentacaoSucesso) onMovimentacaoSucesso();
      limpar();

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert(error.message || "Erro ao registrar movimentação.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSalvar}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60% 40%",
          gap: 20,
          alignItems: "start"
        }}
      >
        {/* ESQUERDA - Lista de produtos */}
        <div>
          <label style={{ fontWeight: 700 }}>Produto</label>
          <input
            placeholder="Pesquise por nome ou código..."
            value={filtroProduto}
            onChange={(e) => setFiltroProduto(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ccc", marginBottom: 6 }}
          />

          <div style={{
            maxHeight: 280,
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: 6,
            padding: 6,
            background: "white"
          }}>
            {produtosFiltrados.length === 0 ? (
              <div style={{ padding: 8, color: "#666" }}>Nenhum produto encontrado.</div>
            ) : (
              produtosFiltrados.map(p => (
                <div
                  key={p.id}
                  onClick={() => selecionarProduto(p)}
                  style={{
                    padding: 8,
                    borderRadius: 6,
                    cursor: "pointer",
                    backgroundColor: produtoSelecionado?.id === p.id ? "#e9f7ef" : "transparent",
                    border: produtoSelecionado?.id === p.id ? "1px solid #28a745" : "1px solid transparent",
                    marginBottom: 6
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Estoque: {p.estoqueAtual ?? 0} • Cod: {p.codigoBarras || "—"} • {p.cor || ""} {p.tamanho || ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DIREITA - Campos da movimentação */}
        <div>
          <label style={{ fontWeight: 700 }}>Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, marginBottom: 10 }}
          >
            <option value="venda">SAÍDA - Venda</option>
            <option value="extravio">SAÍDA - Extravio</option>
            <option value="outros">SAÍDA - Outros</option>
            <option value="compra">ENTRADA - Compra</option>
            <option value="devolucao">ENTRADA - Devolução</option>
            <option value="ajuste">AJUSTE</option>
          </select>

          <label style={{ fontWeight: 700 }}>Quantidade</label>
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, marginBottom: 10 }}
          />

          <label style={{ fontWeight: 700 }}>Cliente (opcional)</label>
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 6, marginBottom: 10 }}
          >
            <option value="">-- Sem cliente --</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nome} {c.cpfCnpj ? `• ${c.cpfCnpj}` : ""}
              </option>
            ))}
          </select>

          <label style={{ fontWeight: 700 }}>Observação</label>
          <input
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Obs (opcional)"
            style={{ width: "100%", padding: 10, borderRadius: 6, marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: 10, background: "#007bff", color: "#fff", border: "none", borderRadius: 6 }}
            >
              {loading ? "Registrando..." : "Registrar Movimentação"}
            </button>

            <button
              type="button"
              onClick={limpar}
              disabled={loading}
              style={{ padding: 10, background: "#6c757d", color: "#fff", border: "none", borderRadius: 6 }}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
