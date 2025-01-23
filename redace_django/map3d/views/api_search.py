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
            # リクエストデータを読み込む
            data = json.loads(request.body)
            logging.debug('リクエストデータ: {}'.format(data))

            # 検索条件の取得
            search_term = data.get("search")
            tag = data.get("check_item")
            
            # 結果の初期化
            final_results = None

            db = Database()
            try:
                db.connect()
                
                query_crism_1 = """
                                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} WHERE LOWER(REPLACE(observation_id, ' ', '')) = LOWER(REPLACE(%s, ' ', ''));
                                """
                    
                query_crism_2 = """
                                     SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} WHERE similarity(LOWER(REPLACE(observation_id, ' ', '')), LOWER(REPLACE(%s, ' ', ''))) > 0.65 ;
                                """
                
                query_crism_3 = """
                                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {} WHERE LOWER(REPLACE(observation_id, ' ', '')) LIKE LOWER(REPLACE(%s, ' ', '')) ;
                                """
                
                
                query_only_tag_1 = """
                                   SELECT name, lat, lon, feature_type FROM mars_map WHERE feature_type = %s;
                                 """


                query_1       = """
                                    SELECT name, lat, lon, feature_type FROM mars_map WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE(%s, ' ', ''));
                                """
                    
                query_2       = """
                                    SELECT name, lat, lon, feature_type FROM mars_map WHERE similarity(LOWER(REPLACE(name, ' ', '')), LOWER(REPLACE(%s, ' ', ''))) > 0.65;
                                """
                    
                query_3       = """
                                    SELECT name, lat, lon, feature_type FROM mars_map WHERE LOWER(REPLACE(name, ' ', '')) LIKE LOWER(REPLACE(%s, ' ', ''));
                                """
                
                if tag and (tag != 'not') and search_term == '':
                    if tag in ['crism', 'themis']:
                        if search_term == '':
                            query_only_tag_1 = f"""
                                                    SELECT observation_id, ST_AsGeoJSON(center_position) FROM {tag};
                                               """
                            result_query_only_tag = db.fetch_table(query_only_tag_1)
                            logging.debug('検索結果1: {}'.format(result_query_only_tag))
                            final_results = result_query_only_tag

                        # else:
                        #     table_name = tag
                        #     result_1 = db.fetch_table(query_crism_1.format(table_name), (search_term,))
                        #     logging.debug('検索結果1: {}'.format(result_1))
                        #     if result_1:
                        #         final_results = result_1
                        #     else:
                        #         result_2 = db.fetch_table(query_crism_2.format(table_name), (search_term,))
                        #         logging.debug('検索結果2: {}'.format(result_2))
                        #         if result_2:
                        #             final_results = result_2
                        #         else:
                        #             search_pattern = f"%{search_term}%"
                        #             result_3 = db.fetch_table(query_crism_3.format(table_name), (search_pattern,))
                        #             logging.debug('検索結果3: {}'.format(result_3))
                        #             final_results = result_3
                    
                    else:
                        if search_term == '':
                            result_query_only_tag = db.fetch_table(query_only_tag_1, (tag,))
                            logging.debug('検索結果1: {}'.format(result_query_only_tag))
                            final_results = result_query_only_tag

                else:
                    # データベース検索
                    if tag and tag != 'not':
                        query_1 = query_1.replace(";", f" AND feature_type = '{tag}';")
                        query_2 = query_2.replace(";", f" AND feature_type = '{tag}';")
                        query_3 = query_3.replace(";", f" AND feature_type = '{tag}';")

                    # データベース検索
                    result_1 = db.fetch_table(query_1, (search_term,))
                    logging.debug('検索結果1:\n {}\n'.format(result_1))
                    if result_1:
                        final_results = result_1
                    else:
                        result_2 = db.fetch_table(query_2, (search_term,))
                        logging.debug('検索結果2:\n {}\n'.format(result_2))
                        if result_2:
                            final_results = result_2
                        else:
                            search_pattern = f"%{search_term}%"
                            result_3 = db.fetch_table(query_3, (search_pattern,))
                            logging.debug('検索結果3:\n {}\n'.format(result_3))
                            if result_3:
                                final_results = result_3
                            else:
                                # CRISM または THEMIS のテーブルを検索
                                result_4 = db.fetch_table(query_crism_1.format("crism"), (search_term,))
                                logging.debug('検索結果4:\n {}\n'.format(result_4))
                                if result_4:
                                    final_results = result_4
                                    tag = 'crism'
                                else:
                                    result_5 = db.fetch_table(query_crism_1.format("themis"), (search_term,))
                                    logging.debug('検索結果5:\n {}\n'.format(result_5))
                                    if result_5:
                                        final_results = result_5
                                        tag = 'themis'
                                    else:
                                        result_6 = db.fetch_table(query_crism_2.format("crism"), (search_term,))
                                        logging.debug('検索結果6:\n {}\n'.format(result_6))
                                        if result_6:
                                            final_results = result_6
                                            tag = 'crism'
                                        else:
                                            result_7 = db.fetch_table(query_crism_2.format("themis"), (search_term,))
                                            logging.debug('検索結果7:\n {}\n'.format(result_7))
                                            if result_7:
                                                final_results = result_7
                                                tag = 'themis'
                                            else:
                                                search_pattern = f"%{search_term}%"
                                                result_8 = db.fetch_table(query_crism_3.format("crism"), (search_pattern,))
                                                logging.debug('検索結果8:\n {}\n'.format(result_8))
                                                if result_8:
                                                    final_results = result_8
                                                    tag = 'crism'
                                                else:
                                                    result_9 = db.fetch_table(query_crism_3.format("themis"), (search_pattern,))
                                                    logging.debug('検索結果9:\n {}\n'.format(result_9))
                                                    final_results = result_9
                                                    tag = 'themis'

                                            
                # 結果の処理
                new_results = []
                if final_results:
                    for row in final_results:
                        if tag and tag in ['crism', 'themis']:
                            # center_position を解析して緯度経度を抽出
                            geojson = json.loads(row["st_asgeojson"])  # ST_AsGeoJSON の結果をパース
                            coordinates = geojson.get("coordinates", [None, None])
                            row["latitude"] = coordinates[1]  # 緯度
                            row["longitude"] = coordinates[0]  # 経度
                            name = row["observation_id"]
                        
                        else:
                            lat = row.get("lat")
                            lon = row.get("lon")
                            row["latitude"] = float(lat) if lat else None
                            row["longitude"] = float(lon) if lon else None
                            name = row["name"]
                        
                        new_results.append({
                            "lat": row["latitude"],
                            "lon": row["longitude"],
                            "name": name
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