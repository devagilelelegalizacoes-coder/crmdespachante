import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Desabilita cache para facilitar os testes
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

print(f"--- SERVIDOR LOCAL AGILE CRM ---")
print(f"Diretório: {DIRECTORY}")
print(f"Endereço: http://localhost:{PORT}")
print(f"Pressione CTRL+C para parar o servidor.")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
