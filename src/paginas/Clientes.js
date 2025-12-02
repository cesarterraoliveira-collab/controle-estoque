// --- CLIENTES.JS MODERNO (ESTILO STARTUP – ARREDONDADO SUAVE) --- 

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

// Modal moderno
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

// Helpers de máscara
const apenasNumeros = (s = "") => (s || "").replace(/\D/g, "");

function formatCpfCnpj(raw = "") {
  const v = apenasNumeros(raw);
  if (v.length <= 11) {
    // CPF: 000.000.000-00
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  } else {
    // CNPJ: 00.000.000/0000-00
    return v
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
      .slice(0, 18);
  }
}

function formatCep(raw = "") {
  const v = apenasNumeros(raw).slice(0, 8);
  return v.length > 5 ? v.replace(/^(\d{5})(\d)/, "$1-$2") : v;
}

// Componente principal
export default function Clientes() {
  const { licencaAtiva, cnpj } = useAuth();

  const [formData, setFormData] = useState({
    nome: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    cep: "",
    rua: "",
    bairro: "",
    cidade: "",
    estado: "",
    observacao: "",
    codigo: "",
  });

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("cadastro");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Gerar código automático
  const gerarCodigoCliente = async () => {
    if (!cnpj) return "000001";
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const ref = doc(db, "contadores", cnpjLimpo);

    let existente = null;
    try {
      const s2 = await getDocs(query(collection(db, "contadores")));
      s2.docs.forEach((d) => {
        if (d.id === cnpjLimpo) existente = d;
      });
    } catch (err) {
      // ignore
    }

    if (!existente) {
      try {
        await setDoc(ref, { proximoCodigoCliente: 1 });
      } catch (err) {
        // ignore
      }
      return "000001";
    }

    const atual = existente.data()?.proximoCodigoCliente || 1;
    const novo = atual + 1;
    await updateDoc(ref, { proximoCodigoCliente: novo });
    return String(atual).padStart(6, "0");
  };

  // Buscar clientes
  const buscarClientes = async () => {
    if (!cnpj) return;
    try {
      const q = query(
        collection(db, "clientes"),
        where("licencaCnpj", "==", cnpj),
        orderBy("nome", "asc")
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClientes(lista);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (licencaAtiva && cnpj && abaAtiva === "lista") buscarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licencaAtiva, cnpj, abaAtiva]);

  // Handlers
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCpfCnpjChange = (e) =>
    setFormData({ ...formData, cpfCnpj: formatCpfCnpj(e.target.value) });

  const handleCepChange = (e) =>
    setFormData({ ...formData, cep: formatCep(e.target.value) });

  // Submit cadastro
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome) return alert("Nome é obrigatório.");

    setLoading(true);
    try {
      const codigo = await gerarCodigoCliente();
      const dados = {
        ...formData,
        licencaCnpj: cnpj,
        codigo,
        dataCriacao: serverTimestamp(),
      };
      await addDoc(collection(db, "clientes"), dados);
      alert("Cliente cadastrado com sucesso!");
      setFormData({
        nome: "",
        cpfCnpj: "",
        telefone: "",
        email: "",
        cep: "",
        rua: "",
        bairro: "",
        cidade: "",
        estado: "",
        observacao: "",
        codigo: "",
      });
      if (abaAtiva === "lista") buscarClientes();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar cliente: " + (err.message || err));
    }
    setLoading(false);
  };

  // Excluir cliente
  const excluirCliente = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    try {
      await deleteDoc(doc(db, "clientes", id));
      alert("Cliente excluído!");
      buscarClientes();
    } catch (err) {
      alert("Erro ao excluir: " + (err.message || err));
    }
  };

  // Abrir edição
  const abrirEditar = (cliente) => {
    setEditingClient(cliente);
    setEditForm({
      nome: cliente.nome || "",
      cpfCnpj: cliente.cpfCnpj || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cep: cliente.cep || "",
      rua: cliente.rua || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      observacao: cliente.observacao || "",
      codigo: cliente.codigo || "",
    });
    setShowEditModal(true);
  };

  // Salvar edição
  const salvarEdicao = async () => {
    if (!editingClient) return;
    try {
      await updateDoc(doc(db, "clientes", editingClient.id), {
        ...editForm,
      });
      alert("Cliente atualizado!");
      setShowEditModal(false);
      buscarClientes();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + (err.message || err));
    }
  };

  const clientesFiltrados = clientes.filter((c) => {
    const termo = (termoPesquisa || "").toLowerCase();
    return (
      (c.nome || "").toLowerCase().includes(termo) ||
      ((c.codigo || "") + "").toLowerCase().includes(termo) ||
      ((c.cpfCnpj || "") + "").toLowerCase().includes(termo)
    );
  });

  if (!licencaAtiva)
    return <div style={{ padding: 20 }}>Carregando licença...</div>;

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", marginBottom: 20, color: "#333" }}>
        👥 Clientes
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
          ➕ Novo Cliente
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
          📋 Lista de Clientes
        </button>
      </div>

      {/* FORMULÁRIO DE CADASTRO */}
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
            name="cpfCnpj"
            placeholder="CPF ou CNPJ"
            value={formData.cpfCnpj}
            onChange={handleCpfCnpjChange}
            style={inputStyle}
          />

          <input
            name="telefone"
            placeholder="Telefone"
            value={formData.telefone}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle}
          />

          {/* Endereço quebrado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <input
              name="cep"
              placeholder="CEP"
              value={formData.cep}
              onChange={handleCepChange}
              style={inputStyle}
            />
            <input
              name="rua"
              placeholder="Rua / Logradouro"
              value={formData.rua}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              name="bairro"
              placeholder="Bairro"
              value={formData.bairro}
              onChange={handleChange}
              style={inputStyle}
            />
            <input
              name="cidade"
              placeholder="Cidade"
              value={formData.cidade}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              name="estado"
              placeholder="Estado (UF)"
              value={formData.estado}
              onChange={(e) =>
                setFormData({ ...formData, estado: e.target.value.toUpperCase().slice(0, 2) })
              }
              style={inputStyle}
            />
            <input
              name="observacao"
              placeholder="Observação (opcional)"
              value={formData.observacao}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

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
            {loading ? "Salvando..." : "Salvar Cliente"}
          </button>
        </form>
      )}

      {/* LISTA DE CLIENTES */}
      {abaAtiva === "lista" && (
        <div>
          <input
            placeholder="Pesquisar cliente..."
            value={termoPesquisa}
            onChange={(e) => setTermoPesquisa(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          <div style={{ display: "grid", gap: 12 }}>
            {clientesFiltrados.map((c) => (
              <div
                key={c.id}
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
                      {c.nome}
                    </div>

                    <div style={{ color: "#666", marginTop: 6 }}>
                      Código: <strong>{c.codigo}</strong> • {c.cpfCnpj || ""}
                    </div>

                    <div style={{ color: "#666", marginTop: 6 }}>{c.telefone || ""}</div>

                    <div style={{ color: "#666", marginTop: 6 }}>
                      {c.rua ? `${c.rua}${c.bairro ? " • " + c.bairro : ""}` : c.endereco || ""}
                      {c.cidade ? ` • ${c.cidade}${c.estado ? " - " + c.estado : ""}` : ""}
                      {c.cep ? ` • CEP: ${c.cep}` : ""}
                    </div>

                    {c.observacao ? (
                      <div style={{ color: "#555", marginTop: 6 }}>Obs: {c.observacao}</div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => abrirEditar(c)}
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
                      onClick={() => excluirCliente(c.id, c.nome)}
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

      {/* MODAL DE EDIÇÃO */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h3 style={{ marginBottom: 20 }}>Editar Cliente</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={editForm.nome || ""}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              placeholder="Nome"
              style={inputStyle}
            />

            <input
              value={editForm.cpfCnpj || ""}
              onChange={(e) => setEditForm({ ...editForm, cpfCnpj: formatCpfCnpj(e.target.value) })}
              placeholder="CPF ou CNPJ"
              style={inputStyle}
            />

            <input
              value={editForm.telefone || ""}
              onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              placeholder="Telefone"
              style={inputStyle}
            />

            <input
              value={editForm.email || ""}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Email"
              style={inputStyle}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <input
                value={editForm.cep || ""}
                onChange={(e) => setEditForm({ ...editForm, cep: formatCep(e.target.value) })}
                placeholder="CEP"
                style={inputStyle}
              />
              <input
                value={editForm.rua || ""}
                onChange={(e) => setEditForm({ ...editForm, rua: e.target.value })}
                placeholder="Rua / Logradouro"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                value={editForm.bairro || ""}
                onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })}
                placeholder="Bairro"
                style={inputStyle}
              />
              <input
                value={editForm.cidade || ""}
                onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })}
                placeholder="Cidade"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                value={editForm.estado || ""}
                onChange={(e) => setEditForm({ ...editForm, estado: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="Estado (UF)"
                style={inputStyle}
              />
              <input
                value={editForm.observacao || ""}
                onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value })}
                placeholder="Observação"
                style={inputStyle}
              />
            </div>

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
