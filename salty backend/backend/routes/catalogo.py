from decimal import Decimal, InvalidOperation
from flask import Blueprint, jsonify, request
from mysql.connector import errors
from database import execute, query
from utils import admin_required, eh_admin, erro, usuario_atual

bp = Blueprint('catalogo', __name__)
EMOJIS = {'frituras': '🍤', 'assados': '🥐', 'combos': '🎉', 'doces': '🍩', 'bebidas': '🥤'}
emoji = lambda nome: EMOJIS.get((nome or '').lower(), '🥟')
SQL_PROD = ('SELECT p.id_produtos,p.id_categoria,p.nome,p.descricao,p.preco,p.imagem,p.ativo,c.nome AS categoria_nome '
            'FROM produtos p LEFT JOIN categorias c ON c.id_categoria=p.id_categoria')

def _destaques(ativos):
    """O banco não tem coluna 'destaque': usamos os 4 mais vendidos (completando com os primeiros)."""
    top = [r['id_produto'] for r in query('SELECT id_produto FROM itens_pedido GROUP BY id_produto ORDER BY SUM(quantidade) DESC LIMIT 4')]
    ids = [i for i in top if i in ativos]
    return set((ids + [i for i in ativos if i not in ids])[:4])

def _prod(r, dest):
    ativo = bool(r['ativo'])
    return {'id': r['id_produtos'], 'nome': r['nome'], 'descricao': r['descricao'] or '', 'preco': float(r['preco']), 'categoria': str(r['id_categoria']),
            'emoji': emoji(r['categoria_nome']), 'imagem': r['imagem'] or '', 'disponivel': ativo, 'ativo': ativo, 'destaque': r['id_produtos'] in dest}

def _cat(r):
    return {'id': str(r['id_categoria']), 'nome': r['nome'], 'emoji': emoji(r['nome'])}

@bp.get('/produtos')
def listar_produtos():
    u = usuario_atual()
    rows = query(SQL_PROD + ('' if u and eh_admin(u) else ' WHERE p.ativo=1') + ' ORDER BY p.id_produtos')
    dest = _destaques([r['id_produtos'] for r in rows if r['ativo']])
    return jsonify([_prod(r, dest) for r in rows])

@bp.get('/produtos/<int:id>')
def obter_produto(id):
    r = query(SQL_PROD + ' WHERE p.id_produtos=%s', (id,), one=True)
    u = usuario_atual()
    if not r or (not r['ativo'] and not (u and eh_admin(u))): return erro('Produto não encontrado.', 404)
    return jsonify(_prod(r, set()))

def _ler_produto(d):
    nome, desc, img = (str(d.get(k) or '').strip() for k in ('nome', 'descricao', 'imagem'))
    if not nome or len(nome) > 100: return None, 'Informe o nome (até 100 caracteres).'
    try: preco = Decimal(str(d.get('preco'))).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError): return None, 'Preço inválido.'
    if preco <= 0 or preco > 99999: return None, 'O preço deve ser maior que zero.'
    try: cat = int(d.get('categoria'))
    except (TypeError, ValueError): return None, 'Escolha uma categoria.'
    if not query('SELECT 1 AS x FROM categorias WHERE id_categoria=%s', (cat,), one=True): return None, 'Categoria inexistente.'
    return (cat, nome, desc, preco, img[:255], 1 if d.get('ativo', True) else 0), None

@bp.post('/produtos')
@admin_required
def criar_produto(u):
    v, e = _ler_produto(request.get_json(silent=True) or {})
    if e: return erro(e)
    id = execute('INSERT INTO produtos (id_categoria,nome,descricao,preco,imagem,ativo) VALUES (%s,%s,%s,%s,%s,%s)', v).lastrowid
    return jsonify(id=id), 201

@bp.put('/produtos/<int:id>')
@admin_required
def editar_produto(u, id):
    if not query('SELECT 1 AS x FROM produtos WHERE id_produtos=%s', (id,), one=True): return erro('Produto não encontrado.', 404)
    v, e = _ler_produto(request.get_json(silent=True) or {})
    if e: return erro(e)
    execute('UPDATE produtos SET id_categoria=%s,nome=%s,descricao=%s,preco=%s,imagem=%s,ativo=%s WHERE id_produtos=%s', (*v, id))
    return jsonify(ok=True)

@bp.delete('/produtos/<int:id>')
@admin_required
def excluir_produto(u, id):
    try:
        execute('DELETE FROM produtos WHERE id_produtos=%s', (id,))
        return jsonify(ok=True)
    except errors.IntegrityError:  # já aparece em pedidos: preserva o histórico e apenas desativa
        execute('UPDATE produtos SET ativo=0 WHERE id_produtos=%s', (id,))
        return jsonify(ok=True, desativado=True)

@bp.get('/categorias')
def listar_categorias():
    return jsonify([_cat(r) for r in query('SELECT id_categoria,nome FROM categorias ORDER BY id_categoria')])

def _nome_cat():
    n = str((request.get_json(silent=True) or {}).get('nome') or '').strip()
    return n if 0 < len(n) <= 50 else None

@bp.post('/categorias')
@admin_required
def criar_categoria(u):
    n = _nome_cat()
    if not n: return erro('Informe o nome da categoria (até 50 caracteres).')
    id = execute('INSERT INTO categorias (nome) VALUES (%s)', (n,)).lastrowid
    return jsonify(id=str(id)), 201

@bp.put('/categorias/<int:id>')
@admin_required
def editar_categoria(u, id):
    n = _nome_cat()
    if not n: return erro('Informe o nome da categoria (até 50 caracteres).')
    if not query('SELECT 1 AS x FROM categorias WHERE id_categoria=%s', (id,), one=True): return erro('Categoria não encontrada.', 404)
    execute('UPDATE categorias SET nome=%s WHERE id_categoria=%s', (n, id))
    return jsonify(ok=True)

@bp.delete('/categorias/<int:id>')
@admin_required
def excluir_categoria(u, id):
    if query('SELECT 1 AS x FROM produtos WHERE id_categoria=%s', (id,), one=True): return erro('A categoria possui produtos. Mova ou remova os produtos antes.', 409)
    execute('DELETE FROM categorias WHERE id_categoria=%s', (id,))
    return jsonify(ok=True)
