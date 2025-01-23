from django.contrib.gis.db import models
from django.conf import settings

class Spectrums(models.Model):
    instrument = models.CharField(max_length=10)
    obs_id = models.CharField(max_length=50, blank=True)
    path = models.TextField()
    image_path = models.TextField()
    x_pixel = models.TextField()
    y_pixel = models.TextField()
    x_image_size = models.IntegerField()
    y_image_size = models.IntegerField()
    wavelength = models.JSONField()
    reflectance = models.JSONField()
    mineral_id = models.IntegerField(null=True, blank=True)
    latitude = models.JSONField()
    longitude = models.JSONField() 
    point = models.PointField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_date = models.DateTimeField()
    data_id = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.instrument}___{self.obs_id}"