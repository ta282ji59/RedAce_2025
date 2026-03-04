# map3d/views/api_crism_footprints.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db import connection

@require_GET
def api_crism_footprints(request):
    """
    /map3d/api/crism_footprints?west=..&east=..&south=..&north=..&limit=500
    returns: GeoJSON FeatureCollection (MultiPolygon) with observation_id
    """

    try:
        west  = float(request.GET.get("west"))
        east  = float(request.GET.get("east"))
        south = float(request.GET.get("south"))
        north = float(request.GET.get("north"))
        limit = int(request.GET.get("limit", 500))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid params"}, status=400)

    # safety limit
    limit = max(1, min(limit, 2000))

    # lon wrap対応：west/eastが -180..180 を跨ぐ場合がある
    # 例: west=170, east=-170（= 170..180 + -180..-170）
    # ここでは2つのbboxに分けて OR で拾う
    crosses_antimeridian = (west > east)

    # SRID=4326 前提（DBのcrism.footprintがそう）
    # bboxはST_MakeEnvelope(w,s,e,n,4326)
    if not crosses_antimeridian:
        sql = """
        SELECT
          id,
          observation_id,
          ST_AsGeoJSON(ST_Intersection(ST_MakeValid(footprint), ST_MakeEnvelope(%s,%s,%s,%s,4326))) AS geom
        FROM crism
        WHERE footprint && ST_MakeEnvelope(%s,%s,%s,%s,4326)
        ORDER BY id
        LIMIT %s;
        """
        params = [west, south, east, north, west, south, east, north, limit]
    else:
        # west..180 と -180..east の2つ
        sql = """
        SELECT
          id,
          observation_id,
          ST_AsGeoJSON(
            ST_Intersection(
              ST_MakeValid(footprint),
              ST_Union(
                ST_MakeEnvelope(%s,%s,180,%s,4326),
                ST_MakeEnvelope(-180,%s,%s,%s,4326)
              )
            )
          ) AS geom
        FROM crism
        WHERE footprint && ST_Union(
          ST_MakeEnvelope(%s,%s,180,%s,4326),
          ST_MakeEnvelope(-180,%s,%s,%s,4326)
        )
        ORDER BY id
        LIMIT %s;
        """
        params = [
            west, south, north, south, east, north,     # intersection union
            west, south, north, south, east, north,     # bbox filter union
            limit
        ]

    features = []
    with connection.cursor() as cur:
        cur.execute(sql, params)
        for row in cur.fetchall():
            _id, obsid, geom_json = row
            if geom_json is None:
                continue
            features.append({
                "type": "Feature",
                "geometry": __import__("json").loads(geom_json),
                "properties": {
                    "id": _id,
                    "observation_id": obsid,
                }
            })

    return JsonResponse({"type": "FeatureCollection", "features": features})
