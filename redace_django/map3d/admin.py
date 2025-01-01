from django.contrib import admin
from .models import Spectrums

class SpectrumsAdmin(admin.ModelAdmin):
    list_display = ('instrument', 'obs_id', 'user', 'created_date')

admin.site.register(Spectrums, SpectrumsAdmin)
