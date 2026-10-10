from flask import Blueprint, jsonify, request, session
from database import execute, query
from utils import EMAIL_RE, checar_senha, erro, hash_senha, usuario_publico

bp = Blueprint('auth', __name__)

@bp.post('/cadastro')
def cadastro():
    d = request.get_json(silent=True) or {}
    nome, email, tel, senha = (str(d.get(k) or '').strip() for k in ('nome', 'email', 'telefone', 'senha'))
    email = email.lower()
    if len(nome) < 2: return erro('Informe seu nome.')
    if not EMAIL_RE.match(email): return erro('Informe um e-mail válido.')
    if len(''.join(c for c in tel if c.isdigit())) < 10: return erro('Informe DDD e telefone.')
    if len(senha) < 6: return erro('A senha deve ter ao menos 6 caracteres.')
    if query('SELECT 1 AS x FROM usuarios WHERE LOWER(email)=%s', (email,), one=True):
        return erro('Este e-mail já está cadastrado.', 409)
    execute('INSERT INTO usuarios (nome,email,telefone,senha,perfil) VALUES (%s,%s,%s,%s,%s)', (nome, email, tel, hash_senha(senha), 'cliente'))
    return jsonify(ok=True), 201

@bp.post('/login')
def login():
    d = request.get_json(silent=True) or {}
    email, senha = str(d.get('email') or '').strip().lower(), str(d.get('senha') or '')
    u = query('SELECT id_usuario,nome,email,telefone,senha,perfil FROM usuarios WHERE LOWER(email)=%s', (email,), one=True)
    ok, legado = checar_senha(u['senha'], senha) if u else (False, False)
    if not ok: return erro('E-mail ou senha incorretos.', 401)
    if legado:  # migração controlada: troca texto puro por hash no primeiro login
        try: execute('UPDATE usuarios SET senha=%s WHERE id_usuario=%s', (hash_senha(senha), u['id_usuario']))
        except Exception: pass  # coluna senha curta demais: veja sql/migracao_opcional.sql
    session.clear()
    session['uid'] = u['id_usuario']
    session.permanent = bool(d.get('lembrar'))
    return jsonify(usuario=usuario_publico(u))

@bp.post('/logout')
def logout():
    session.clear()
    return jsonify(ok=True)
