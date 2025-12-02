// --- PRODUTOS.JS COM BOTÃO DE EDITAR (CORRIGIDO) ---

import React, { useState, useEffect } from "react";
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
  setDoc,
} from "firebase/firestore";
import { useAuth } from "../configuracoes/AuthContext";
import { exportToCSV } from "../utils/exportUtils";

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

// Modal moderno (componente interno)
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
          maxWidth: 600,
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

export default function Produtos() {
  const { licencaAtiva, cnpj } = useAuth();

  const [formData, setFormData] = useState({
    nome: "",
    cor: "",
    tamanho: "",
    precoCusto: "",
    precoVenda: "",
    estoqueAtual: "",
    estoqueMinimo: "",
    codigo: "",
    codigoBarras: "",
    descricao: "",
  });

  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("cadastro");
  const [produtos, setProdutos] = useState([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState("todos");

  // Modal edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});

  // --- Código automático ---
  const gerarCodigoProduto = async () => {
    if (!cnpj) return "000001";
    const cnpjLimpo = cnpj.replace(/[^\d]/g, "");

    const docRef = doc(db, "contadores", cnpjLimpo);
    const snap = await getDocs(collection(db, "contadores"));

    let docExiste = null;
    snap.docs.forEach((d) => {
      if (d.id === cnpjLimpo) docExiste = d;
    });

    if (!docExiste) {
      await setDoc(docRef, { proximoCodigoProduto: 1 });
      return "000001";
    }

    const atual = docExiste.data().proximoCodigoProduto || 1;
    const novo = atual + 1;

    await updateDoc(docRef, { proximoCodigoProduto: novo });

    return String(atual).padStart(6, "0");
  };

  // Carregar produtos
  useEffect(() => {
    if (licencaAtiva && cnpj && abaAtiva === "estoque") {
      buscarProdutos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licencaAtiva, cnpj, abaAtiva]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Cadastrar produto
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.precoVenda) {
      alert("Nome e Preço de Venda são obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const codigoGerado = await gerarCodigoProduto();

      await addDoc(collection(db, "produtos"), {
        ...formData,
        licencaCnpj: cnpj,
        codigo: codigoGerado,
        estoqueAtual: Number(formData.estoqueAtual) || 0,
        estoqueMinimo: Number(formData.estoqueMinimo) || 5,
        precoCusto: Number(formData.precoCusto) || 0,
        precoVenda: Number(formData.precoVenda) || 0,
        dataCriacao: serverTimestamp(),
      });

      alert("Produto cadastrado com sucesso!");

      setFormData({
        nome: "",
        cor: "",
        tamanho: "",
        precoCusto: "",
        precoVenda: "",
        estoqueAtual: "",
        estoqueMinimo: "",
        descricao: "",
        codigoBarras: "",
        codigo: "",
      });

      if (abaAtiva === "estoque") buscarProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar produto: " + (err.message || err));
    }

    setLoading(false);
  };

  // Buscar produtos
  const buscarProdutos = async () => {
    if (!cnpj) return;

    setCarregandoProdutos(true);

    try {
      const q = query(
        collection(db, "produtos"),
        where("licencaCnpj", "==", cnpj),
        orderBy("nome", "asc")
      );

      const snap = await getDocs(q);
      setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoProdutos(false);
    }
  };

  // Deletar
  const excluirProduto = async (id, nome) => {
    if (!window.confirm(`Excluir produto "${nome}"?`)) return;

    try {
      await deleteDoc(doc(db, "produtos", id));
      buscarProdutos();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  };

  // Abrir modal de edição
  const abrirEditar = (produto) => {
    setEditingProduct(produto);
    setEditForm(produto);
    setShowEditModal(true);
  };

  // Salvar edição
  const salvarEdicao = async () => {
    if (!editingProduct) return;

    try {
      await updateDoc(doc(db, "produtos", editingProduct.id), {
        ...editForm,
        precoCusto: Number(editForm.precoCusto) || 0,
        precoVenda: Number(editForm.precoVenda) || 0,
        estoqueAtual: Number(editForm.estoqueAtual) || 0,
        estoqueMinimo: Number(editForm.estoqueMinimo) || 0,
      });

      alert("Produto atualizado!");
      setShowEditModal(false);
      buscarProdutos();
    } catch (err) {
      alert("Erro ao salvar: " + (err.message || err));
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    const termo = termoPesquisa.toLowerCase();
    const matchTexto =
      (p.nome || "").toLowerCase().includes(termo) ||
      ((p.codigo || "").toString().toLowerCase() || "").includes(termo);

    let matchEstoque = true;
    if (filtroEstoque === "baixo")
      matchEstoque = p.estoqueAtual <= (p.estoqueMinimo || 5);
    if (filtroEstoque === "zerado") matchEstoque = p.estoqueAtual === 0;

    return matchTexto && matchEstoque;
  });

  if (!licencaAtiva)
    return <div style={{ padding: 20 }}>Carregando licença...</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>
        📦 Produtos
      </h2>

      {/* --- Abas --- */}
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
          onClick={() => setAbaAtiva("estoque")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: abaAtiva === "estoque" ? "#6a5acd" : "#d3d6ea",
            color: abaAtiva === "estoque" ? "#fff" : "#333",
            cursor: "pointer",
          }}
        >
          📋 Estoque
        </button>
      </div>

      {/* --- Cadastro --- */}
      {abaAtiva === "cadastro" && (
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            name="nome"
            placeholder="Nome do Produto *"
            value={formData.nome}
            onChange={handleChange}
            style={inputStyle}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              name="cor"
              placeholder="Cor"
              value={formData.cor}
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
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              type="number"
              name="precoCusto"
              placeholder="Preço Custo"
              value={formData.precoCusto}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              type="number"
              name="precoVenda"
              placeholder="Preço Venda *"
              value={formData.precoVenda}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              type="number"
              name="estoqueAtual"
              placeholder="Estoque Inicial"
              value={formData.estoqueAtual}
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

          <input
            name="codigoBarras"
            placeholder="Código de Barras (opcional)"
            value={formData.codigoBarras}
            onChange={handleChange}
            style={inputStyle}
          />

          <textarea
            name="descricao"
            placeholder="Descrição (opcional)"
            value={formData.descricao}
            onChange={handleChange}
            style={{ ...inputStyle, minHeight: 80 }}
          />

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

      {/* --- Estoque --- */}
      {abaAtiva === "estoque" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Pesquisar..."
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />

            <select
              value={filtroEstoque}
              onChange={(e) => setFiltroEstoque(e.target.value)}
              style={{
                ...inputStyle,
                width: "200px",
                cursor: "pointer",
              }}
            >
              <option value="todos">Todos</option>
              <option value="baixo">Estoque Bajo</option>
              <option value="zerado">Sem Estoque</option>
            </select>

            <button
              onClick={() => {
                const dados = produtosFiltrados.map((p) => ({
                  NOME: p.nome,
                  ESTOQUE: p.estoqueAtual,
                  PRECO_VENDA: p.precoVenda,
                  CODIGO: p.codigo || "-",
                }));
                exportToCSV(dados, "produtos.csv");
              }}
              style={{
                background: "#6a5acd",
                border: "none",
                padding: "10px 20px",
                color: "#fff",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Exportar
            </button>
          </div>

          {carregandoProdutos ? (
            <p>Carregando...</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {produtosFiltrados.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#fff",
                    padding: 18,
                    borderRadius: 14,
                    boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
                    borderLeft:
                      p.estoqueAtual <= p.estoqueMinimo
                        ? "6px solid #ff9800"
                        : "6px solid #6a5acd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: 18,
                          color: "#333",
                        }}
                      >
                        {p.nome}
                      </div>

                      <div style={{ color: "#666", marginTop: 4 }}>
                        Código: <strong>{p.codigo}</strong>
                      </div>

                      <div style={{ color: "#666", marginTop: 4 }}>
                        Estoque: {p.estoqueAtual}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {/* BOTÃO EDITAR */}
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
          )}
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
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
              value={editForm.cor || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, cor: e.target.value })
              }
              placeholder="Cor"
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

            <input
              type="number"
              value={editForm.precoCusto || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, precoCusto: e.target.value })
              }
              placeholder="Preço de Custo"
              style={inputStyle}
            />

            <input
              type="number"
              value={editForm.precoVenda || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, precoVenda: e.target.value })
              }
              placeholder="Preço de Venda"
              style={inputStyle}
            />

            <input
              type="number"
              value={editForm.estoqueAtual || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, estoqueAtual: e.target.value })
              }
              placeholder="Estoque Atual"
              style={inputStyle}
            />

            <input
              type="number"
              value={editForm.estoqueMinimo || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, estoqueMinimo: e.target.value })
              }
              placeholder="Estoque Mínimo"
              style={inputStyle}
            />

            <textarea
              value={editForm.descricao || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, descricao: e.target.value })
              }
              placeholder="Descrição"
              style={{ ...inputStyle, minHeight: 80 }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#6c757d",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                onClick={salvarEdicao}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#4da3ff",
                  color: "#fff",
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
