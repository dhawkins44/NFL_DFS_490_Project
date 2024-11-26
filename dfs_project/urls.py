# project_root/urls.py

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView

import os

urlpatterns = [
    path('admin/', admin.site.urls),
    path('optimizer_simulator/', include('optimizer_simulator.urls')),
    path('', RedirectView.as_view(url='/optimizer_simulator/', permanent=True)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, 'optimizer_simulator', 'static'))
