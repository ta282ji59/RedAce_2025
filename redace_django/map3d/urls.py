from django.urls import path
from . import views
# from djgeojson.views import GeoJSONLayerView
# from spectra.models import Spectrum

app_name = 'map3d'
urlpatterns = [
    path('', views.map.default, name='default'),
    path('db/', views.api_db.db, name='db'),
    path('dir/', views.api_dir.dir, name='dir'),
    path('reflectance/', views.api_reflectance.reflectance, name='reflectance'),
    path('spectrum/new', views.spectrum_save.spectrum_data_save, name='spectrum_save'),
    path('ref_table/update/', views.api_reftable.table, name='ref_table'),
    path('ref_table/export/', views.api_reftable.export, name='ref_export'),
    path('ref_table/delete/', views.api_reftable.delete, name='ref_table_delete'),
    # path('jump', views.map.jump, name='jump'),
    # path('gis', views.map.test_gis, name='gis'),
    # path('open', GeoJSONLayerView.as_view(model=Spectrum), name='open')
]
