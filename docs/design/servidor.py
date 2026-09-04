#!/usr/bin/env python3
"""Servidor local de los entregables de diseño.

`python3 -m http.server` sirve los Markdown como `text/markdown` sin declarar
codificación, y el navegador cae a latin-1, que rompe todos los acentos. Este
servidor declara UTF-8 en todo lo que sea texto.

    python3 docs/design/servidor.py [puerto]
"""

import http.server
import os
import socketserver
import sys

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
RAIZ = os.path.dirname(os.path.abspath(__file__))


class Manejador(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def guess_type(self, path):
        tipo = super().guess_type(path)
        if isinstance(tipo, str) and tipo.startswith("text/") and "charset" not in tipo:
            return tipo + "; charset=utf-8"
        return tipo

    def log_message(self, formato, *args):
        pass  # sin ruido en la terminal


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PUERTO), Manejador) as servidor:
        print(f"Entregables de diseño en http://127.0.0.1:{PUERTO}")
        servidor.serve_forever()
