from fabric.api import *
from fabric.contrib.project import rsync_project

try:
    import fabfile_local
except ImportError:
    pass

@task
def deploy(name):
    info = env.deployments[name]
    run('mkdir -p %s' % info['remote_dir'])
    rsync_project(remote_dir=info['remote_dir'],
                  local_dir='data/')
    print "files placed in %s" % info['url']
