FROM python:3.9

# 必要なツールをインストール
RUN apt-get update && \
    apt-get install -y curl gnupg libpq-dev && \
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g configurable-http-proxy

# JupyterHubをインストール
RUN pip install jupyterhub notebook

# 非rootユーザーを作成
RUN useradd -m -s /bin/bash -u 1000 jupyteruser

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係をインストール
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# アプリケーションコードをコピー
COPY . /app/

# /appディレクトリの所有権をjupyteruserに変更
RUN chown -R jupyteruser:jupyteruser /app

# ユーザーを変更
USER jupyteruser

# OAuth認証の安定性が向上するらしいツールを実行
RUN pip install pycurl


# JupyterHubを起動するための設定
CMD ["jupyterhub", "-f", "/app/jupyterhub_config.py"]

