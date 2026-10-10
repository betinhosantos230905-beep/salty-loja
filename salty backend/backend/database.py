from contextlib import contextmanager
from types import SimpleNamespace
import mysql.connector
from mysql.connector import pooling
import config

_pool = None
_colunas = {}

def _conn():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(pool_name='salty', pool_size=5, **config.DB)
    return _pool.get_connection()

def query(sql, params=(), one=False):
    """SELECT parametrizado. Retorna lista de dicts (ou um dict/None com one=True)."""
    conn = _conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.commit()  # encerra a transação de leitura para não devolver snapshot antigo ao pool
        return (rows[0] if rows else None) if one else rows
    finally:
        conn.close()

def execute(sql, params=()):
    """INSERT/UPDATE/DELETE com commit. Retorna lastrowid e rowcount."""
    conn = _conn()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        conn.commit()
        return SimpleNamespace(lastrowid=cur.lastrowid, rowcount=cur.rowcount)
    finally:
        conn.close()

@contextmanager
def transaction():
    """Várias operações atômicas: commit ao sair, rollback se der erro."""
    conn = _conn()
    cur = conn.cursor(dictionary=True)
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

def tem_coluna(tabela, coluna):
    chave = (tabela, coluna)
    if chave not in _colunas:
        r = query('SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s AND COLUMN_NAME=%s',
                  (config.DB['database'], tabela, coluna), one=True)
        _colunas[chave] = r['n'] > 0
    return _colunas[chave]
