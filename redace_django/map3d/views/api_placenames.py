# redace_app/api/api_placenames.py

from django.http import JsonResponse
from django.db import connection

def api_placenames(request):
    try:
        west  = float(request.GET.get("west"))
        east  = float(request.GET.get("east"))
        south = float(request.GET.get("south"))
        north = float(request.GET.get("north"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "bbox required"}, status=400)

    limit = int(request.GET.get("limit", "500"))
    limit = max(1, min(limit, 3000))

    sql = """
    SELECT
      id, name, feature_type, diameter,
      CASE
        WHEN ST_X(footprint) > 180 THEN ST_X(footprint) - 360
        ELSE ST_X(footprint)
      END AS lon,
      ST_Y(footprint) AS lat
    FROM mars_map
    WHERE name IS NOT NULL
      AND (
        CASE
          WHEN ST_X(footprint) > 180 THEN ST_X(footprint) - 360
          ELSE ST_X(footprint)
        END
      ) BETWEEN %(west)s AND %(east)s
      AND ST_Y(footprint) BETWEEN %(south)s AND %(north)s
    LIMIT %(limit)s
    """

    with connection.cursor() as cur:
        cur.execute(sql, {
            "west": west,
            "east": east,
            "south": south,
            "north": north,
            "limit": limit
        })
        rows = cur.fetchall()

    features = []
    for id_, name, feature_type, diameter, lon, lat in rows:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat],
            },
            "properties": {
                "id": id_,
                "name": name,
                "feature_type": feature_type,
                "diameter": diameter,
            }
        })

    return JsonResponse({
        "type": "FeatureCollection",
        "features": features
    })
