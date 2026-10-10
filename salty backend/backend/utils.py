import hmac, re
from functools import wraps
from flask import jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from database import query

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

def erro(msg, code=400):
    return jsonify(erro=msg), code

def iso(v):
    return v.isoformat() if hasattr(v, 'isoformat') else str(v).replace(' ', 'T')

def eh_admin(u):
    return str(u.get('perfil') or '').lower() in ('admin', 'administrador')

def usuario_publico(u):
    return {'id': u['id_usuario'], 'nome': u['nome'], 'email': u['email'], 'telefone': u['telefone'], 'perfil': 'admin' if eh_admin(u) else 'cliente'}

def usuario_atual():
    uid = session.get('uid')
    return query('SELECT id_usuario,nome,email,telefone,perfil FROM usuarios WHERE id_usuario=%s', (uid,), one=True) if uid else None

def login_required(f):
    @wraps(f)
    def w(*a, **k):
        u = usuario_atual()
        return f(u, *a, **k) if u else erro('Faça login para continuar.', 401)
    return w

def admin_required(f):
    @wraps(f)
    def w(*a, **k):
        u = usuario_atual()
        if not u: return erro('Faça login para continuar.', 401)
        if not eh_admin(u): return erro('Acesso restrito a administradores.', 403)
        return f(u, *a, **k)
    return w

def hash_senha(s):
    return generate_password_hash(s, method='pbkdf2:sha256')

def checar_senha(armazenada, informada):
    """Retorna (confere, legado). Senhas antigas em texto puro são aceitas uma vez e re-gravadas com hash."""
    armazenada = armazenada or ''
    if armazenada.startswith(('pbkdf2:', 'scrypt:')):
        return check_password_hash(armazenada, informada), False
    return hmac.compare_digest(armazenada.encode(), informada.encode()), True
