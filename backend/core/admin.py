from django.contrib import admin
from .models import Application, Job, Profile

admin.site.register(Profile)
admin.site.register(Job)
admin.site.register(Application)
