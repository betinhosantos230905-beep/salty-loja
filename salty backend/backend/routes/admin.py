from flask import Blueprint, jsonify, request
import config
from database import query
from utils import admin_required, erro

bp = Blueprint('admin', __name__)

@bp.get('/clientes')
@admin_required
def clientes(u):
    rows = query("SELECT u.id_usuario,u.nome,u.email,u.telefone,COUNT(p.id_pedidos) AS pedidos,"
                 "COALESCE(SUM(CASE WHEN p.status<>'Cancelado' THEN p.total ELSE 0 END),0) AS total FROM usuarios u "
                 "LEFT JOIN pedidos p ON p.id_usuario=u.id_usuario WHERE LOWER(u.perfil) NOT IN ('admin','administrador') "
                 "GROUP BY u.id_usuario,u.nome,u.email,u.telefone ORDER BY u.nome")
    return jsonify([{'id': r['id_usuario'], 'nome': r['nome'], 'email': r['email'], 'telefone': r['telefone'], 'pedidos': r['pedidos'], 'total': float(r['total'])} for r in rows])

@bp.get('/configuracoes')
def ler_config():
    return jsonify(config.get_loja())

@bp.put('/configuracoes')
@admin_required
def salvar_config(u):
    d, novo = request.get_json(silent=True) or {}, {}
    for k in config.LOJA_PADRAO:
        try: novo[k] = float(d[k])
        except (KeyError, TypeError, ValueError): return erro(f'Valor inválido em {k}.')
        if novo[k] < 0: return erro('Os valores não podem ser negativos.')
    if novo['descontoPercentual'] > 100: return erro('O desconto não pode passar de 100%.')
    config.save_loja(novo)
    return jsonify(novo)
