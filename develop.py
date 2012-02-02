import sys
import os
import threading
import subprocess
import BaseHTTPServer
import SimpleHTTPServer

try:
    import simplejson as json
except ImportError:
    import json

def get_git_commit():
    try:
        head = open(path('.git', 'HEAD'), 'r').read()
        if head.startswith('ref: '):
            ref = open(path('.git', head.split()[1].strip()), 'r').read()
            return ref.strip()
        return head.strip()
    except Exception:
        return "unknown"

PORT = 8888
ROOT = os.path.abspath(os.path.dirname(__file__))

path = lambda *x: os.path.join(ROOT, *x)
types = {
    '.json': 'application/json',
    '.manifest': 'text/cache-manifest',
    '.webm': 'video/webm'
}

SimpleHTTPServer.SimpleHTTPRequestHandler.extensions_map.update(types)

def run(server_class=BaseHTTPServer.HTTPServer,
        handler_class=SimpleHTTPServer.SimpleHTTPRequestHandler,
        port=PORT):
    os.chdir(path('website'))
    server_address = ('', port)
    print "Serving files in '%s' on port %d." % (os.getcwd(), port)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

if __name__ == '__main__':
    t = threading.Thread(target=run)
    t.setDaemon(True)
    t.start()

    dep = open(path('data', 'deployment.json'), 'w')
    dep.write(json.dumps({
        'name': 'development',
        'commit': get_git_commit(),
        'url': 'http://localhost:%d/' % PORT,
        'xpi_url': 'http://localhost:%d/xpi/' % PORT
    }))
    dep.close()
    
    sys.exit(subprocess.call(['cfx', 'run'] + sys.argv[1:], cwd=ROOT))
