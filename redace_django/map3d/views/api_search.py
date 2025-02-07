from ..postgre import Database
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import logging

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')

@csrf_exempt
def feature_search(request):
    if request.method == 'POST':
            data = json.loads(request.body)
            feature = data.get("feature")
            id = data.get("id")

            result = None
            db = Database()
            
            db.connect()
            if feature == "mission":    
                query_mission = f"""
                                    SELECT observation_id FROM {id};
                                """
                result = db.fetch_table(query_mission)
                logging.debug('データ: {}'.format(result))

            else:    
                query_type = """
                                SELECT name FROM mars_map WHERE feature_type = %s;
                             """
                result = db.fetch_table(query_type, (id,))
                logging.debug('データ: {}'.format(result))
            
            result = [dict(row) for row in result]
            
            
    return JsonResponse({"data": result}, status=200)


@csrf_exempt
def search(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logging.debug('リクエストデータ: {}'.format(data))

            search_term = data.get("search")
            tag = data.get("check_item")

            final_results = None
            db = Database()

            try:
                db.connect()

                query_crism = """
                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} 
                    WHERE LOWER(REPLACE(observation_id, ' ', '')) = LOWER(REPLACE(%s, ' ', ''));
                """

                query_crism_sim = """
                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} 
                    WHERE similarity(LOWER(REPLACE(observation_id, ' ', '')), LOWER(REPLACE(%s, ' ', ''))) > 0.65;
                """

                query_crism_like = """
                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} 
                    WHERE LOWER(REPLACE(observation_id, ' ', '')) LIKE LOWER(REPLACE(%s, ' ', ''));
                """

                query_tag_only = """
                    SELECT name, ST_AsGeoJSON(footprint) FROM mars_map WHERE feature_type = %s;
                """

                query_name_exact = """
                    SELECT name, ST_AsGeoJSON(footprint) FROM mars_map 
                    WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE(%s, ' ', ''));
                """

                query_name_sim = """
                    SELECT name, ST_AsGeoJSON(footprint) FROM mars_map 
                    WHERE similarity(LOWER(REPLACE(name, ' ', '')), LOWER(REPLACE(%s, ' ', ''))) > 0.65;
                """

                query_name_like = """
                    SELECT name, ST_AsGeoJSON(footprint) FROM mars_map 
                    WHERE LOWER(REPLACE(name, ' ', '')) LIKE LOWER(REPLACE(%s, ' ', ''));
                """

                if tag and tag != 'not' and search_term == '':
                    if tag in ['crism', 'themis']:
                        query_tag_only = f"""
                            SELECT observation_id, ST_AsGeoJSON(center_position) FROM {tag};
                        """
                        final_results = db.fetch_table(query_tag_only)
                    else:
                        final_results = db.fetch_table(query_tag_only, (tag,))
                else:
                    if tag and tag != 'not':
                        query_name_exact = query_name_exact.replace(";", f" AND feature_type = '{tag}';")
                        query_name_sim = query_name_sim.replace(";", f" AND feature_type = '{tag}';")
                        query_name_like = query_name_like.replace(";", f" AND feature_type = '{tag}';")

                    result_1 = db.fetch_table(query_name_exact, (search_term,))
                    if result_1:
                        final_results = result_1
                    else:
                        result_2 = db.fetch_table(query_name_sim, (search_term,))
                        if result_2:
                            final_results = result_2
                        else:
                            search_pattern = f"%{search_term}%"
                            result_3 = db.fetch_table(query_name_like, (search_pattern,))
                            if result_3:
                                final_results = result_3
                            else:
                                for table in ["crism", "themis"]:
                                    result = db.fetch_table(query_crism.format(table), (search_term,))
                                    if result:
                                        final_results = result
                                        break
                                    result = db.fetch_table(query_crism_sim.format(table), (search_term,))
                                    if result:
                                        final_results = result
                                        break
                                    result = db.fetch_table(query_crism_like.format(table), (search_pattern,))
                                    if result:
                                        final_results = result
                                        break

                # 結果を処理
                new_results = []
                if final_results:
                    for row in final_results:
                        geojson = json.loads(row["st_asgeojson"])
                        coordinates = geojson.get("coordinates", [None, None])
                        row["latitude"] = coordinates[1]  # 緯度
                        row["longitude"] = coordinates[0]  # 経度

                        new_results.append({
                            "lat": row["latitude"],
                            "lon": row["longitude"],
                            "name": row.get("name", row.get("observation_id"))
                        })

                    return JsonResponse({"data": new_results}, status=200)
                else:
                    return JsonResponse({"data": []}, status=200)

            except Exception as e:
                logging.error("データベースエラー詳細: %s", str(e))
                return JsonResponse({"error": "データベースエラーが発生しました", "details": str(e)}, status=500)
            finally:
                db.close()
        except json.JSONDecodeError:
            return JsonResponse({"error": "無効なJSONフォーマットです"}, status=400)

    return JsonResponse({"error": "POSTリクエストのみ受け付けています"}, status=405)
