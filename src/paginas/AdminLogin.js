// src/paginas/AdminLogin.js

import React, { useState } from "react";
import { auth } from "../configuracoes/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      // 🔑 Login no Firebase
      await signInWithEmailAndPassword(auth, email, senha);

      // 🔍 MOSTRA O UID DO ADMIN NO CONSOLE
      console.log("UID logado:", auth.currentUser?.uid);

      if (onLogin) {
        onLogin();
      }

    } catch (error) {
      console.error("Erro no login do Admin:", error.code, error.message);

      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        setErro("Email ou senha inválidos.");
      } else {
        setErro("Erro desconhecido. Veja o console.");
      }
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "30px",
    backgroundColor: "white",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    border: "1px solid #ccc",
    borderRadius: "6px"
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: loading ? "#6c757d" : "#dc3545",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: loading ? "not-allowed" : "pointer"
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center", color: "#dc3545", marginBottom: "25px" }}>
        🔒 Login Administrativo
      </h2>

      {erro && (
        <div
          style={{
            color: "#721c24",
            backgroundColor: "#f8d7da",
            padding: "10px",
            borderRadius: "5px",
            marginBottom: "15px"
          }}
        >
          {erro}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email do Administrador"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          disabled={loading}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
          disabled={loading}
          required
        />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Acessando..." : "Entrar no Painel Admin"}
        </button>
      </form>
    </div>
  );
}
