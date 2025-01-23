from ..postgre import Database
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json,csv,datetime,os
import math

import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')


@csrf_exempt
def table(request):
    if request.method == 'POST':
        try:
            # リクエストデータを読み込む
            data = json.loads(request.body)
            username = data.get("user_info")

            db = Database()
            try:
                db.connect()

                # ユーザー名に基づいてデータを取得(使用する列のみ指定した)
                query =  f"""
                            SELECT 
                                map3d_spectrums.id,
                                map3d_spectrums.instrument,
                                map3d_spectrums.latitude,
                                map3d_spectrums.longitude,
                                map3d_spectrums.description,
                                map3d_spectrums.created_date,
                                map3d_spectrums.data_id
                            FROM 
                                map3d_spectrums
                            INNER JOIN 
                                auth_user 
                            ON 
                                map3d_spectrums.user_id = auth_user.id
                            WHERE 
                                auth_user.username = '{username}';
                        """

                # データベース検索
                results = db.fetch_table(query)
                # logging.debug('検索結果: {}'.format(results))

                # 結果の処理
                new_results = []
                if results:
                    for row in results:
                        point_text = row.get("point")  # "POINT(lon lat)"形式のデータ
                        # logging.debug(': {}'.format(point_text))
                        if point_text and point_text.startswith("POINT"):
                            # POINTデータを緯度経度に変換
                            point_data = point_text.lstrip("POINT(").rstrip(")").split()
                            # logging.debug(': {}'.format(point_data))
                            lon, lat = map(float, point_data)
                            row["longitude"] = lon
                            row["latitude"] = lat
                        new_results.append(row)

                    return JsonResponse({"data": new_results}, status=200)
                else:
                    return JsonResponse({"data": new_results}, status=200)
            except Exception as e:
                logging.error("データベースエラー詳細: %s", str(e))
                return JsonResponse({"error": "データベースエラーが発生しました", "details": str(e)}, status=500)
            finally:
                db.close()
        except json.JSONDecodeError:
            return JsonResponse({"error": "無効なJSONフォーマットです"}, status=400)
    return JsonResponse({"error": "POSTリクエストのみ受け付けています"}, status=405)


@csrf_exempt
def get_graph_data(request):
    if request.method == 'POST':
        try:
            # リクエストデータを読み込む
            data = json.loads(request.body)
            row_id = data.get("row_id")
            logging.debug('検索項目: {}'.format(row_id))

            db = Database()
            try:
                db.connect()
                query =  f"""
                            SELECT 
                                map3d_spectrums.wavelength,
                                map3d_spectrums.reflectance
                            FROM 
                                map3d_spectrums
                            INNER JOIN 
                                auth_user 
                            ON 
                                map3d_spectrums.user_id = auth_user.id
                            WHERE 
                                map3d_spectrums.id = '{row_id}';
                        """
                # データベース検索
                results = db.fetch_table(query)
                logging.debug('検索結果: {}'.format(results))
                # 結果の処理
                new_results = []
                if results:
                    for row in results:
                        new_results.append(row)
                    logging.debug('転送結果: {}'.format(new_results))
                    return JsonResponse({"data": new_results}, status=200)
                else:
                    return JsonResponse({"data": new_results}, status=200)
            except Exception as e:
                logging.error("データベースエラー詳細: %s", str(e))
                return JsonResponse({"error": "データベースエラーが発生しました", "details": str(e)}, status=500)
            finally:
                db.close()
        except json.JSONDecodeError:
            return JsonResponse({"error": "無効なJSONフォーマットです"}, status=400)
    return JsonResponse({"error": "POSTリクエストのみ受け付けています"}, status=405)
                        

