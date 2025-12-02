// src/App.js

import React, { useState } from "react";
import { AuthProvider, useAuth } from "./configuracoes/AuthContext";

// Importa as páginas
import Inicio from "./paginas/Inicio";
import Produtos from "./paginas/Produtos";
import Clientes from "./paginas/Clientes";
import Movimentacoes from "./paginas/Movimentacoes";
import Relatorios from "./paginas/Relatorios";
import Ativacao from "./paginas/Ativacao";
import AdminLicencas from "./paginas/AdminLicencas";
import AdminLogin from "./paginas/AdminLogin"; // 🔑 NOVO IMPORT

// 🆕 Componente simples para a Home do Admin
function AdminDashboard() {
  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>👋 Bem-vindo, Administrador!</h1>
      <p style={{ fontSize: "18px", color: "#666" }}>
        Utilize o menu acima para gerenciar as licenças do sistema.
      </p>
      <div style={{ marginTop: "30px", padding: "20px", background: "#e9ecef", borderRadius: "8px", display: "inline-block" }}>
        <h3>Dica Rápida:</h3>
        <p>Crie licenças, copie a Chave e o CPF e envie para seu cliente.</p>
      </div>
    </div>
  );
}

function AppConteudo() {
  // 🔑 Obtém uidAdmin do contexto
  const { licencaAtiva, modoAdmin, carregando, logout, verificarLicenca, uidAdmin } = useAuth(); 
  
  // 🔑 UID do Admin para checagem de acesso (deve ser o mesmo da regra do Firebase)
  const ADMIN_UID_CHECK = "IVNBd8mU04W0xiuBoUJbw2wWVA03"; 
  
  // Define a página inicial corretamente
  const [pagina, setPagina] = useState(modoAdmin ? "adminHome" : "inicio");
  
  const renderPagina = () => {
    if (carregando) {
      // Tela de carregamento enquanto verifica a licença
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h2>Carregando Sistema...</h2>
          <p>Verificando informações de licença.</p>
        </div>
      );
    }

    // ----------------------------------------------------
    // Roteamento para o MODO ADMINISTRATIVO
    // ----------------------------------------------------
    if (modoAdmin) {
      // 🔑 CRÍTICO: CHECAGEM DE AUTENTICAÇÃO DO ADMIN NO FIREBASE AUTH
      if (uidAdmin !== ADMIN_UID_CHECK) {
        // Se modoAdmin=true na URL, mas o Admin NÃO está logado no Firebase Auth:
        // Mostra a tela de login. O onLogin chama verificarLicenca para recarregar o estado.
        return <AdminLogin onLogin={verificarLicenca} />; 
      }
      
      // Se a checagem de UID passar, mostra o painel Admin
      switch (pagina) {
        case "adminLicencas":
          return <AdminLicencas />;
        case "adminHome":
          return <AdminDashboard />;
        case "inicio": 
        default:
          return <AdminDashboard />;
      }
    }

    // ----------------------------------------------------
    // Roteamento para o USUÁRIO COMUM (LICENÇA)
    // ----------------------------------------------------
    if (!licencaAtiva) {
      // Se não tem licença ativa, mostra a tela de ativação
      return <Ativacao onAtivacao={verificarLicenca} />;
    }

    // Se tem licença ativa, mostra o sistema
    switch (pagina) {
      case "produtos":
        return <Produtos />;
      case "clientes":
        return <Clientes />;
      case "movimentacoes":
        return <Movimentacoes />;
      case "relatorios":
        return <Relatorios />;
      case "inicio":
      default:
        return <Inicio />;
    }
  };

  // Função getMenuLinks (apenas os links do menu, sem alterar a lógica principal)
  const getMenuLinks = () => {
    const linkStyle = {
      padding: "10px 15px",
      borderRadius: "5px",
      cursor: "pointer",
      fontWeight: "bold",
      transition: "background-color 0.3s",
      backgroundColor: "transparent",
      color: "#6c757d",
      margin: "0 5px"
    };

    const activeLinkStyle = {
      ...linkStyle,
      backgroundColor: modoAdmin ? "#f8d7da" : "#e9ecef",
      color: modoAdmin ? "#dc3545" : "#007bff"
    };

    if (modoAdmin && uidAdmin === ADMIN_UID_CHECK) {
      return (
        <>
          <span
            onClick={() => setPagina("adminHome")}
            style={pagina === "adminHome" ? activeLinkStyle : linkStyle}
          >
            🏠 Dashboard
          </span>
          <span
            onClick={() => setPagina("adminLicencas")}
            style={pagina === "adminLicencas" ? activeLinkStyle : linkStyle}
          >
            🔑 Gerenciar Licenças
          </span>
        </>
      );
    }

    if (licencaAtiva) {
      return (
        <>
          <span onClick={() => setPagina("inicio")} style={pagina === "inicio" ? activeLinkStyle : linkStyle}>
            🏠 Início
          </span>
          <span onClick={() => setPagina("produtos")} style={pagina === "produtos" ? activeLinkStyle : linkStyle}>
            📦 Produtos
          </span>
          <span onClick={() => setPagina("clientes")} style={pagina === "clientes" ? activeLinkStyle : linkStyle}>
            👤 Clientes
          </span>
          <span onClick={() => setPagina("movimentacoes")} style={pagina === "movimentacoes" ? activeLinkStyle : linkStyle}>
            ➡️ Movimentações
          </span>
          <span onClick={() => setPagina("relatorios")} style={pagina === "relatorios" ? activeLinkStyle : linkStyle}>
            📈 Relatórios
          </span>
        </>
      );
    }

    return null; // Menu só aparece se tiver licença ou for admin
  };


  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 25px", marginBottom: "20px", backgroundColor: "white", borderRadius: "10px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
        <h2 style={{ color: modoAdmin ? "#dc3545" : "#007bff", margin: 0, fontSize: "24px" }}>
          {modoAdmin ? "🎮 ADMIN" : "🏪 EstoquePRO"}
        </h2>
        
        <div style={{ display: "flex", alignItems: "center" }}>
          {getMenuLinks()}
        </div>

        {/* Botão Sair - Visível se a Licença estiver ativa OU se o Admin estiver logado */}
        {(licencaAtiva || (modoAdmin && uidAdmin === ADMIN_UID_CHECK)) && (
          <button
            onClick={() => { if (window.confirm("Sair do sistema?")) logout(); }}
            style={{ padding: "12px 20px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
          >
            {modoAdmin ? "🚪 Sair Admin" : "🔓 Sair"}
          </button>
        )}
      </nav>
      
      {/* Área de Conteúdo */}
      <div style={{ backgroundColor: "white", borderRadius: "10px", padding: "25px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", minHeight: "60vh" }}>
        {renderPagina()}
      </div>

      {/* Rodapé */}
      <footer style={{ marginTop: "30px", textAlign: "center", padding: "20px", color: "#6c757d", fontSize: "14px", borderTop: "1px solid #dee2e6" }}>
        <div>
          🏪 Sistema de Controle de Estoque | 
          {modoAdmin && uidAdmin === ADMIN_UID_CHECK ? " 🎮 Modo Administrativo (Logado)" : licencaAtiva ? " ✅ Licença Ativa" : " 🔴 Sistema Inativo"}
        </div>
        <div style={{ marginTop: "5px" }}>
          Desenvolvido por Julio Oliveira
        </div>
      </footer>
    </div>
  );
}

// O componente principal App continua o mesmo, apenas envolve o conteúdo
export default function App() {
  return (
    <AuthProvider>
      <AppConteudo />
    </AuthProvider>
  );
}