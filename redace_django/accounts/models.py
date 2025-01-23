# accounts/models.py
from django.db import models
from django.contrib.auth.models import User

# makemigrations accounts → 0001_initial.py
class Project(models.Model):
    name = models.CharField(max_length=20)
    password = models.CharField(max_length=255)
    admin = models.ManyToManyField(User, related_name='project_admin')
    member = models.ManyToManyField(User, related_name='project_member')

    def __str__(self):
        return self.name
