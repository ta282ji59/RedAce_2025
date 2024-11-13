from django.contrib.gis.db import models
from django.conf import settings
class Spectrum(models.Model):
    instrument = models.CharField(max_length=10)
    obs_id = models.CharField(max_length=50, blank=True)
    path = models.TextField()
    image_path = models.TextField()
    x_pixel = models.IntegerField()
    y_pixel = models.IntegerField()
    x_image_size = models.IntegerField()
    y_image_size = models.IntegerField()
    wavelength = models.TextField()
    reflectance = models.TextField()
    mineral_id = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    point = models.PointField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_date = models.DateTimeField()
    data_id = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.instrument}___{self.obs_id}"