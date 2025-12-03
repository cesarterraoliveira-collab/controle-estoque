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
  where
} from "firebase/firestore";

// ---------------------------------------------------------------------
// 🔑 GERAR CHAVE DE LICENÇA
// ---------------------------------------------------------------------
function gerarChaveAleatoria() {
  const bloco1 = Math.random().toString(36).substring(2, 7).toUpperCase();
  const bloco2 = Math.random().toString(36).substring(2, 7).toUpperCase();
  const bloco3 = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LIC-${bloco1}-${bloco2}-${bloco3}`;
}

// ---------------------------------------------------------------------
// 📝 REGISTRAR LOG DE ATIVAÇÃO (MODELO A)
// ---------------------------------------------------------------------
async function registrarLogAtivacao(chave) {
  try {
    await addDoc(collection(db, "logAtivacoes"), {
      chave,
      data: serverTimestamp(),
    });
    console.log("📌 Log registrado para:", chave);
  } catch (error) {
    console.error("❌ Erro ao registrar log:", error);
  }
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
  const [logs, setLogs] = useState([]);
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
  // 🔥 Carregar listas ao abrir abas
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (abaAtiva === "consultar") carregarLicencas();
    if (abaAtiva === "logs") carregarLogs();
  }, [abaAtiva]);

  const carregarLicencas = async () => {
    setCarregando(true);
    try {
      const q = query(
        collection(db, "licencas"),
        orderBy("dataCriacao", "desc")
      );
      const snapshot = await getDocs(q);
      const arr = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLicencas(arr);
    } catch (error) {
      alert("Erro ao carregar licenças: " + error.message);
    } finally {
      setCarregando(false);
    }
  };

  const carregarLogs = async () => {
    setCarregando(true);
    try {
      const q = query(
        collection(db, "logAtivacoes"),
        orderBy("data", "desc")
      );
      const snapshot = await getDocs(q);
      const arr = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLogs(arr);
    } catch (e) {
      alert("Erro ao carregar logs: " + e.message);
    } finally {
      setCarregando(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🔧 Inputs
  // ---------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "diasValidade" ? Number(value) : value,
    }));
  };

  // ---------------------------------------------------------------------
  // 🔥 Criar nova licença
  // ---------------------------------------------------------------------
  const handleCriarLicenca = async (e) => {
    e.preventDefault();

    if (!formData.cpfCnpj || !formData.nomeCliente)
      return alert("CPF/CNPJ e Nome do Cliente são obrigatórios.");

    setLoading(true);

    try {
      // 🔍 Verificar duplicidade de CPF/CNPJ
      const q = query(
        collection(db, "licencas"),
        where("cpfCnpj", "==", formData.cpfCnpj)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const dados = snapshot.docs[0].data();
        setLoading(false);

        return alert(
          `⚠️ Já existe uma licença cadastrada para este CPF/CNPJ!\n\n` +
          `➡ Cliente: ${dados.nomeCliente}\n` +
          `➡ Chave: ${dados.chave}\n\n` +
          `Não é permitido criar duas licenças com o mesmo CPF/CNPJ.`
        );
      }

      const novaChave = gerarChaveAleatoria();

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

      await addDoc(collection(db, "licencas"), licencaData);

      alert(`✅ Licença criada!\nChave: ${novaChave}`);

      setFormData({
        cpfCnpj: "",
        plano: "basic",
        diasValidade: 365,
        nomeCliente: "",
        email: "",
        telefone: "",
      });

      if (abaAtiva === "consultar") carregarLicencas();
    } catch (error) {
      alert("Erro ao criar licença: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🔄 Ativar/Desativar
  // ---------------------------------------------------------------------
  const toggleAtivacao = async (id, ativa, diasValidade, chave) => {
    if (!window.confirm("Alterar status desta licença?")) return;

    setCarregando(true);

    try {
      const ref = doc(db, "licencas", id);

      const updates = { ativa: !ativa };

      if (!ativa) {
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + diasValidade);
        updates.dataExpiracao = novaData;

        // 👉 Registrar log apenas QUANDO ATIVAR
        await registrarLogAtivacao(chave);
      }

      await updateDoc(ref, updates);
      carregarLicencas();
    } catch (error) {
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  };

  // ---------------------------------------------------------------------
  // 🖼️ Renderização
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
      <h1>🛠️ Painel de Administrador (Licenças + Logs)</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setAbaAtiva("cadastro")}
          style={{
            ...buttonStyle,
            backgroundColor:
              abaAtiva === "cadastro" ? "#007bff" : "#6c757d",
            marginRight: "10px",
          }}
        >
          ➕ Nova Licença
        </button>

        <button
          onClick={() => setAbaAtiva("consultar")}
          style={{
            ...buttonStyle,
            backgroundColor:
              abaAtiva === "consultar" ? "#007bff" : "#6c757d",
            marginRight: "10px",
          }}
        >
          📋 Consultar Licenças ({licencas?.length || 0})
        </button>

        <button
          onClick={() => setAbaAtiva("logs")}
          style={{
            ...buttonStyle,
            backgroundColor: abaAtiva === "logs" ? "#007bff" : "#6c757d",
          }}
        >
          📜 Logs de Ativações
        </button>
      </div>

      {/* ABA: CADASTRO */}
      {abaAtiva === "cadastro" && (
        <form
          onSubmit={handleCriarLicenca}
          style={{
            backgroundColor: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #dedede",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
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
              gridColumn: "1 / -1",
              ...buttonStyle,
              backgroundColor: loading ? "#6c757d" : "#28a745",
            }}
          >
            {loading ? "Gerando..." : "✨ Gerar Licença"}
          </button>
        </form>
      )}

      {/* ABA: CONSULTAR */}
      {abaAtiva === "consultar" && (
        <div>
          {carregando && <p>Carregando...</p>}

          {!carregando &&
            licencas.map((lic) => (
              <div key={lic.id} style={cardStyle}>
                <h3>{lic.chave}</h3>
                <p>
                  <strong>Cliente:</strong> {lic.nomeCliente}
                </p>
                <p>
                  <strong>CPF/CNPJ:</strong> {lic.cpfCnpj}
                </p>
                <p>
                  <strong>Plano:</strong> {lic.plano}
                </p>
                <p>
                  <strong>Expira:</strong>{" "}
                  {lic.dataExpiracao?.toDate
                    ? lic.dataExpiracao.toDate().toLocaleDateString("pt-BR")
                    : "Inválida"}
                </p>

                <button
                  onClick={() =>
                    toggleAtivacao(
                      lic.id,
                      lic.ativa,
                      lic.diasValidade,
                      lic.chave
                    )
                  }
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

      {/* ABA: LOGS */}
      {abaAtiva === "logs" && (
        <div>
          <h2>📜 Logs de Ativações</h2>

          {carregando && <p>Carregando logs...</p>}

          {!carregando &&
            logs.map((log) => (
              <div key={log.id} style={cardStyle}>
                <p>
                  <strong>Chave:</strong> {log.chave}
                </p>
                <p>
                  <strong>Data:</strong>{" "}
                  {log.data?.toDate
                    ? log.data.toDate().toLocaleString("pt-BR")
                    : "Inválida"}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
