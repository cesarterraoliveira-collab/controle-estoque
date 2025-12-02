// src/configuracoes/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from "./firebaseConfig"; // 🔑 IMPORTADO
import { onAuthStateChanged, signOut } from 'firebase/auth'; // 🔑 IMPORTADO

// Cria o contexto. Aqui definimos o estado inicial
const AuthContext = createContext({
  licencaAtiva: false,
  modoAdmin: false,
  licenca: null,
  cnpj: null,
  verificarLicenca: () => {},
  logout: () => {},
  uidAdmin: null, // 🔑 NOVO: UID do usuário logado no Firebase Auth
});

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => useContext(AuthContext);

// Provedor do Contexto
export const AuthProvider = ({ children }) => {
  // 🔑 UID DO ADMIN (USADO NA REGRA DO FIREBASE)
  const ADMIN_UID = "IVNBd8mU04W0xiuBoUJbw2wWVA03"; 

  const [licencaAtiva, setLicencaAtiva] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [licenca, setLicenca] = useState(null);
  const [cnpj, setCnpj] = useState(null);
  const [uidAdmin, setUidAdmin] = useState(null); // 🔑 NOVO ESTADO
  const [carregando, setCarregando] = useState(true);

  // Lógica principal: verificar no localStorage e na URL
  const verificarLicenca = () => {
    // Esta função prepara os estados de licença/cnpj/modoAdmin da URL e do LocalStorage
    const storedLicenca = localStorage.getItem('licenca');
    const storedCnpj = localStorage.getItem('cnpj');
    
    // 1. Verifica Modo Admin (URL)
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    setModoAdmin(isAdmin);

    // 2. Verifica Licença de Usuário
    if (storedLicenca && storedCnpj) {
      setLicencaAtiva(true);
      setLicenca(storedLicenca);
      setCnpj(storedCnpj);
    } else {
      setLicencaAtiva(false);
      setLicenca(null);
      setCnpj(null);
    }
    // ⚠️ Removido: setCarregando(false). O carregamento será finalizado pelo onAuthStateChanged.
  };

  const logout = () => {
    // 🔑 NOVO: Se o Admin estiver logado no Firebase Auth, faz o signOut
    if (uidAdmin) {
      signOut(auth).catch(e => console.error("Erro ao deslogar Admin:", e));
    }
    
    // Limpa LocalStorage
    localStorage.removeItem('licenca');
    localStorage.removeItem('cnpj');
    localStorage.removeItem('licencaInfo');
    setLicencaAtiva(false);
    setLicenca(null);
    setCnpj(null);
    setModoAdmin(false);
    window.location.href = window.location.pathname; // Redireciona
  };

  useEffect(() => {
    verificarLicenca();
    
    // 🔑 CRÍTICO: OUVIR O ESTADO DE AUTENTICAÇÃO DO FIREBASE
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setUidAdmin(user.uid);
            // Se o usuário logado for o Admin, o carregamento termina.
            if (user.uid === ADMIN_UID) { 
              setCarregando(false);
            }
        } else {
            setUidAdmin(null);
            // Termina o carregamento para usuários comuns ou quando ninguém está logado.
            setCarregando(false); 
        }
    });

    return () => unsubscribe(); // Limpa a inscrição
  }, []);

  return (
    <AuthContext.Provider value={{ 
      licencaAtiva, 
      modoAdmin, 
      carregando, 
      logout,
      verificarLicenca,
      licenca, 
      cnpj,
      uidAdmin // 🔑 EXPÕE O UID DO ADMIN
    }}>
      {children}
    </AuthContext.Provider>
  );
};