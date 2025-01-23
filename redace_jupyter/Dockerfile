# ベースイメージ
FROM continuumio/anaconda3

# 必要なシステムライブラリをインストール
RUN apt-get update && apt-get install -y \
    python3-dev \
    libspatialindex-dev \
    poppler-utils \
    libpoppler-dev \
    curl \
    gcc \
    g++ \
    libgdal-dev \
    nodejs \
    npm \
    && apt-get clean

# Node.jsとConfigurable HTTP Proxyをインストール
RUN npm install -g configurable-http-proxy

# condaでGDALと関連パッケージをインストール
RUN conda install -y -c conda-forge gdal=3.6.2 geopandas pyproj shapely pvl rasterio

# 必要なPythonパッケージをインストール
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# JupyterHubと関連パッケージをインストール
RUN pip install jupyterhub notebook oauthenticator pycurl

# 作業ディレクトリを設定
WORKDIR /workspace

# ユーザーを作成
RUN useradd -m -s /bin/bash -u 1000 jupyteruser

# アプリケーションコードをコピー
COPY . /workspace/

# /workspaceディレクトリの所有権をjupyteruserに変更
RUN chown -R jupyteruser:jupyteruser /workspace

# ユーザーを変更
USER jupyteruser

# ポート設定とJupyterHub起動
CMD ["jupyterhub", "-f", "/workspace/jupyterhub_config.py"]
