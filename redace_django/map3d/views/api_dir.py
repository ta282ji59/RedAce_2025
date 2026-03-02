import cgitb
cgitb.enable()

import pvl
import json
import multiprocessing
import numpy as np
import collections as cl
from osgeo import gdal, osr


def pvl_to_jsonable(v):
    """
    pvl の値を JSON に載せられる型へ変換する
    - Quantity(value=?, units=?) -> float（value） or dict にする
    - list/tuple -> 再帰変換
    - その他 -> そのまま or str
    """
    if v is None:
        return None

    # pvl Quantity 対応（value / units を持つ）
    if hasattr(v, "value") and hasattr(v, "units"):
        # まずは value（数値）だけ返すのが扱いやすい
        try:
            return float(v.value)
        except Exception:
            return str(v)

    if isinstance(v, (list, tuple)):
        return [pvl_to_jsonable(x) for x in v]

    # numpy 型とかも落ちやすいので保険（int/float化できるならする）
    try:
        if isinstance(v, (int, float, str, bool)):
            return v
        # 例: numpy.float64 等
        if hasattr(v, "item"):
            return v.item()
    except Exception:
        pass

    return str(v)


##############     THEMIS    ############################
def GetExtent(gt,cols,rows):
    ext = []
    x_arr = [0, cols]
    y_arr = [0, rows]

    for px in x_arr:
        for py in y_arr:
            x = gt[0] + (px * gt[1]) + (py * gt[2])
            y = gt[3] + (px * gt[4]) + (py * gt[5])
            ext.append([x, y])
			#print x,y
        y_arr.reverse()
    return ext

def ReprojectCoords(coords, src_srs, tgt_srs):
    trans_coords = []
    transform = osr.CoordinateTransformation(src_srs, tgt_srs)
    for x, y in coords:
        x, y, z = transform.TransformPoint(x, y)
        trans_coords.append([x, y])
        return trans_coords


