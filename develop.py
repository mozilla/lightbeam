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

HOST = 'localhost'
PORT = 8888
BASE_URL = 'http://%s:%d/' % (HOST, PORT)
ROOT = os.path.abspath(os.path.dirname(__file__))

path = lambda *x: os.path.join(ROOT, *x)
types = {
    '.json': 'application/json',
    '.manifest': 'text/cache-manifest',
    '.webm': 'video/webm'
}

SimpleHTTPServer.SimpleHTTPRequestHandler.extensions_map.update(types)

def run_web_server(server_class=BaseHTTPServer.HTTPServer,
                   handler_class=SimpleHTTPServer.SimpleHTTPRequestHandler):
    os.chdir(path('website'))
    server_address = (HOST, PORT)
    print "Serving files in '%s' at %s." % (os.getcwd(), BASE_URL)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

def write_deployment_json():
    dep = open(path('data', 'deployment.json'), 'w')
    dep.write(json.dumps({
        'name': 'development',
        'commit': get_git_commit(),
        'url': BASE_URL,
        'xpi_url': BASE_URL + 'xpi/'
    }))
    dep.close()

def run_firefox(args):
    if 'CUDDLEFISH_ROOT' not in os.environ:
        print "WARNING: You don't seem to have the Add-on SDK activated. To learn how to activate it, visit: https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/addon-development/installation.html"
        print
    return subprocess.call(['cfx', 'run'] + args, cwd=ROOT)

if __name__ == '__main__':
    write_deployment_json()
    if '--help' in sys.argv or '-h' in sys.argv:
        print "usage: %s [--server-only] [cfx options]" % sys.argv[0]
        sys.exit(1)
    if '--server-only' in sys.argv:
        run_web_server()
    else:
        t = threading.Thread(target=run_web_server)
        t.setDaemon(True)
        t.start()
        sys.exit(run_firefox(sys.argv[1:]))
