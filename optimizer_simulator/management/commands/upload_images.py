from django.core.management.base import BaseCommand
from django.conf import settings
import os
import cloudinary
import cloudinary.uploader

class Command(BaseCommand):
    help = 'Upload player images to Cloudinary'

    def handle(self, *args, **options):
        print("Cloudinary config:", settings.CLOUDINARY_STORAGE)
        
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
            api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
            api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
        )
        
        image_dir = os.path.join(settings.BASE_DIR, 'optimizer_simulator', 'static', 'player_images')
        for filename in os.listdir(image_dir):
            if filename.endswith(('.jpg', '.png', '.jpeg')):
                file_path = os.path.join(image_dir, filename)
                public_id = os.path.splitext(filename)[0]
                try:
                    result = cloudinary.uploader.upload(file_path, 
                                                      public_id=f"player_images/{public_id}")
                    self.stdout.write(self.style.SUCCESS(
                        f'Successfully uploaded {filename}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'Failed to upload {filename}: {str(e)}'))