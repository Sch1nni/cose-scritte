"""
app.py — Server Flask per Cose scritte (PythonAnywhere)

Questo file serve tutti i file statici dalla cartella radice del progetto.
Funziona esattamente come GitHub Pages, ma con un backend Python.

Deployment su PythonAnywhere:
  1. Carica l'intera cartella del progetto
  2. Crea una Web App: Manual configuration → Python 3.10
  3. In "WSGI configuration file" sostituisci il contenuto con:

       import sys
       sys.path.insert(0, '/home/TUONOME/cose-scritte')
       from app import app as application

  4. Salva e riavvia la web app
"""

from flask import Flask, send_from_directory
import os

# Serve tutti i file dalla cartella corrente (dove si trova app.py)
CARTELLA = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_url_path='', static_folder=CARTELLA)


@app.route('/')
def index():
    return send_from_directory(CARTELLA, 'index.html')


@app.route('/storia')
def storia():
    return send_from_directory(CARTELLA, 'storia.html')


@app.route('/<path:filename>')
def file_statici(filename):
    """Serve qualsiasi file statico: CSS, JS, JSON delle storie, ecc."""
    return send_from_directory(CARTELLA, filename)


if __name__ == '__main__':
    # Solo per sviluppo locale: python app.py
    app.run(debug=True, port=5000)