###################################################################################
# from paramiko import SSHClient, AutoAddPolicy
def base_json(params):
    params_json = params["properties"]
    geometry = params["geometry"]
    name = str(params_json.get("name", "")).lower()
    field = cl.OrderedDict()
    field["path"] = params_json["path"]["data"]
    field["obs_ID"] = params_json["id"]
    cube_data = gdal.Open(params_json["path"]["data"]["main"]["cub"], gdal.GA_ReadOnly) #######
    data = cl.OrderedDict()
    lbl_data = pvl.load(params_json["path"]["data"]["main"]["lbl"])     ###original load###

    # host="192.168.1.14"
    # user="fukuchi"
    # pswd="fi5p*cTZVzlv"
    # client = SSHClient()
    # client.set_missing_host_key_policy(AutoAddPolicy())
    # client.connect(host, username=user, password=pswd)
    # lbl=params_json["path"]["data"]["main"]["lbl"]
    #
    # stdin, stdout, stderr = client.exec_command("cd /home/fukuchi/src_python && python get_data.py %s" % lbl)
    # lbl_data_byte=stdout.read()
    # lbl_data=lbl_data_byte.decode().replace("\n", "\n")
    # print (lbl_data)
    # lbl_data=json.loads(lbl_data)

    ######## THEMIS ########
    if name == 'themis':
        field["obs_name"] = str(lbl_data["UNCOMPRESSED_FILE"]["INSTRUMENT_ID"])

        data["MISSION_NAME"] = str(lbl_data["UNCOMPRESSED_FILE"]["MISSION_NAME"])
        data["INSTRUMENT_NAME"] = str(lbl_data["UNCOMPRESSED_FILE"]["INSTRUMENT_NAME"])
        data["DETECTOR_ID"] = str(lbl_data["UNCOMPRESSED_FILE"]["DETECTOR_ID"])
        data["SPACECRAFT_CLOCK_START_COUNT"] = str(lbl_data["UNCOMPRESSED_FILE"]["SPACECRAFT_CLOCK_START_COUNT"])
        data["SPACECRAFT_CLOCK_STOP_COUNT"] = str(lbl_data["UNCOMPRESSED_FILE"]["SPACECRAFT_CLOCK_STOP_COUNT"])
        data["SPACECRAFT_CLOCK_STOP_COUNT"] = str(lbl_data["UNCOMPRESSED_FILE"]["SPACECRAFT_CLOCK_STOP_COUNT"])
        data["START_TIME_ET"] = str(lbl_data["UNCOMPRESSED_FILE"]["START_TIME_ET"])
        data["STOP_TIME_ET"] = str(lbl_data["UNCOMPRESSED_FILE"]["STOP_TIME_ET"])
        data["ORBIT_NUMBER"] = str(lbl_data["UNCOMPRESSED_FILE"]["ORBIT_NUMBER"])
        data["MAP_RESOLUTION"] = str(lbl_data["IMAGE_MAP_PROJECTION"]["MAP_RESOLUTION"])

        center = lbl_data["UNCOMPRESSED_FILE"]['QUBE']['BAND_BIN']['BAND_BIN_CENTER']
        data["band_bin_center"] = ",".join(map(str, center))
        field["ancillary"] = data
        data2 = cl.OrderedDict()
        data2["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]
        field["Mapping"] = data2
        field["Image_path"] = params_json["path"]["image"]["thumbnail"] ###umemo JSON型で書かれたDBを参照してる
        field["Ratio_path_json"] = params_json["path"]["image"].get('ratio')
        field["geometry"] = geometry


    ######## CRISM #########
    elif name == 'crism':
        field["obs_name"] = str(lbl_data["INSTRUMENT_ID"])
        data["PRODUCT_TYPE"] = str(lbl_data["PRODUCT_TYPE"])
        data["INSTRUMENT_HOST_NAME"] = str(lbl_data["INSTRUMENT_HOST_NAME"])
        data["SPACECRAFT_ID"] = str(lbl_data["SPACECRAFT_ID"])
        data["MRO:FRAME_RATE"] = pvl_to_jsonable(lbl_data.get("MRO:FRAME_RATE"))
        data["MRO:EXPOSURE_PARAMETER"] = pvl_to_jsonable(lbl_data.get("MRO:EXPOSURE_PARAMETER"))
        data["SOLAR_DISTANCE"] = pvl_to_jsonable(lbl_data.get("SOLAR_DISTANCE"))

        # --- WAVELENGTH_FILTER を安全に int 化 ---
        wf = lbl_data.get("MRO:WAVELENGTH_FILTER", 0)
        try:
            wf = int(str(wf).strip())
        except Exception:
            wf = 0
        
        data["MRO:WAVELENGTH_FILTER"] = wf
        filter_num = wf + 1  # 元の実装（+1）を維持
        
        # --- wavelength / filter を読む（まずは落ちないように） ---
        cdr = np.genfromtxt(
            params_json["path"]["data"]["derived"]["wavelength"],
            delimiter=",",
            dtype=float,
            usecols=(1)
        )
        
        # filter は列指定がズレると落ちるので try/except で保険
        try:
            filter_rf = np.genfromtxt(
                params_json["path"]["data"]["derived"]["filter"],
                delimiter=",",
                dtype=np.uint16,
                usecols=(filter_num)
            )
        except Exception:
            # ダメなら 0列目にフォールバック（または空で返す）
            filter_rf = np.genfromtxt(
                params_json["path"]["data"]["derived"]["filter"],
                delimiter=",",
                dtype=np.uint16,
                usecols=(0)
            )
        
        # --- band_bin_center を作る（安全に） ---
        used_wav = []
        num_band = 1
        while num_band < filter_rf.shape[0]:
            if filter_rf[num_band] == 1:
                used_wav.append(cdr[num_band] / 1000)
            num_band += 1
        
        data["band_bin_center"] = used_wav
        data2 = cl.OrderedDict()
        data2["Image_size"] = [cube_data.RasterXSize, cube_data.RasterYSize]
        field["Mapping"] = data2
        field["Image_path"] = params_json["path"]["image"]["thumbnail"]
        field["Ratio_path_json"] = params_json["path"]["image"].get('ratio')
        field["geometry"] = geometry

        cube_data2 = gdal.Open(params_json["path"]["data"]["derived"]["cub"], gdal.GA_ReadOnly)
        cube_coords = cl.OrderedDict()
        cube_coords["lat"] = cube_data2.GetRasterBand(4).ReadAsArray().tolist()
        cube_coords["lon"] = cube_data2.GetRasterBand(5).ReadAsArray().tolist()
        field["cube_coords"] = cube_coords

    else:
        return "NoData"

    if "Caminfo" in lbl_data:
        data["StartTime"] = str(lbl_data["Caminfo"]["Geometry"].get("StartTime", ""))
        data["EndTime"] = str(lbl_data["Caminfo"]["Geometry"].get("EndTime", ""))
        data["CenterLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("CenterLatitude", ""))
        data["CenterLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("CenterLongitude", ""))
        data["CenterRadius"] = str(lbl_data["Caminfo"]["Geometry"].get("CenterRadius", ""))
        data["RightAscension"] = str(lbl_data["Caminfo"]["Geometry"].get("RightAscension", ""))
        data["Declination"] = str(lbl_data["Caminfo"]["Geometry"].get("Declination", ""))
        data["UpperLeftLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("UpperLeftLongitude", ""))
        data["UpperLeftLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("UpperLeftLatitude", ""))
        data["LowerLeftLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("LowerLeftLongitude", ""))
        data["LowerLeftLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("LowerLeftLatitude", ""))
        data["LowerRightLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("LowerRightLongitude", ""))
        data["LowerRightLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("LowerRightLatitude", ""))
        data["UpperRightLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("UpperRightLongitude", ""))
        data["UpperRightLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("UpperRightLatitude", ""))
    
        data["PhaseAngle"] = str(lbl_data["Caminfo"]["Geometry"].get("PhaseAngle", ""))
        data["EmissionAngle"] = str(lbl_data["Caminfo"]["Geometry"].get("EmissionAngle", ""))
        data["IncidenceAngle"] = str(lbl_data["Caminfo"]["Geometry"].get("IncidenceAngle", ""))
        data["NorthAzimuth"] = str(lbl_data["Caminfo"]["Geometry"].get("NorthAzimuth", ""))
        data["OffNadir"] = str(lbl_data["Caminfo"]["Geometry"].get("OffNadir", ""))
        data["SolarLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("SolarLongitude", ""))
        data["LocalTime"] = str(lbl_data["Caminfo"]["Geometry"].get("LocalTime", ""))
        data["TargetCenterDistance"] = str(lbl_data["Caminfo"]["Geometry"].get("TargetCenterDistance", ""))
        data["SlantDistance"] = str(lbl_data["Caminfo"]["Geometry"].get("SlantDistance", ""))
        data["SampleResolution"] = str(lbl_data["Caminfo"]["Geometry"].get("SampleResolution", ""))
        data["LineResolution"] = str(lbl_data["Caminfo"]["Geometry"].get("LineResolution", ""))
        data["PixelResolution"] = str(lbl_data["Caminfo"]["Geometry"].get("PixelResolution", ""))
        data["MeanGroundResolution"] = str(lbl_data["Caminfo"]["Geometry"].get("MeanGroundResolution", ""))
        data["SubSolarAzimuth"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSolarAzimuth", ""))
        data["SubSolarGroundAzimuth"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSolarGroundAzimuth", ""))
        data["SubSolarLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSolarLatitude", ""))
        data["SubSolarLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSolarLongitude", ""))
        data["SubSpacecraftAzimuth"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSpacecraftAzimuth", ""))
        data["SubSpacecraftGroundAzimuth"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSpacecraftGroundAzimuth", ""))
        data["SubSpacecraftLatitude"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSpacecraftLatitude", ""))
        data["SubSpacecraftLongitude"] = str(lbl_data["Caminfo"]["Geometry"].get("SubSpacecraftLongitude", ""))
        data["ParallaxX"] = str(lbl_data["Caminfo"]["Geometry"].get("ParallaxX", ""))
        data["ParallaxY"] = str(lbl_data["Caminfo"]["Geometry"].get("ParallaxY", ""))
        data["ShadowX"] = str(lbl_data["Caminfo"]["Geometry"].get("ShadowX", ""))
        data["ShadowY"] = str(lbl_data["Caminfo"]["Geometry"].get("ShadowY", ""))
    else:
        # "Caminfo" が存在しない場合、デフォルト値を設定
        data["StartTime"] = "" 
        data["EndTime"] = ""
        data["CenterLatitude"] = ""
        data["CenterLongitude"] = ""
        data["CenterRadius"] = ""
        data["RightAscension"] = ""
        data["Declination"] = ""
        data["UpperLeftLongitude"] = ""
        data["UpperLeftLatitude"] = ""
        data["LowerLeftLongitude"] = ""
        data["LowerLeftLatitude"] = ""
        data["LowerRightLongitude"] = ""
        data["LowerRightLatitude"] = ""
        data["UpperRightLongitude"] = ""
        data["UpperRightLatitude"] = ""

        data["PhaseAngle"] = ""
        data["EmissionAngle"] = ""
        data["IncidenceAngle"] = ""
        data["NorthAzimuth"] = ""
        data["OffNadir"] = ""
        data["SolarLongitude"] = ""
        data["LocalTime"] = ""
        data["TargetCenterDistance"] = ""
        data["SlantDistance"] = ""
        data["SampleResolution"] = ""
        data["LineResolution"] = ""
        data["PixelResolution"] = ""
        data["MeanGroundResolution"] = ""
        data["SubSolarAzimuth"] = ""
        data["SubSolarGroundAzimuth"] = ""
        data["SubSolarLatitude"] = ""
        data["SubSolarLongitude"] = ""
        data["SubSpacecraftAzimuth"] = ""
        data["SubSpacecraftGroundAzimuth"] = ""
        data["SubSpacecraftLatitude"] = ""
        data["SubSpacecraftLongitude"] = ""
        data["ParallaxX"] = ""
        data["ParallaxY"] = ""
        data["ShadowX"] = ""
        data["ShadowY"] = ""


    field["ancillary"] = data
    json_data = json.dumps(field)
    return json_data



###########################################################################
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect

@csrf_protect
def dir(request):
    params_json = json.loads(request.body)
    json_data = base_json(params_json)
    return HttpResponse(json_data)
