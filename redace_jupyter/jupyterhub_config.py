import os
from dotenv import load_dotenv
from jupyterhub.spawner import SimpleLocalProcessSpawner

# OAuth2 Authenticator
address = 'http://192.168.1.53'
c.JupyterHub.authenticator_class = 'oauthenticator.generic.GenericOAuthenticator'
c.GenericOAuthenticator.oauth_callback_url = (address + '7010/hub/oauth_callback')
c.GenericOAuthenticator.client_id = 'BKesCL8YzabkWcxysnO946pSZMyPZAnlHaOGolId'
c.GenericOAuthenticator.client_secret = 'sVTYuHODYQLo9vrm7uUMvZj1E5dBG2nR9LbOVFenJjTqsPV7b2BkmdXfNY7CkeLkd021B53bGRLcdZs3uV9KcIFxPpfpr5NLs9LS1QnLLjvqH5ahold92Y8ePvSo5cK2'
c.GenericOAuthenticator.authorize_url = (address + '88/o/authorize/')
c.GenericOAuthenticator.token_url = (address + '88/o/token/')
c.GenericOAuthenticator.userdata_url = (address + '88/userdata/')
c.GenericOAuthenticator.username_key = 'username'
c.GenericOAuthenticator.enable_pkce = False

# ユーザーの許可設定
c.Authenticator.allow_all = True
# c.Authenticator.create_system_users = True

# .envファイルのパスを指定して読み込み
load_dotenv('../.env') 
# データベース設定
c.JupyterHub.db_url = 'postgresql://{user}:{password}@{host}:{port}/{database}?options=-csearch_path%3Djupyterhub,public'.format(
    user=os.getenv('POSTGRES_USER'),
    password=os.getenv('POSTGRES_PASSWORD'),
    host=os.getenv('POSTGRES_HOST', 'db'),
    port=os.getenv('POSTGRES_PORT', '5432'),
    database=os.getenv('POSTGRES_DB')
)


# JupyterHub サーバー設定
c.JupyterHub.bind_url = 'http://0.0.0.0:7010'
c.JupyterHub.spawner_class = SimpleLocalProcessSpawner

def create_notebook_dir(spawner):
    notebook_dir = spawner.notebook_dir.format(username=spawner.user.name)
    os.makedirs(notebook_dir, exist_ok=True)

c.Spawner.pre_spawn_hook = create_notebook_dir
c.Spawner.notebook_dir = '/data/users/{username}'
c.Spawner.environment = {'USER': 'jupyteruser', 'HOME': '/data/users/{username}'}

c.JupyterHub.log_level = 'DEBUG'
c.Spawner.debug = True



# Proxy
c.ConfigurableHTTPProxy.auth_token = os.getenv('CONFIGPROXY_AUTH_TOKEN', 'secure-token')