def create_csv_for_pattern(user,project, formats, owner, data_id, latitude, longitude, wavelength, reflectance):
    try:
        # 現在の時間を取得して一意のファイル名を生成
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

        # 保存先ディレクトリを設定
        if owner:
            base_dir = f"/data/users/{project}/{data_id}_{timestamp}"
        else:
            base_dir = f"/data/groups/{project}/{user}/{data_id}_{timestamp}"

        # ディレクトリが既に存在する場合、名前を修正
        save_dir = base_dir
        counter = 1
        while os.path.exists(save_dir):
            save_dir = f"{base_dir}_{counter}"
            counter += 1

        save_dir += '/'

        # reflectanceがリストの場合に-1をNaNに変換
        if isinstance(reflectance, list):
            if all(isinstance(row, list) for row in reflectance):  # 2次元リストの場合
                reflectance = [[math.nan if val == -1 else val for val in row] for row in reflectance]
            else:  # 1次元リストの場合
                reflectance = [math.nan if val == -1 else val for val in reflectance]

        # ディレクトリを作成
        os.makedirs(save_dir, exist_ok=True)
        # パーミッションを設定
        os.chmod(save_dir, 0o777)

        # formats に基づく処理
        if formats.strip() == 'merged1':
            # Merged1 の処理（既存コードをそのまま使用）
            csv_filepath = os.path.join(save_dir, f"{data_id}_{timestamp}.csv")
            with open(csv_filepath, mode='w', newline='') as csv_file:
                writer = csv.writer(csv_file)

                # ヘッダーのセッティング
                header = ["wavelength"]
                for i in range(len(latitude)):
                    # latitude[i] = str(latitude[i]).replace("-", "m")
                    # longitude[i] = str(longitude[i]).replace("-", "m")
                    header.append(f"reflectance_{latitude[i]}_{longitude[i]}")
                
                # ヘッダーを書き込み
                writer.writerow(header)

                if isinstance(reflectance, list) and all(isinstance(row, list) for row in reflectance):
                    # 2次元配列の場合
                    for i, wav in enumerate(wavelength):    
                        row = [wav] + [ref[i] if i < len(ref) else None for ref in reflectance]
                        writer.writerow(row)
                else:
                    # 1次元配列の場合
                    for i, wav in enumerate(wavelength):
                        ref = reflectance[i] if i < len(reflectance) else None
                        writer.writerow([wav, ref])

        elif formats.strip() == 'separate1':
            # Separate1 の処理：反射スペクトルごとに個別のCSVファイルを作成
            if isinstance(reflectance[0], list):
                # reflectance が2次元配列の場合
                for i in range(len(latitude)):
                    # 緯度・経度の変換（"-" を "m" に変更）
                    latitude_str = str(latitude[i]).replace("-", "m")
                    longitude_str = str(longitude[i]).replace("-", "m")

                    # ファイル名を生成
                    csv_filename = f"{data_id}_{timestamp}_{latitude_str}_{longitude_str}.csv"
                    csv_filepath = os.path.join(save_dir, csv_filename)

                    # CSV ファイルの書き込み
                    with open(csv_filepath, mode='w', newline='') as csv_file:
                        writer = csv.writer(csv_file)

                        # ヘッダーを書き込み
                        writer.writerow(["wavelength", f"reflectance_{latitude_str}_{longitude_str}"])

                        # データを書き込み
                        for j, wav in enumerate(wavelength):
                            ref = reflectance[i][j] if j < len(reflectance[i]) else None
                            writer.writerow([wav, ref])
            else:
                # reflectance が1次元配列の場合
                for i in range(len(latitude)):
                    # 緯度・経度の変換（"-" を "m" に変更）
                    latitude_str = str(latitude[i]).replace("-", "m")
                    longitude_str = str(longitude[i]).replace("-", "m")

                    # ファイル名を生成
                    csv_filename = f"{data_id}_{timestamp}_{latitude_str}_{longitude_str}.csv"
                    csv_filepath = os.path.join(save_dir, csv_filename)

                    # CSV ファイルの書き込み
                    with open(csv_filepath, mode='w', newline='') as csv_file:
                        writer = csv.writer(csv_file)

                        # ヘッダーを書き込み
                        writer.writerow(["wavelength", f"reflectance_{latitude_str}_{longitude_str}"])

                        # データを書き込み
                        for j, wav in enumerate(wavelength):
                            ref = reflectance[j] if j < len(reflectance) else None
                            writer.writerow([wav, ref])

        user_visible_filepath = csv_filepath.replace("/data/", "")
        return {"status": "success", "file": user_visible_filepath}

    except Exception as e:
        logging.error(f"CSV生成エラー: {e}")
        return {"status": "error", "message": str(e)}

