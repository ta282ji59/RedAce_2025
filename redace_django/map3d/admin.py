from django.contrib import admin
from .models import Spectrum

# @admin.register(Spectrum)
class SpectrumAdmin(admin.ModelAdmin):
    list_display = ('instrument', 'obs_id', 'user', 'created_date')