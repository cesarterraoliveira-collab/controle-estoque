@echo off
cd /d C:\Users\julio.oliveira\controle-estoque

echo Adicionando arquivos...
git add .

echo Fazendo commit...
set /p commitmsg=Digite a mensagem do commit: 
git commit -m "%commitmsg%"

echo Enviando para o GitHub...
git push origin main

echo Feito!
pause
