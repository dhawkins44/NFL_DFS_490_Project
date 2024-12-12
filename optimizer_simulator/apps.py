from django.apps import AppConfig
import os
from django.conf import settings


class OptimizerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'optimizer_simulator'

    def ready(self):
        # Create necessary directories on app startup
        directories = [
            os.path.join(settings.MEDIA_ROOT, 'uploads'),
            os.path.join(settings.MEDIA_ROOT, 'optimizer_output'),
            os.path.join(settings.MEDIA_ROOT, 'simulator_output'),
        ]
        for directory in directories:
            try:
                os.makedirs(directory, exist_ok=True)
                # More permissive permissions for Railway
                if settings.ON_RAILWAY:
                    os.chmod(directory, 0o777)
                else:
                    os.chmod(directory, 0o755)
            except Exception as e:
                print(f"Error creating directory {directory}: {str(e)}")
