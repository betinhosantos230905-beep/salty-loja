"""Servidor Flask da Salty: API em /api e o front-end estático na mesma origem (sem necessidade de CORS)."""
import logging, os
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask.json.provider import DefaultJSONProvider
from werkzeug.exceptions import HTTPException
import config

FRONT = Path(__file__).resolve().parent.parent
PASTAS_PUBLICAS = {'pages', 'css', 'js', 'assets'}  # nada de backend/, .env ou venv é servido

class Json(DefaultJSONProvider):
    @staticmethod
    def default(o):
        if isinstance(o, Decimal): return float(o)
        if isinstance(o, (datetime, date)): return o.isoformat()
        return DefaultJSONProvider.default(o)

def create_app():
    app = Flask(__name__)
    app.json = Json(app)
    app.config.update(SECRET_KEY=config.SECRET_KEY, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax',
                      PERMANENT_SESSION_LIFETIME=timedelta(days=30), MAX_CONTENT_LENGTH=1024 * 1024)
    from routes import admin, auth, catalogo, pedidos
    for m in (auth, catalogo, pedidos, admin):
        app.register_blueprint(m.bp, url_prefix='/api')

    @app.errorhandler(Exception)
    def falha(e):
        if isinstance(e, HTTPException):
            return (jsonify(erro=e.description), e.code) if request.path.startswith('/api') else e
        logging.exception('Erro não tratado')
        return jsonify(erro='Erro interno do servidor.'), 500

    @app.get('/')
    def home():
        return send_from_directory(FRONT, 'index.html')

    @app.get('/<path:caminho>')
    def estatico(caminho):
        if caminho != 'index.html' and caminho.split('/')[0] not in PASTAS_PUBLICAS:
            return jsonify(erro='Não encontrado.'), 404
        return send_from_directory(FRONT, caminho)
    return app

if __name__ == '__main__':
    if not config.SECRET_KEY_DEFINIDA:
        print('AVISO: defina SECRET_KEY no backend/.env (os logins serão perdidos a cada reinício).')
    create_app().run(host='127.0.0.1', port=int(os.getenv('PORT', 5000)), debug=os.getenv('FLASK_DEBUG') == '1')
