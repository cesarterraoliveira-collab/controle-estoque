@echo off
echo ==========================================
echo INICIANDO DEPLOY PARA O GITHUB E VERCEL...
echo ==========================================

git add .
git commit -m "Atualizacao automatica"
git push

echo.
echo ==========================================
echo DEPLOY ENVIADO! A VERCEL JA ESTA PUBLICANDO
echo ==========================================
pause

