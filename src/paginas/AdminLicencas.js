/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { db } from "../configuracoes/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

// ---------------------------------------------------------------------
// 🔑 FUNÇÃO AUXILIAR: Gerar Chave Aleatória
// ---------------------------------------------------------------------
function gerarChaveAleatoria() {
  const parte1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const parte2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LIC-${parte1}-${parte2}`;
}

export default function AdminLicencas() {
  const [formData, setFormData] = useState({
    cpfCnpj: "",
    plano: "basic",
    diasValidade: 365,
    nomeCliente: "",
    email: "",
    telefone: "",
  });

  const [loading, setLoading] = useState(false);
  const [licencas, setLicencas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("cadastro");

  const inputStyle = {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    marginBottom: "10px",
    width: "100%",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    padding: "10px 15px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  };

  // ---------------------------------------------------------------------
  // 🔥 Buscar licenças quando acessar aba Consultar
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (abaAtiva === "consultar") {
      carregarLicencas();
    }
  }, [abaAtiva]);

  const carregarLicencas = async () => {
    console.log("📥 Carregando licenças...");

    setCarregando(true);
    try {
      const q = query(
        collection(db, "licencas"),
        orderBy("dataCriacao", "desc")
      );

      const snapshot = await getDocs(q);

      const arr = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("📄 Licenças carregadas:", arr);
      setLicencas(arr);

    } catch (error) {
      console.error("❌ Erro ao carregar licenças:", error);
      alert("Erro ao carregar licenças: " + error.message);
    } finally {
      setCarregando(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🔧 Controle de Inputs
  // ---------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "diasValidade" ? Number(value) : value,
    }));
  };

  // ---------------------------------------------------------------------
  // 🔥 Criar nova licença (com chave automática)
  // ---------------------------------------------------------------------
  const handleCriarLicenca = async (e) => {
    e.preventDefault();
    console.log("🔥 handleCriarLicenca DISPAROU!");

    if (loading) return;

    if (!formData.cpfCnpj || !formData.nomeCliente) {
      alert("CPF/CNPJ e Nome do Cliente são obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const novaChave = gerarChaveAleatoria();
      console.log("🔑 Chave gerada:", novaChave);

      const dataExpiracao = new Date();
      dataExpiracao.setDate(
        dataExpiracao.getDate() + Number(formData.diasValidade)
      );

      const licencaData = {
        ...formData,
        chave: novaChave,
        ativa: true,
        dataCriacao: serverTimestamp(),
        dataExpiracao,
      };

      console.log("📦 Enviando para Firestore:", licencaData);

      await addDoc(collection(db, "licencas"), licencaData);

      alert(
        `✅ Licença criada com sucesso!\n\n🔑 CHAVE: ${novaChave}\nCopie e envie ao cliente.`
      );

      setFormData({
        cpfCnpj: "",
        plano: "basic",
        diasValidade: 365,
        nomeCliente: "",
        email: "",
        telefone: "",
      });

      if (abaAtiva === "consultar") {
        await carregarLicencas();
      }

    } catch (error) {
      console.error("❌ ERRO AO CRIAR LICENÇA:", error);
      alert("Erro ao criar licença: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🔄 Ativar/Desativar Licença
  // ---------------------------------------------------------------------
  const toggleAtivacao = async (id, ativa, diasValidade) => {
    if (!window.confirm("Tem certeza que deseja alterar o status desta licença?"))
      return;

    setCarregando(true);

    try {
      const ref = doc(db, "licencas", id);

      const updates = {
        ativa: !ativa,
      };

      if (!ativa) {
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + diasValidade);
        updates.dataExpiracao = novaData;
      }

      await updateDoc(ref, updates);

      alert("Status atualizado!");
      carregarLicencas();

    } catch (error) {
      console.error("❌ Erro ao atualizar:", error);
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🔵 RENDERIZAÇÃO (JSX)
  // ---------------------------------------------------------------------
  const cardStyle = {
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "15px",
    backgroundColor: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>🛠️ Painel de Administrador (Licenças)</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setAbaAtiva("cadastro")}
          style={{
            ...buttonStyle,
            backgroundColor: abaAtiva === "cadastro" ? "#007bff" : "#6c757d",
            marginRight: "10px",
          }}
        >
          ➕ Nova Licença
        </button>

        <button
          onClick={() => setAbaAtiva("consultar")}
          style={{
            ...buttonStyle,
            backgroundColor: abaAtiva === "consultar" ? "#007bff" : "#6c757d",
          }}
        >
          📋 Consultar Licenças ({licencas?.length || 0})
        </button>
      </div>

      {/* ================================================================= */}
      {/* 🟢 ABA: CADASTRAR LICENÇA */}
      {/* ================================================================= */}
      {abaAtiva === "cadastro" && (
        <form
          onSubmit={handleCriarLicenca}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <div style={{ gridColumn: "1 / -1", background: "#e2e3e5", padding: "10px", textAlign: "center", borderRadius: "5px" }}>
            ℹ️ A <strong>Chave da Licença</strong> será gerada automaticamente.
          </div>

          <input
            type="text"
            name="nomeCliente"
            placeholder="Nome Completo / Razão Social"
            value={formData.nomeCliente}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <input
            type="text"
            name="cpfCnpj"
            placeholder="CPF/CNPJ"
            value={formData.cpfCnpj}
            onChange={handleChange}
            style={inputStyle}
            required
          />

          <select
            name="plano"
            value={formData.plano}
            onChange={handleChange}
            style={inputStyle}
          >
            <option value="basic">Plano Básico</option>
            <option value="premium">Plano Premium</option>
          </select>

          <input
            type="number"
            name="diasValidade"
            placeholder="Validade (dias)"
            value={formData.diasValidade}
            onChange={handleChange}
            style={inputStyle}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email (opcional)"
            value={formData.email}
            onChange={handleChange}
            style={inputStyle}
          />
          <input
            type="text"
            name="telefone"
            placeholder="Telefone (opcional)"
            value={formData.telefone}
            onChange={handleChange}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              backgroundColor: loading ? "#6c757d" : "#28a745",
              gridColumn: "1 / -1",
              fontSize: "16px",
            }}
          >
            {loading ? "Gerando Licença..." : "✨ Cadastrar e Gerar Chave"}
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* 🔵 ABA: CONSULTAR LICENÇAS */}
      {/* ================================================================= */}
      {abaAtiva === "consultar" && (
        <div style={{ marginTop: "20px" }}>
          {carregando && <h3>Carregando licenças...</h3>}

          {!carregando && licencas.length === 0 && <p>Nenhuma licença cadastrada.</p>}

          {!carregando &&
            licencas.map((lic) => (
              <div key={lic.id} style={cardStyle}>
                <h3 style={{ color: "#007bff" }}>{lic.chave}</h3>
                <p><strong>Cliente:</strong> {lic.nomeCliente}</p>
                <p><strong>CPF/CNPJ:</strong> {lic.cpfCnpj}</p>
                <p><strong>Plano:</strong> {lic.plano}</p>
                <p>
                  <strong>Expiração:</strong>{" "}
                  {lic.dataExpiracao?.toDate
                    ? lic.dataExpiracao.toDate().toLocaleDateString("pt-BR")
                    : "Data inválida"}
                </p>

                <button
                  onClick={() => toggleAtivacao(lic.id, lic.ativa, lic.diasValidade)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: lic.ativa ? "#dc3545" : "#28a745",
                    marginTop: "10px",
                  }}
                >
                  {lic.ativa ? "🚫 Desativar" : "✅ Ativar"}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
