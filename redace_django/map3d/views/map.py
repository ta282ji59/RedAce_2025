from django.shortcuts import render, get_object_or_404
# from django.http import HttpResponse
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
# from spectra.models import Spectrum
from django.core.serializers import serialize
from accounts.models import Project


# from spectra.views import get_spectra

@login_required
def default(request):
    return render(request, 'map3d/index.html') 
    # if request.user.is_authenticated:
    #     user = request.user
    #     geo_json = serialize('geojson', Spectrum.objects.filter(user=user),
    #         geometry_field='point',
    #         fields=('description',) 
    #     )

    #     rec_spectra = get_spectra(request)

    #     rec = {
    #         'name': "Note",
    #         'title': "Note",
    #         'geojson': geo_json,
    #     }
    #     rec_for_jump = []
    #     for j,spectrum in enumerate(rec_spectra["spectra"]):
    #         record = {
    #             'N': 3,
    #             'id': spectrum.id,
    #             'lat': float(spectrum.latitude),
    #             'lon': float(spectrum.longitude),
    #             'zoom': 15000000,
    #         }
    #         rec_for_jump.append(record)
    #     user = request.user

    #     user_id = request.user.id
    #     projects = Project.objects.filter(member__in=[user_id])

    #     settings = {
    #         'record_json': rec,
    #         'record_spectra': rec_spectra,
    #         'record_jump': rec_for_jump, 
    #         'projects': projects, 
    #         'user': user,
    #     }

    #     return render(request, "map3d/index.html", settings)
    # else:
    #     return render(request, "map3d/login.html")




##############################
### 入力した緯度経度地点に飛ぶ ###
##############################
# from spectra.models import Spectrum
# # from django.contrib.gis.geos import GEOSGeometry, Point
# def jump(request):
#     # # id = request.body.decode('utf-8')
#     # id = request.session.get("test")
#     id = request.POST["id"]
#     spectrum = get_object_or_404(Spectrum, pk = int(id))
#     rec = {
#         'id': id,
#         'N': 4,
#         'lat': spectrum.latitude,
#         'lon': spectrum.longitude,
#         'zoom': 15000000,
#         'point': spectrum.point,
#         # 'spectrum': spectrum,
#     }
#     settings = {
#         'record_json': rec,
#     }
#     # return render(request, "map3d/test.html", settings)
#     return render(request, "map3d/index.html", settings)



# from django.core.serializers import serialize
# def test_gis(request):
#     geo_json = serialize('geojson', Spectrum.objects.all(),
#             geometry_field='point',
#             fields=('instrument','description',))
#     settings = {
#         'geo_json': geo_json,
#     }
#     # return render(request, "map3d/test2.html", settings)
#     return render(request, "map3d/index.html", settings)
