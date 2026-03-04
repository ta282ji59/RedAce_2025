#!/bin/sh
set -euo pipefail
exec mapproxy-util serve-develop /srv/mapproxy/mapproxy.yaml -b 0.0.0.0:8080
