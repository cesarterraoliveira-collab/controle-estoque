// --- PRODUTOS.JS COM CAMPOS NUMÉRICOS E TAMANHO ---

import React, { useState, useEffect, useCallback } from "react";
import { db } from "../configuracoes/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { useAuth } from "../configuracoes/AuthContext";

// ===== ESTILOS =====
const containerStyle = {
  padding: "20px",
  backgroundColor: "#f5f7fb",
  borderRadius: "14px",
};

const inputStyle = {
  padding: "12px 14px",
  border: "1px solid #ccd2e0",
  borderRadius: "10px",
  fontSize: "16px",
  width: "100%",
  background: "#fff",
  transition: "0.2s",
};

// ===== MODAL =====
function Modal({ children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          width: "92%",
          maxWidth: 700,
          boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
        }}
      >
        {children}
        <div style={{ textAlign: "right", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#6c757d",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== COMPONENTE PRINCIPAL =====
export default function Produtos() {
  const { licencaAtiva, cnpj } = useAuth();

  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    tamanho: "",
    quantidadeInicial: "",
    estoqueMinimo: "",
    precoCompra: "",
    precoVenda: "",
    observacao: "",
  });

  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [termoPesquisa, setTermePesquisa] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("cadastro");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ===== GERAR CÓDIGO AUTOMÁTICO =====
  const gerarCodigoProduto = async () => {
    if (!cnpj) return "000001";
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const ref = doc(db, "contadores", cnpjLimpo);

    try {
      const codigo = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(ref);
        let proximo;

        if (!docSnap.exists()) {
          transaction.set(ref, { proximoCodigoProduto: 2 });
          proximo = 1;
        } else {
          const atual = docSnap.data().proximoCodigoProduto || 1;
          proximo = atual;
          transaction.update(ref, { proximoCodigoProduto: atual + 1 });
        }

        return String(proximo).padStart(6, "0");
      });

      return codigo;
    } catch (err) {
      console.error("Erro ao gerar código:", err);
      return "000001";
    }
  };

  // ===== BUSCAR PRODUTOS =====
  const buscarProdutos = useCallback(async () => {
    if (!cnpj) return;
    try {
      const q = query(
        collection(db, "produtos"),
        where("licencaCnpj", "==", cnpj),
        orderBy("nome", "asc")
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProdutos(lista);
    } catch (err) {
      console.error(err);
    }
  }, [cnpj]);

  // ===== useEffect =====
  useEffect(() => {
    if (licencaAtiva && cnpj && abaAtiva === "lista") buscarProdutos();
  }, [licencaAtiva, cnpj, abaAtiva, buscarProdutos]);

  // ===== HANDLERS =====
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ===== SUBMIT CADASTRO =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome) return alert("Nome é obrigatório.");

    setLoading(true);
    try {
      const codigo = await gerarCodigoProduto();
      const dados = {
        ...formData,
        licencaCnpj: cnpj,
        codigo,
        dataCriacao: serverTimestamp(),
      };
      await addDoc(collection(db, "produtos"), dados);
      alert("Produto cadastrado com sucesso!");
      setFormData({
        nome: "",
        codigo: "",
        tamanho: "",
        quantidadeInicial: "",
        estoqueMinimo: "",
        precoCompra: "",
        precoVenda: "",
        observacao: "",
      });
      if (abaAtiva === "lista") buscarProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar produto: " + (err.message || err));
    }
    setLoading(false);
  };

  // ===== EXCLUIR PRODUTO =====
  const excluirProduto = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "produtos", id));
      alert("Produto excluído!");
      buscarProdutos();
    } catch (err) {
      alert("Erro ao excluir: " + (err.message || err));
    }
  };

  // ===== ABRIR EDIÇÃO =====
  const abrirEditar = (produto) => {
    setEditingProduct(produto);
    setEditForm({ ...produto });
    setShowEditModal(true);
  };

  // ===== SALVAR EDIÇÃO =====
  const salvarEdicao = async () => {
    if (!editingProduct) return;
    try {
      await updateDoc(doc(db, "produtos", editingProduct.id), { ...editForm });
      alert("Produto atualizado!");
      setShowEditModal(false);
      buscarProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + (err.message || err));
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    const termo = (termoPesquisa || "").toLowerCase();
    return (
      (p.nome || "").toLowerCase().includes(termo) ||
      ((p.codigo || "") + "").toLowerCase().includes(termo)
    );
  });

  if (!licencaAtiva)
    return <div style={{ padding: 20 }}>Carregando licença...</div>;

  // ===== RENDER =====
  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>
        📦 Produtos
      </h2>

      {/* ABAS */}
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          marginBottom: 25,
        }}
      >
        <button
          onClick={() => setAbaAtiva("cadastro")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: abaAtiva === "cadastro" ? "#6a5acd" : "#d3d6ea",
            color: abaAtiva === "cadastro" ? "#fff" : "#333",
            cursor: "pointer",
          }}
        >
          ➕ Novo Produto
        </button>

        <button
          onClick={() => setAbaAtiva("lista")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: abaAtiva === "lista" ? "#6a5acd" : "#d3d6ea",
            color: abaAtiva === "lista" ? "#fff" : "#333",
            cursor: "pointer",
          }}
        >
          📋 Lista de Produtos
        </button>
      </div>

      {/* FORMULÁRIO */}
      {abaAtiva === "cadastro" && (
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 700,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            name="nome"
            placeholder="Nome *"
            value={formData.nome}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="tamanho"
            placeholder="Tamanho"
            value={formData.tamanho}
            onChange={handleChange}
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              type="number"
              name="quantidadeInicial"
              placeholder="Quantidade Inicial"
              value={formData.quantidadeInicial}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="number"
              name="estoqueMinimo"
              placeholder="Estoque Mínimo"
              value={formData.estoqueMinimo}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              type="number"
              step="0.01"
              name="precoCompra"
              placeholder="Preço de Compra"
              value={formData.precoCompra}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="number"
              step="0.01"
              name="precoVenda"
              placeholder="Preço de Venda"
              value={formData.precoVenda}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <input
            name="observacao"
            placeholder="Observação (opcional)"
            value={formData.observacao}
            onChange={handleChange}
            style={inputStyle}
          />

          {/* CÓDIGO AUTOMÁTICO */}
          <input
            disabled
            value={formData.codigo || "Gerado automaticamente"}
            style={{
              ...inputStyle,
              background: "#e9ecef",
              cursor: "not-allowed",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              padding: "14px",
              borderRadius: "10px",
              background: "#6a5acd",
              color: "#fff",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {loading ? "Salvando..." : "Salvar Produto"}
          </button>
        </form>
      )}

      {/* LISTA */}
      {abaAtiva === "lista" && (
        <div>
          <input
            placeholder="Pesquisar produto..."
            value={termoPesquisa}
            onChange={(e) => setTermePesquisa(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          <div style={{ display: "grid", gap: 12 }}>
            {produtosFiltrados.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  padding: 18,
                  borderRadius: 14,
                  boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                  borderLeft: "6px solid #6a5acd",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: 18, color: "#333" }}>
                      {p.nome} {p.tamanho && `(${p.tamanho})`}
                    </div>

                    <div style={{ color: "#666", marginTop: 6 }}>
                      Código: <strong>{p.codigo}</strong>
                    </div>

                    <div style={{ color: "#666", marginTop: 6 }}>
                      Estoque: {p.quantidadeInicial || "0"} • Mínimo:{" "}
                      {p.estoqueMinimo || "0"} • Preço: {p.precoVenda || ""}
                    </div>

                    {p.observacao && (
                      <div style={{ color: "#555", marginTop: 6 }}>
                        Obs: {p.observacao}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => abrirEditar(p)}
                      style={{
                        padding: "8px 12px",
                        background: "#4da3ff",
                        color: "#fff",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ✏ Editar
                    </button>

                    <button
                      onClick={() => excluirProduto(p.id, p.nome)}
                      style={{
                        padding: "8px 12px",
                        background: "#ff4d4d",
                        color: "#fff",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h3 style={{ marginBottom: 20 }}>Editar Produto</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={editForm.nome || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, nome: e.target.value })
              }
              placeholder="Nome"
              style={inputStyle}
            />

            <input
              value={editForm.tamanho || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, tamanho: e.target.value })
              }
              placeholder="Tamanho"
              style={inputStyle}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="number"
                value={editForm.quantidadeInicial || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    quantidadeInicial: e.target.value,
                  })
                }
                placeholder="Quantidade Inicial"
                style={inputStyle}
              />
              <input
                type="number"
                value={editForm.estoqueMinimo || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    estoqueMinimo: e.target.value,
                  })
                }
                placeholder="Estoque Mínimo"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="number"
                step="0.01"
                value={editForm.precoCompra || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    precoCompra: e.target.value,
                  })
                }
                placeholder="Preço de Compra"
                style={inputStyle}
              />
              <input
                type="number"
                step="0.01"
                value={editForm.precoVenda || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    precoVenda: e.target.value,
                  })
                }
                placeholder="Preço de Venda"
                style={inputStyle}
              />
            </div>

            <input
              value={editForm.observacao || ""}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  observacao: e.target.value,
                })
              }
              placeholder="Observação"
              style={inputStyle}
            />

            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button
                onClick={salvarEdicao}
                style={{
                  padding: "12px 18px",
                  borderRadius: 8,
                  background: "#6a5acd",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
