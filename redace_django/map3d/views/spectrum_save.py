# views/spectrum_save.py
from django.http import JsonResponse
from django.utils import timezone
from django.contrib.gis.geos import Point
from ..models import Spectrum
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def spectrum_data_save(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            spectral_data = data.get("spectral_data", [])
            description = data.get("description")
            user = request.user

            for entry in spectral_data:
                path = entry.get("path", {})
                point = Point(entry["coordinate"][0], entry["coordinate"][1]) if "coordinate" in entry else None
                
                Spectrum.objects.create(
                    instrument=entry.get("obs_name"),
                    obs_id=entry.get("obs_ID"),
                    path=json.dumps(path),
                    image_path=entry.get("Image_path"),
                    x_pixel=entry["pixels"][0],
                    y_pixel=entry["pixels"][1],
                    x_image_size=entry["Image_size"][0],
                    y_image_size=entry["Image_size"][1],
                    wavelength=json.dumps(entry.get("band_bin_center", [])),
                    reflectance=json.dumps(entry.get("reflectance", [])),
                    latitude=entry["coordinate"][1],
                    longitude=entry["coordinate"][0],
                    point=point,
                    description=description,
                    user=user,
                    created_date=timezone.now(),
                    data_id=entry.get("obs_ID")
                )

            return JsonResponse({"status": "success", "message": "Data saved successfully."})

        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)

    return JsonResponse({"status": "error", "message": "Invalid request method."}, status=405)
