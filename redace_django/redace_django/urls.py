from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json

# ログインデータをJupyterに転送するための関数
@login_required()
def userdata(request):
    user = request.user
    return HttpResponse(
        json.dumps({'username': user.username}),
        content_type='application/json'
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    path('userdata/', userdata, name='userdata'), # c.GenericOAuthenticator.userdata_url = 'http://192.168.1.53:7001/userdata/'
    path('accounts/', include('accounts.urls')),
    path('map3d/',include('map3d.urls')),
    # path('spectra/', include('spectra.urls')),
    # path('api/',include('spectra.urls_api')),
]
