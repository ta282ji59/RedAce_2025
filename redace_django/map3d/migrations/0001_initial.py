# Generated by Django 3.1 on 2024-11-11 07:18

from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Spectrum',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('instrument', models.CharField(max_length=10)),
                ('obs_id', models.CharField(blank=True, max_length=50)),
                ('path', models.TextField()),
                ('image_path', models.TextField()),
                ('x_pixel', models.IntegerField()),
                ('y_pixel', models.IntegerField()),
                ('x_image_size', models.IntegerField()),
                ('y_image_size', models.IntegerField()),
                ('wavelength', models.TextField()),
                ('reflectance', models.TextField()),
                ('mineral_id', models.IntegerField(blank=True, null=True)),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('point', django.contrib.gis.db.models.fields.PointField(blank=True, null=True, srid=4326)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_date', models.DateTimeField()),
                ('data_id', models.CharField(blank=True, max_length=100)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]