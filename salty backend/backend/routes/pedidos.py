from decimal import ROUND_HALF_UP, Decimal
from flask import Blueprint, jsonify, request
import config
from database import execute, query, tem_coluna, transaction
from utils import admin_required, eh_admin, erro, iso, login_required

bp = Blueprint('pedidos', __name__)
STATUS = ['Recebido', 'Confirmado', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Cancelado']
PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão na entrega']
CENT = Decimal('0.01')

def _listar(where='', params=()):
    # Sem a coluna pedidos.id_endereco (ver sql/migracao_opcional.sql), usa o endereço mais recente do cliente.
    ende = 'p.id_endereco' if tem_coluna('pedidos', 'id_endereco') else '(SELECT MAX(x.id_enderecos) FROM enderecos x WHERE x.id_usuario=p.id_usuario)'
    rows = query('SELECT p.id_pedidos,p.status,p.total,p.forma_pagamento,p.observacoes,p.data_pedido,u.nome,u.email,u.telefone,'
                 'e.rua,e.numero,e.complemento,e.bairro,e.cidade,e.estado FROM pedidos p JOIN usuarios u ON u.id_usuario=p.id_usuario '
                 f'LEFT JOIN enderecos e ON e.id_enderecos={ende} {where} ORDER BY p.data_pedido DESC,p.id_pedidos DESC', params)
    itens = {}
    if rows:
        ids = [r['id_pedidos'] for r in rows]
        for i in query('SELECT i.id_pedido,i.quantidade,i.preco_unitario,pr.nome FROM itens_pedido i JOIN produtos pr ON pr.id_produtos=i.id_produto '
                       f'WHERE i.id_pedido IN ({",".join(["%s"] * len(ids))})', ids):
            itens.setdefault(i['id_pedido'], []).append({'nome': i['nome'], 'quantidade': i['quantidade'], 'preco': float(i['preco_unitario'])})
    out = []
    for r in rows:
        end = f"{r['rua']}, {r['numero']}{' - ' + r['complemento'] if r['complemento'] else ''}, {r['bairro']}, {r['cidade']} - {r['estado']}" if r['rua'] else ''
        out.append({'id': r['id_pedidos'], 'numero': r['id_pedidos'], 'cliente': r['nome'], 'email': r['email'], 'telefone': r['telefone'], 'data': iso(r['data_pedido']),
                    'itens': itens.get(r['id_pedidos'], []), 'total': float(r['total']), 'pagamento': r['forma_pagamento'], 'endereco': end,
                    'status': r['status'], 'observacoes': r['observacoes'] or ''})
    return out

@bp.get('/pedidos')
@login_required
def listar(u):
    return jsonify(_listar() if eh_admin(u) else _listar('WHERE p.id_usuario=%s', (u['id_usuario'],)))

@bp.get('/pedidos/<int:id>')
@login_required
def obter(u, id):
    r = _listar('WHERE p.id_pedidos=%s' + ('' if eh_admin(u) else ' AND p.id_usuario=%s'), (id,) if eh_admin(u) else (id, u['id_usuario']))
    return jsonify(r[0]) if r else erro('Pedido não encontrado.', 404)

@bp.patch('/pedidos/<int:id>/status')
@admin_required
def atualizar_status(u, id):
    s = (request.get_json(silent=True) or {}).get('status')
    if s not in STATUS: return erro('Status inválido.')
    if not query('SELECT 1 AS x FROM pedidos WHERE id_pedidos=%s', (id,), one=True): return erro('Pedido não encontrado.', 404)
    execute('UPDATE pedidos SET status=%s WHERE id_pedidos=%s', (s, id))
    return jsonify(ok=True, status=s)

def _itens(bruto):
    if not isinstance(bruto, list) or not bruto: raise ValueError('O carrinho está vazio.')
    m = {}
    for i in bruto:
        try: pid, q = int(i.get('produto_id')), int(i.get('quantidade'))
        except (TypeError, ValueError, AttributeError): raise ValueError('Item inválido no carrinho.')
        if not 1 <= q <= 99: raise ValueError('A quantidade deve ficar entre 1 e 99.')
        m[pid] = min(99, m.get(pid, 0) + q)
        if str(i.get('observacao') or '').strip(): m[('obs', pid)] = str(i['observacao']).strip()
    return m

@bp.post('/pedidos')
@login_required
def criar(u):
    d = request.get_json(silent=True) or {}
    e = d.get('endereco') or {}
    for k, rot in [('cep', 'CEP'), ('rua', 'Rua'), ('numero', 'Número'), ('bairro', 'Bairro'), ('cidade', 'Cidade'), ('estado', 'Estado')]:
        if not str(e.get(k) or '').strip(): return erro(f'{rot} é obrigatório.')
    e = {k: str(e.get(k) or '').strip() for k in ('cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado')}
    if len(e['estado']) != 2: return erro('Informe o estado com 2 letras (UF).')
    if d.get('pagamento') not in PAGAMENTOS: return erro('Forma de pagamento inválida.')
    try: m = _itens(d.get('itens'))
    except ValueError as x: return erro(str(x))
    qtds = {k: v for k, v in m.items() if isinstance(k, int)}

    try:
        with transaction() as cur:
            ids = list(qtds)
            cur.execute(f'SELECT id_produtos,nome,preco,ativo FROM produtos WHERE id_produtos IN ({",".join(["%s"] * len(ids))})', ids)
            prods = {r['id_produtos']: r for r in cur.fetchall()}
            for pid in ids:
                if pid not in prods or not prods[pid]['ativo']:
                    raise ValueError(f"O produto {prods[pid]['nome'] if pid in prods else '#' + str(pid)} não está mais disponível. Atualize o carrinho.")
            # Preços e totais vêm SEMPRE do banco/configuração do servidor, nunca do navegador.
            sub = sum(Decimal(str(prods[p]['preco'])) * q for p, q in qtds.items())
            c = config.get_loja()
            entrega = Decimal(0) if sub >= Decimal(str(c['freteGratisAcima'])) else Decimal(str(c['taxaEntrega']))
            desc = (sub * Decimal(str(c['descontoPercentual'])) / 100).quantize(CENT, ROUND_HALF_UP) if sub >= Decimal(str(c['descontoMinimo'])) else Decimal(0)
            total = sub + entrega - desc

            cur.execute("SELECT id_enderecos FROM enderecos WHERE id_usuario=%s AND cep=%s AND rua=%s AND numero=%s AND IFNULL(complemento,'')=%s AND bairro=%s AND cidade=%s AND estado=%s",
                        (u['id_usuario'], e['cep'], e['rua'], e['numero'], e['complemento'], e['bairro'], e['cidade'], e['estado']))
            r = cur.fetchall()
            if r: id_end = r[0]['id_enderecos']
            else:
                cur.execute('INSERT INTO enderecos (id_usuario,cep,rua,numero,complemento,bairro,estado,cidade) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                            (u['id_usuario'], e['cep'], e['rua'], e['numero'], e['complemento'], e['bairro'], e['estado'], e['cidade']))
                id_end = cur.lastrowid
            notas = [str(d.get('observacoes') or '').strip()] + [f"Obs. {prods[p]['nome']}: {m[('obs', p)]}" for p in qtds if ('obs', p) in m]
            obs = '\n'.join(n for n in notas if n)[:1000]
            cols, ph, vals = 'id_usuario,status,total,forma_pagamento,observacoes,data_pedido', '%s,%s,%s,%s,%s,NOW()', [u['id_usuario'], 'Recebido', total, d['pagamento'], obs]
            if tem_coluna('pedidos', 'id_endereco'): cols, ph = cols + ',id_endereco', ph + ',%s'; vals.append(id_end)
            cur.execute(f'INSERT INTO pedidos ({cols}) VALUES ({ph})', vals)
            pid_novo = cur.lastrowid
            cur.executemany('INSERT INTO itens_pedido (id_pedido,id_produto,quantidade,preco_unitario) VALUES (%s,%s,%s,%s)',
                            [(pid_novo, p, q, prods[p]['preco']) for p, q in qtds.items()])
    except ValueError as x:
        return erro(str(x), 400)
    return jsonify(numero=pid_novo, id=pid_novo, status='Recebido', subtotal=float(sub), entrega=float(entrega), desconto=float(desc), total=float(total)), 201
