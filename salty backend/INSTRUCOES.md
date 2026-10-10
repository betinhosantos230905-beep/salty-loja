# SALTY – como rodar no Windows (VS Code + PowerShell)

O Flask serve o site **e** a API na mesma porta. Abra sempre por `http://127.0.0.1:5000` (não abra o HTML com duplo clique).

## 1. Configurar
```powershell
cd C:\caminho\para\salty
.\venv\Scripts\Activate.ps1          # seu venv (se der erro de permissão: Set-ExecutionPolicy -Scope Process Bypass)
pip install -r backend\requirements.txt
copy backend\.env.example backend\.env
```
Edite `backend\.env`: `DB_USER`, `DB_PASSWORD`, `DB_NAME=salty` e uma `SECRET_KEY`
(gere com `python -c "import secrets; print(secrets.token_hex(32))"`).

## 2. (Recomendado) Migração opcional
Rode `backend\sql\migracao_opcional.sql` no MySQL. Ela (1) alarga `usuarios.senha` para caber o hash e
(2) cria `pedidos.id_endereco` para guardar o endereço de cada pedido. O sistema funciona sem ela.

## 3. Iniciar
```powershell
python backend\app.py
```
Acesse http://127.0.0.1:5000. Admin: use o e-mail/senha de um usuário com `perfil` = `admin` na tabela `usuarios`.
Senhas antigas em texto puro continuam funcionando e são trocadas por hash no primeiro login de cada conta.

## Estrutura do backend
`backend/app.py` (servidor + front estático) · `config.py` (.env, configurações da loja) · `database.py` (MySQL, transações) ·
`utils.py` (sessão, permissões, hash) · `routes/auth.py`, `catalogo.py`, `pedidos.py`, `admin.py`

## Rotas
| Rota | Acesso |
|---|---|
| GET /api/produtos, /api/produtos/<id>, /api/categorias, /api/configuracoes | público (admin vê também produtos inativos) |
| POST /api/cadastro, /api/login, /api/logout | público |
| POST /api/pedidos · GET /api/pedidos · GET /api/pedidos/<id> | cliente logado (só os próprios; admin vê todos) |
| PATCH /api/pedidos/<id>/status · GET /api/clientes · PUT /api/configuracoes | admin |
| POST/PUT/DELETE /api/produtos · POST/PUT/DELETE /api/categorias | admin |
