import json

from fabric.api import *
from fabric.contrib.project import rsync_project

try:
    import fabfile_local
except ImportError:
    pass

def deployment_task(func):
    def task_func(name):
        if name not in env.deployments:
            print "Unknown deployment '%s'." % name
            print "Available deployments: ",
            print ', '.join(env.deployments)
            abort("Couldn't find deployment.")
        info = env.deployments[name]
        
        print "Using deployment '%s'." % name
        cfg_filename = path('data', 'deployment.json')
        cfg = open(cfg_filename, 'w')
        cfg.write(json.dumps(dict(
            name=name,
            url=info['url'],
            xpi_url=info['xpi_url']
            )))
        cfg.close()
        
        func(info)
    task_func.__name__ = func.__name__
    return task(task_func)

@deployment_task
def deploy_frontend(info):
    run('mkdir -p %s' % info['remote_dir'])
    rsync_project(remote_dir=info['remote_dir'],
                  local_dir='data/')
    print "front-end files placed in %s" % info['url']

import os
import sys
import datetime
import subprocess
import cgi

ROOT = os.path.abspath(os.path.dirname(__file__))
path = lambda *x: os.path.join(ROOT, *x)

CFX = 'cfx'
SCP = 'scp'
HTML_TEMPLATE = """
<html>
<head>
  <title>{config[fullName]}</title>
  <style>
  body {{
    font-family: Helvetica Neue, sans-serif;
    font-size: 10pt;
    width: 30em;
  }}

  .title {{
    font-weight: bold;
    font-size: 12pt;
  }}

  .details {{
    padding-top: 1em;
    padding-bottom: 1em;
    color: gray;
    font-family: Monaco, monospace;
    font-size: 9pt;
  }}

  a {{
    color: black;
    text-decoration: none;
  }}

  a:hover {{
   background: yellow;
  }}
  </style>
</head>
<body>
<div class="main-info">
  <div class="title">{config[fullName]}</div>
  <div class="desc">{config[description]}</div>
</div>
<div class="details">
  <div class="version">Version {config[version]}</div>
  <div class="author">By {config[author]}</div>
  <div class="pubdate">Published on {pubdate}</div>
</div>
<div class="actions">
  [ <a href="{xpi_url}">Install Addon</a> |
    <a href="{config[url]}">View Source</a> ]
</div>
</body>
</html>
"""

@deployment_task
def deploy_xpi(info):
    UPDATE_RDF_URL = info['xpi_url'] + "%(update_rdf)s"
    XPI_URL = info['xpi_url'] + "%(xpi)s"
    HTML_URL = info['xpi_url'] + "%(html)s"
    SCP_TARGET = env.hosts[0] + ':' + info['xpi_dir'] + '/'

    pkgdir = ROOT
    config = json.load(open(os.path.join(pkgdir, 'package.json')))

    update_rdf = '%s.update.rdf' % config['name']
    update_rdf_abspath = os.path.join(pkgdir, update_rdf)
    update_rdf_url = UPDATE_RDF_URL % locals()

    xpi = '%s.xpi' % config['name']
    xpi_abspath = os.path.join(pkgdir, xpi)
    xpi_url = XPI_URL % locals()

    cmdline = [
       CFX,
       'xpi',
       '--pkgdir', pkgdir,
       '--update-url', update_rdf_url,
       '--update-link', xpi_url
       ]

    # Write the template.
    pubdate = str(datetime.datetime.now())
    html = '%s.html' % config['name']
    html_abspath = os.path.join(pkgdir, html)
    for prop in ['fullName', 'description', 'author']:
        config[prop] = cgi.escape(config[prop])
    open(html_abspath, 'w').write(HTML_TEMPLATE.format(**locals()))

    # Build the XPI and update.rdf.
    subprocess.check_call(cmdline)

    # Upload them.
    subprocess.check_call([SCP, xpi_abspath, update_rdf_abspath,
                           html_abspath, SCP_TARGET])

    # Remove them from the local filesystem.
    os.remove(update_rdf_abspath)
    os.remove(xpi_abspath)
    os.remove(html_abspath)
    
    print "Download the addon at:"
    print HTML_URL % locals()

@task
def deploy(name):
    deploy_frontend(name)
    deploy_xpi(name)

@deployment_task
def configure(info):
    print "Generated data/deployment.json."
