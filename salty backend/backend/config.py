import json, os, secrets
from pathlib import Path

BASE = Path(__file__).resolve().parent
_env = BASE / '.env'
if _env.exists():  # leitor simples de .env (evita dependência extra)
    for linha in _env.read_text(encoding='utf-8').splitlines():
        linha = linha.strip()
        if linha and not linha.startswith('#') and '=' in linha:
            k, v = linha.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"\''))

DB = {'host': os.getenv('DB_HOST', 'localhost'), 'port': int(os.getenv('DB_PORT', 3306)), 'user': os.getenv('DB_USER', 'root'),
      'password': os.getenv('DB_PASSWORD', ''), 'database': os.getenv('DB_NAME', 'salty'), 'charset': 'utf8mb4'}
SECRET_KEY = os.getenv('SECRET_KEY') or secrets.token_hex(32)  # sem SECRET_KEY no .env, os logins caem a cada reinício
SECRET_KEY_DEFINIDA = bool(os.getenv('SECRET_KEY'))

# Configurações da loja (taxa, frete grátis, desconto). Guardadas em arquivo, pois o banco não tem tabela para isso.
LOJA_PADRAO = {'taxaEntrega': 6, 'freteGratisAcima': 80, 'descontoMinimo': 50, 'descontoPercentual': 10}
_loja = BASE / 'configuracoes.json'

def get_loja():
    try:
        return {**LOJA_PADRAO, **json.loads(_loja.read_text(encoding='utf-8'))}
    except (OSError, ValueError):
        return dict(LOJA_PADRAO)

def save_loja(dados):
    _loja.write_text(json.dumps(dados), encoding='utf-8')
