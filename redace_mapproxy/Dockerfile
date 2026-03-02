FROM python:3.11-slim
WORKDIR /srv/mapproxy

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /srv/mapproxy/requirements.txt
RUN pip install --no-cache-dir -r /srv/mapproxy/requirements.txt

COPY mapproxy.yaml /srv/mapproxy/mapproxy.yaml
COPY start.sh      /srv/mapproxy/start.sh
RUN chmod +x /srv/mapproxy/start.sh

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD curl -fsS http://127.0.0.1:8080/service?SERVICE=WMTS\&REQUEST=GetCapabilities >/dev/null || exit 1

CMD ["/srv/mapproxy/start.sh"]
