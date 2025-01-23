import cgitb
cgitb.enable()

import csv
import pvl
import json
import math
import numpy as np
import collections as cl
from osgeo import gdal, osr
from collections import defaultdict

def support_map_default(o):
    if isinstance(o, map):
        return o.isoformat()
    raise TypeError(repr(o) + " is not JSON serializable")

def base_json_getRef(params_json):
    ######### THEMIS #########
    # 引数 >> obs_name,obs_ID,path,wavelength,pixels 
    if params_json["obs_name"] == 'THEMIS' and params_json["type"] == 'DIRECT':
        field = cl.OrderedDict() # 順番が保持された辞書
        field["path"] = params_json["path"]
        field["obs_ID"] = params_json["obs_ID"]
        field["obs_name"] = params_json["obs_name"]
        field["Image_path"] = params_json["Image_path"]
        field["pixels"] = params_json["pixels"]
        field["type"] = params_json["type"]

        cube_data = gdal.Open(field["path"]["main"]["cub"], gdal.GA_ReadOnly) # データを読み込み専用で開きます
        header = pvl.load(field["path"]["main"]["cub"])
        lbl_data = pvl.load(field["path"]["main"]["lbl"])
        bandnumber_range = list(range(cube_data.RasterCount)) # バンドの数を最初から最後までリストに入れる ex)0,1,2,...
        NDV = cube_data.GetRasterBand(1).GetNoDataValue() # バンドのデータ無し値を取得
        ref_list = []
        no_data_ref = 1

        # 波長の順番が昇順と降順の時がある >> 昇順にする
        wav_list = params_json["wavelength"].split(',')
        wav_list = [round(float(s), 5) for s in wav_list]
        if wav_list[0] > wav_list[1]:
            wav_list.reverse()
            is_reverse = True
        else:
            is_reverse = False

        if "Caminfo" in lbl_data and lbl_data["Caminfo"]["Geometry"]["IncidenceAngle"] != None :
            E1 = (3.846 * (10 ** 26)) / (4 * math.pi)
            Em = E1 / (227936640000) ** 2
            Lref = Em * (math.cos(math.radians(float(lbl_data["Caminfo"]["Geometry"]["IncidenceAngle"]))) / math.pi) * 0.0001
        else:
            Lref = 1
            if cube_data.GetRasterBand(cube_data.RasterCount).ReadAsArray()[int(params_json["pixels"][1])][int(params_json["pixels"][0])] == NDV: # データあるか無いか判断
                no_data_ref = 1
            else:
                no_data_ref = 0

            for bandnumber_i in bandnumber_range:
                ref = cube_data.GetRasterBand(bandnumber_i + 1).ReadAsArray()[int(params_json["pixels"][1])][int(params_json["pixels"][0])]
                ######
                #m, km ->cm   | m^2, km^2 -> cm | Radiance of the Sun   , use [m] so ->[cm]
                ref = ref * 10 / Lref
				#######
                if ref == NDV:
                    ref_list.append(-1)
                else:
                    ref_list.append(round(float(ref), 5))
                    # ref_list.append(ref)

        if no_data_ref != 1:
            if is_reverse == True:
                ref_list.reverse()
            # ref_str = ",".join(map(str, ref_list))
            pass
        else: # spectralを表示しない
            ref_list = -1
            # ref_str = -1

        gt = cube_data.GetGeoTransform()
        srs = osr.SpatialReference()
        srs.ImportFromWkt(cube_data.GetProjection())
        srs2 = srs.CloneGeogCS()
        trans = osr.CoordinateTransformation(srs, srs2)

        x = gt[0] + (params_json["pixels"][0] * gt[1]) + (params_json["pixels"][1] * gt[2])
        y = gt[3] + (params_json["pixels"][0] * gt[4]) + (params_json["pixels"][1] * gt[5])
        x,y,z = trans.TransformPoint(x, y)

        field["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]
        field["coordinate"] = [x, y] # pixel座標
        field["reflectance"] = ref_list # ref_str
        field["band_number"] = cube_data.RasterCount  # bandnumber_range
        band_bin_width = header['IsisCube']['BandBin']['Width']
        field["band_bin_width"] = ",".join(map(str, band_bin_width))
        field["band_bin_center"] = wav_list # params_json["wavelength"]

        json_data = json.dumps(field)
        return json_data

    ######## CRISM #########
    elif params_json["obs_name"] == 'CRISM' and params_json["type"] == 'DIRECT':
        # 新しいjson形式fieldを定義, 順番が保持された辞書
        field = cl.OrderedDict()
        field["path"] = params_json["path"]
        field["obs_ID"] = params_json["obs_ID"]
        field["obs_name"] = params_json["obs_name"]
        field["Image_path"] = params_json["Image_path"]
        field["pixels"] = params_json["pixels"]
        field["type"] = params_json["type"]

        # cubeファイルを開く, データを読み込み専用で開く, 第一引数：cubeファイル名
        cube_data = gdal.Open(field["path"]["main"]["cub"], gdal.GA_ReadOnly)
        # 属性の変数格納
        get_raster_band = cube_data.GetRasterBand
        # バンドのデータ無し値を取得
        NDV = get_raster_band(1).GetNoDataValue()

        # 波長の順番が昇順と降順の時がある >> 昇順にする
        wav_list = params_json["wavelength"].split(',')
        wav_list = [round(float(s), 5) for s in wav_list]
        if wav_list[0] > wav_list[1]:
            wav_list.reverse()
            is_reverse = True
        else:
            is_reverse = False

        y1, x1 = int(params_json["pixels"][1]), int(params_json["pixels"][0])

        # 反射率が取得可能かどうか
        if get_raster_band(30).ReadAsArray()[y1][x1] == NDV:
            ref_str = -1
        else:
            ref_list = []
            bandnumber_range = list(range(cube_data.RasterCount)) # バンドの数を最初から最後までリストに入れる ex)0,1,2,...
            bandnumber_range.pop(0)
            # 反射率をリストに格納
            for bandnumber_i in bandnumber_range:
                ref = get_raster_band(bandnumber_i + 1).ReadAsArray()[y1][x1] # 多分 [1]Y,[0]X
                if ref != NDV:
                    ref_list.append(round(float(ref), 5))
                else:
                    ref_list.append(-1)
            
            if is_reverse == True:
                ref_list.reverse()

        field["band_number"] = cube_data.RasterCount - 1 # ex) 1,2,...,437
        field["band_bin_center"] = wav_list      # 波長
        field["reflectance"] = ref_list          # 反射率
        field["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]

        # lon = round(float(params_json["cube_coords"]["lat"][y1][x1]), 5)
        # lat = round(float(params_json["cube_coords"]["lon"][y1][x1]), 5)
        # field["coordinate"] = [lon, lat]

        # cubeファイルを開く
        cube_data2 = gdal.Open(field["path"]["derived"]["cub"], gdal.GA_ReadOnly)
        lon = cube_data2.GetRasterBand(5).ReadAsArray()[y1][x1]
        lat = cube_data2.GetRasterBand(4).ReadAsArray()[y1][x1]
        field["coordinate"] = [round(float(lon), 5), round(float(lat), 5)]

        json_data = json.dumps(field)
        return json_data
    
    elif params_json["obs_name"] == 'CRISM' and params_json["type"] == 'ALL':
        # 新しいjson形式fieldを定義, 順番が保持された辞書
        field = cl.OrderedDict()
        field["obs_ID"] = params_json["obs_ID"]
        field["path"] = params_json["path"]

        # cubeファイルを開く, データを読み込み専用で開く, 第一引数：cubeファイル名
        cube_data = gdal.Open(field["path"]["main"]["cub"], gdal.GA_ReadOnly)

        # NDV = cube_data.GetRasterBand(1).GetNoDataValue() # バンドのデータ無し値を取得

        ref_array = []
        ref_list = []
        ref_str = []
        # no_data_ref = 1
        # first = 0
        print('success1')

        # file_name = field["obs_ID"] + ".csv"
        # response = HttpResponse(content_type='text/csv')
        # response['Content-Disposition'] = 'attachment; filename="file_name.csv"'
        # writer = csv.writer(response)
        # for i in range(1, 5):
        #     print(i)
        #     ref_array = cube_data.GetRasterBand(i).ReadAsArray()      # 2次元配列
        #     ref_list = list(itertools.chain.from_iterable(ref_array)) # 1次元配列化f.write
        #     writer.writerow(ref_list)

        # file_name = field["obs_ID"] + ".csv"
        # with open(file_name, 'w') as f:
        #     writer = csv.writer(f)
        #     for i in range(1, cube_data.RasterCount):
        #         print(i)
        #         ref_array = cube_data.GetRasterBand(i).ReadAsArray()      # 2次元配列
        #         ref_list = list(itertools.chain.from_iterable(ref_array)) # 1次元配列化f.write
        #         writer.writerow(ref_list)

        # for i in range(1, 2):#cube_data.RasterCount):
        #     print(i)
        #     ref_array = cube_data.GetRasterBand(i).ReadAsArray()      # 2次元配列
        #     # ref_list = list(itertools.chain.from_iterable(ref_array)) # 1次元配列化
        #     # ref_str = ",".join(list(map(str, ref_list)))              # 文字列化
        #     ref_str.append(ref_array)

        # 1バンドのrefを全て取れる、数秒。
        for i in range(30, 31):
            for j in range(0, cube_data.RasterYSize):
                ref_list = cube_data.GetRasterBand(i).ReadAsArray()[j] # 1次元配列
                ref_str = ",".join(list(map(str, ref_list)))
                ref_str.append(ref_str)

        print('success2')

        # # pixelは画像の左上が(0,0)だと思う。
        # if cube_data.GetRasterBand(30).ReadAsArray()[0][0] == NDV:
        #     no_data_ref = 1
        # else:
        #     no_data_ref = 0
        #     for bandnumber_i in bandnumber_range:
        #         if first == 0:
        #             first = 1
        #             continue

        #         ref = cube_data.GetRasterBand(bandnumber_i + 1).ReadAsArray()[50][50] # 多分 [Y][X]

        #         if ref == NDV:
        #             ref_list.append(-1)
        #         else:
        #             ref_list.append(ref)

        # # 反射率の格納
        # if no_data_ref != 1:
        #     ref_str = ",".join(list(map(str, ref_list)))
        # else:
        #     ref_str = -1

        # RasterXSize（RasterYSize）:ラスター幅のピクセル単位
        field["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]
        field["reflectance"] = ref_str # 反射率
        field["band_number"] = cube_data.RasterCount - 1 # バンドの数
        field["band_bin_center"] = params_json["wavelength"]

        print('success3')

        json_data = json.dumps(field)
        print('success4')
        return json_data
        # return response

    elif params_json["obs_name"] == 'CRISM' and params_json["type"] == 'ROI':
        # 新しいjson形式fieldを定義, 順番が保持された辞書
        field = cl.OrderedDict()
        field["path"] = params_json["path"]
        field["obs_ID"] = params_json["obs_ID"]
        field["obs_name"] = params_json["obs_name"]
        field["path"] = params_json["path"]
        field["Image_path"] = params_json["Image_path"]
        field["pixels"] = params_json["pixels"]
        field["type"] = params_json["type"]
        # cubeファイルを開く, データを読み込み専用で開く, 第一引数：cubeファイル名
        cube_data = gdal.Open(field["path"]["main"]["cub"], gdal.GA_ReadOnly)
        # 属性の変数格納
        # get_raster_band = cube_data.GetRasterBand
        # バンドのデータ無し値を取得
        NDV = cube_data.GetRasterBand(1).GetNoDataValue()
        # 全バンドのラスターデータ読み込み
        ref_all_band = cube_data.ReadAsArray()
        band_num = cube_data.RasterCount

        # 波長の順番が昇順と降順の時がある >> 昇順にする
        wav_list = params_json["wavelength"].split(',')
        wav_list = [round(float(s), 5) for s in wav_list]
        if wav_list[0] > wav_list[1]:
            wav_list.reverse()
            is_reverse = True
        else:
            is_reverse = False

        # 反射率をリストに格納
        px_array = params_json["pixels"]
        ref_array = []
        for i in range(len(px_array)):
            ref_list = []
            for z in range(1, band_num):
                ref = ref_all_band[z, px_array[i][1], px_array[i][0]]
                if ref != NDV:
                    ref_list.append(round(float(ref), 5))
                else:
                    ref_list.append(-1)
            
            # 昇順にする
            if is_reverse == True:
                ref_list.reverse()

            ref_array.append(ref_list) # list結合（二次元配列）

        field["band_number"] = band_num - 1 # ex) 1,2,...,437
        field["band_bin_center"] = wav_list     # 波長
        field["reflectance"] = ref_array        # 反射率
        field["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]

        # 選択したピクセルの緯度経度を配列に格納
        # coord_array = []
        # for i in range(len(px_array)):
        #     lon = round(float(params_json["cube_coords"]["lat"][int(px_array[i][1])][int(px_array[i][0])]), 5)
        #     lat = round(float(params_json["cube_coords"]["lon"][int(px_array[i][1])][int(px_array[i][0])]), 5)
        #     coord_array.append([lon, lat])

        # field["coordinate"] = coord_array

        cube_data2 = gdal.Open(field["path"]["derived"]["cub"], gdal.GA_ReadOnly)
        coord_array = []
        for i in range(len(px_array)):
            lon = cube_data2.GetRasterBand(5).ReadAsArray()[int(px_array[i][1])][int(px_array[i][0])]
            lat = cube_data2.GetRasterBand(4).ReadAsArray()[int(px_array[i][1])][int(px_array[i][0])]
            coord_array.append([round(float(lon), 5), round(float(lat), 5)])

        field["coordinate"] = coord_array

        json_data = json.dumps(field)
        return json_data
    

def scaling_Reflectance(params_json):
    if params_json["type"] == 'normalize':
        data_arr = params_json["dataArr"]
        data_arr = np.array(data_arr)
        new_data_arr = data_arr[:, 0].reshape(1, -1)
        scaler = SpectrumScaling()

        for i in range(1, len(data_arr[0])):
            ref_1d = np.array([x if x is not None else np.nan for x in data_arr[:, i]])
            ref_1d = scaler.normalization(ref_1d)
            new_data_arr = np.append(new_data_arr, ref_1d.reshape(1, -1), axis=0)

        # json.parseがnanを処理出来ないため
        for i in range(len(new_data_arr)):
            new_data_arr[i] = [x if not np.isnan(x) else -9999 for x in new_data_arr[i]]

        field = cl.OrderedDict()
        field["dataArr"] = new_data_arr.T.tolist()
        field["type"] = params_json["type"]
        json_data = json.dumps(field)
        return json_data
    
    elif params_json["type"] == 'standardize':
        data_arr = params_json["dataArr"]
        data_arr = np.array(data_arr)
        new_data_arr = data_arr[:, 0].reshape(1, -1)
        scaler = SpectrumScaling()

        for i in range(1, len(data_arr[0])):
            ref_1d = np.array([x if x is not None else np.nan for x in data_arr[:, i]])
            ref_1d = scaler.standardization(ref_1d)
            new_data_arr = np.append(new_data_arr, ref_1d.reshape(1, -1), axis=0)

        # json.parseがnanを処理出来ないため
        for i in range(len(new_data_arr)):
            new_data_arr[i] = [x if not np.isnan(x) else -9999 for x in new_data_arr[i]]

        field = cl.OrderedDict()
        field["dataArr"] = new_data_arr.T.tolist()
        field["type"] = params_json["type"]
        json_data = json.dumps(field)
        return json_data
    

def smoothing_Reflectance(params_json):
    if params_json["type"] == 'stacking':
        data_arr = params_json["dataArr"]
        data_arr = np.array(data_arr)
        # wav 2d [[,,,,]]
        wav = data_arr[:, 0]
        # ref only
        ref_2d = np.delete(data_arr, 0, axis=1)
        ref_2d_rev = np.array([], dtype=np.float64).reshape(0, len(ref_2d[0]))

        # for i, row in enumerate(ref_2d):
        for row in ref_2d:
            ref_nonone = np.array([x if x is not None else np.nan for x in row])
            ref_2d_rev = np.vstack((ref_2d_rev, ref_nonone))

        stacked_ref = SpectrumSmoothing().stacking(ref_2d_rev)

        print("stacked_ref")
        print(stacked_ref)

        stacked_ref = [x if not np.isnan(x) else -9999 for x in stacked_ref]
        new_data_arr = np.column_stack((wav, stacked_ref))

        print('new_data_arr')
        print(new_data_arr)

        field = cl.OrderedDict()
        field["dataArr"] = new_data_arr.tolist()
        field["type"] = params_json["type"]
        json_data = json.dumps(field)

        print(json_data)
        return json_data
    
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect

@csrf_protect
def reflectance(request):
    # JSON文字列を辞書に変換: json.loads()
    params_json = json.loads(request.body)

    if params_json["operation"] == 'get':
        json_data = base_json_getRef(params_json)
    elif params_json["operation"] == 'scaling':
        json_data = scaling_Reflectance(params_json)
    elif params_json["operation"] == 'smoothing':
        json_data = smoothing_Reflectance(params_json)

    return HttpResponse(json_data)



class SpectrumScaling:
    def normalization(self, ref_1d_arr):
        if ref_1d_arr.size == 0 or np.all(np.isnan(ref_1d_arr)):
            return ref_1d_arr
        return (ref_1d_arr - np.nanmin(ref_1d_arr)) / (np.nanmax(ref_1d_arr) - np.nanmin(ref_1d_arr))

    def standardization(self, ref_1d_arr):
        if ref_1d_arr.size == 0:
            return ref_1d_arr
        return (ref_1d_arr - np.nanmean(ref_1d_arr)) / np.nanstd(ref_1d_arr)
    
    # TODO
    def relative_ref(self, target_ref_1d_arr, base_ref_1d_arr):
        if target_ref_1d_arr.size == 0 or target_ref_1d_arr.size == 0:
            return target_ref_1d_arr
        return target_ref_1d_arr / base_ref_1d_arr
    
class SpectrumSmoothing:
    def moving_avg(self, ref, window_size):
        b = np.ones(window_size) / window_size
        ref_mean = np.convolve(ref, b, mode="same")
        n_conv = window_size // 2

        # 補正部分、始めと終わり部分をwindow_sizeの半分で移動平均を取る
        ref_mean[0] *= window_size / n_conv
        for i in range(1, n_conv):
            ref_mean[i] *= window_size / (i + n_conv)
            ref_mean[-i] *= window_size / (i + n_conv - (window_size % 2)) # size % 2は奇数偶数での違いに対応するため

        return ref_mean
    
    def stacking(self, data_arr):
        new_data_arr = np.empty(len(data_arr))

        for i, row in enumerate(data_arr):
            is_all_nan = np.all(np.isnan(row))
            if not is_all_nan:
                new_data_arr[i] = np.nanmean(row)
            else:
                new_data_arr[i] = np.nan

        return new_data_arr
