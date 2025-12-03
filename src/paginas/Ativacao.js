import React, { useState } from "react";
import { db } from "../configuracoes/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Ativacao({ onAtivacao }) {
  const [licenca, setLicenca] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const containerStyle = {
    width: "100%",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #007bff, #00a2ff)",
    padding: "20px",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "30px",
    borderRadius: "15px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  };

  const handleAtivar = async () => {
    setErro("");

    const chaveLimpa = licenca.trim();
    const cpfLimpo = cpfCnpj.trim();

    if (!chaveLimpa || !cpfLimpo) {
      setErro("Preencha todos os campos!");
      return;
    }

    setLoading(true);

    try {
      console.log("🔍 Buscando licença:", chaveLimpa, cpfLimpo);

      const q = query(
        collection(db, "licencas"),
        where("chave", "==", chaveLimpa),
        where("cpfCnpj", "==", cpfLimpo)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Licença não encontrada ou dados incorretos.");
      }

      const docEncontrado = querySnapshot.docs[0];
      const dadosLicenca = docEncontrado.data();

      console.log("Licença encontrada:", dadosLicenca);

      // 🚫 1 — BLOQUEIO DO PROBLEMA:
      if (!dadosLicenca.ativa) {
        throw new Error("Esta licença está desativada pelo administrador.");
      }

      // ⏳ 2 — bloqueio por expiração
      if (dadosLicenca.dataExpiracao) {
        const dataExp = dadosLicenca.dataExpiracao.toDate
          ? dadosLicenca.dataExpiracao.toDate()
          : new Date(dadosLicenca.dataExpiracao);

        if (dataExp < new Date()) {
          throw new Error("Esta licença expirou.");
        }
      }

      // 3 — Sucesso
      localStorage.setItem("licenca", chaveLimpa);
      localStorage.setItem("cnpj", cpfLimpo);
      localStorage.setItem("licencaInfo", JSON.stringify(dadosLicenca));

      alert(`Bem-vindo(a), ${dadosLicenca.nomeCliente}! Sistema ativado.`);

      if (onAtivacao) onAtivacao();

    } catch (error) {
      console.error("Erro na ativação:", error);
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "5px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "15px",
    boxSizing: "border-box",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>
          🔐 Ativação do Sistema
        </h2>

        {erro && (
          <div
            style={{
              color: "#721c24",
              backgroundColor: "#f8d7da",
              padding: "10px",
              borderRadius: "5px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            {erro}
          </div>
        )}

        <label style={{ fontWeight: "600" }}>Chave de Licença:</label>
        <input
          type="text"
          placeholder="Ex: LIC-XXXXX-XXXXX-XXXXX"
          value={licenca}
          onChange={(e) => setLicenca(e.target.value)}
          style={inputStyle}
          disabled={loading}
        />

        <label style={{ fontWeight: "600" }}>CPF ou CNPJ:</label>
        <input
          type="text"
          placeholder="Digite exatamente como no cadastro"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          style={inputStyle}
          disabled={loading}
        />

        <button
          onClick={handleAtivar}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: loading ? "#6c757d" : "#007bff",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Verificando..." : "🚀 Ativar Sistema"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: "#666",
          }}
        >
          Entre em contato com o suporte se tiver problemas.
        </p>
      </div>
    </div>
  );
}