@csrf_exempt
def export(request):
    if request.method == 'POST':
        try:
            # リクエストデータを読み込む
            logging.debug('POSTリクエストを受信しました')
            data = json.loads(request.body)
            logging.debug('受信データ: %s', data)

            # データをリストとして処理
            if not isinstance(data, list):
                logging.error("データ形式エラー: リスト形式が必要です")
                return JsonResponse({"error": "リスト形式のデータが必要です"}, status=400)

            results = []
            for item in data:
                user = item.get("user", "N/A")
                project = item.get("project", "N/A")
                owner = item.get("owner", "N/A")
                formats = item.get("format", "N/A")
                data_id = item.get("data_id", "N/A")
                latitude = item.get("latitude", "N/A")
                longitude = item.get("longitude", "N/A")
                wavelength = item.get("wavelength", "N/A")
                reflectance = item.get("reflectance", "N/A")
                description = item.get("description", "N/A")

                result = create_csv_for_pattern(user,project, formats, owner, data_id, latitude, longitude, wavelength, reflectance)
                results.append(result)

            # 成功レスポンスを返却
            return JsonResponse({"message": "データを正常に受信し、CSVに保存しました", "results": results}, status=200)

        except json.JSONDecodeError:
            logging.error("JSONデコードエラー")
            return JsonResponse({"error": "無効なJSONデータです"}, status=400)
        except Exception as e:
            logging.error("予期しないエラー: %s", str(e))
            return JsonResponse({"error": "サーバーエラー", "details": str(e)}, status=500)
    else:
        logging.warning("不正なリクエストメソッド: %s", request.method)
        return JsonResponse({"error": "POSTメソッドのみ許可されています"}, status=405)



@csrf_exempt
def delete(request):
    if request.method == 'POST':
        try:
            # リクエストデータを読み込む
            data = json.loads(request.body)
            # logging.debug(' リクエストデータ: %s', data)

            # 複数のIDを取得
            record_ids = [item["id"] for item in data if "id" in item]
            # logging.debug('削除対象ID: %s', record_ids)

            if not record_ids:
                return JsonResponse({"error": "IDが提供されていません"}, status=400)

            # データベース操作
            try:
                db = Database()  # Databaseインスタンスの作成
                db.connect()  # データベース接続

                # プレースホルダーを動的に生成
                placeholders = ", ".join(["%s"] * len(record_ids))
                query = f"DELETE FROM map3d_spectrums WHERE id IN ({placeholders});"

                # クエリを実行
                db.execute(query, record_ids)
                db.connection.commit()  # 変更をコミット
                logging.debug("削除完了")

                return JsonResponse({"message": f"{len(record_ids)} 件のデータが正常に削除されました"}, status=200)

            except Exception as e:
                logging.error("データベースエラー詳細: %s", str(e))
                return JsonResponse({"error": "データベースエラーが発生しました", "details": str(e)}, status=500)

            finally:
                db.close()  # データベース接続を確実に閉じる

        except json.JSONDecodeError:
            return JsonResponse({"error": "無効なJSONフォーマットです"}, status=400)
        except Exception as e:
            logging.error("予期しないエラー: %s", str(e))
            return JsonResponse({"error": "予期しないエラーが発生しました", "details": str(e)}, status=500)
    else:
        return JsonResponse({"error": "POSTリクエストのみ受け付けています"}, status=405)