@echo off
rem Backup diário da Casa Hiro para ESTE computador (fora da Hostinger).
rem 1) Instale o Node.js (nodejs.org, versão LTS).  2) Copie a pasta "tools" do pacote para cá.
rem 3) Edite as 3 linhas abaixo.  4) Agende no "Agendador de Tarefas" do Windows: todos os dias, 1 vez.
set SITE=https://SEU-DOMINIO.com.br
set PASTA=C:\BackupCasaHiro
set BACKUP_TOKEN=cole-aqui-o-BACKUP_TOKEN-do-servidor
node "%~dp0puxar-backup.js" %SITE% %PASTA% %BACKUP_TOKEN% >> "%PASTA%\backup.log" 2>&1
