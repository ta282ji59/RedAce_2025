# views/spectrum_save.py
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.gis.geos import Point
from ..models import Spectrums
from django.views.decorators.csrf import csrf_exempt
import json
import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')

@csrf_exempt
def spectrum_data_save(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            spectral_data = data.get("spectral_data", [])
            description = data.get("description")
            user = request.user

            logging.debug('')
            

            for entry in spectral_data:
                path = entry.get("path", {})
                # logging.debug('')
                if isinstance(entry["pixels"][0], list):  # リストのリスト形式の場合
                    x_pixel = [coord[0] for coord in entry["pixels"]]
                    y_pixel = [coord[1] for coord in entry["pixels"]]
                    latitude = [coord[1] for coord in entry["coordinate"]] 
                    longitude = [coord[0] for coord in entry["coordinate"]] 
                else:  # 単一のリスト形式の場合
                    x_pixel = [entry["pixels"][0]]
                    y_pixel = [entry["pixels"][1]]
                    latitude = [entry["coordinate"][1]]
                    longitude = [entry["coordinate"][0]]
                
                
                Spectrums.objects.create(
                    instrument=entry.get("obs_name"),
                    obs_id=entry.get("obs_ID"),
                    path=json.dumps(path),
                    image_path=entry.get("Image_path"),
                    x_pixel=x_pixel,
                    y_pixel=y_pixel,
                    x_image_size=entry["Image_size"][0],
                    y_image_size=entry["Image_size"][1],
                    wavelength=entry.get("band_bin_center", []),
                    reflectance=entry.get("reflectance", []),
                    latitude=latitude,
                    longitude=longitude,
                    # point=point,
                    description=description,
                    user=user,
                    created_date=timezone.now(),
                    data_id=entry.get("obs_ID"),
                )

            return JsonResponse({"status": "success", "message": "Data saved successfully."})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)
