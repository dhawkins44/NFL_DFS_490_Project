from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import render
import pandas as pd
import os
import logging
import glob
import json

logger = logging.getLogger(__name__)

def upload_file(request):
    if request.method == 'POST':
        try:
            # config_file = request.FILES.get('config_file')
            player_ids_file = request.FILES.get('player_ids_file')
            projections_file = request.FILES.get('projections_file')
            
            # Validate files are present
            # if not all([config_file, player_ids_file, projections_file]):
            if not all([player_ids_file, projections_file]):
                return JsonResponse({
                    'success': False, 
                    'error': 'All files are required'
                }, status=400)
            
            # Delete existing files
            media_root = settings.MEDIA_ROOT
            upload_dir = os.path.join(media_root, 'uploads')
            optimizer_output_dir = os.path.join(media_root, 'optimizer_output')
            
            # Ensure directories exist
            os.makedirs(upload_dir, exist_ok=True)
            os.makedirs(optimizer_output_dir, exist_ok=True)
            
            # Save new files
            files = {
                # 'config.json': config_file,
                'player_ids.csv': player_ids_file,
                'projections.csv': projections_file
            }
            
            for filename, file_obj in files.items():
                file_path = os.path.join(upload_dir, filename)
                with open(file_path, 'wb+') as destination:
                    for chunk in file_obj.chunks():
                        destination.write(chunk)

            player_ids_path = os.path.join(upload_dir, 'player_ids.csv')
            player_df = pd.read_csv(player_ids_path)

            # Extract player names and IDs
            players = player_df[['Name', 'ID']].to_dict('records')

            # Save player data to a JSON file or cache
            players_json_path = os.path.join(upload_dir, 'players.json')
            with open(players_json_path, 'w') as f:
                json.dump(players, f)
            
            # Return success JSON response with redirect URL
            return JsonResponse({
                'success': True,
                'message': 'Files uploaded successfully',
                'redirect_url': '/optimizer_simulator/lineups/'
            })
            
        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

    # For GET requests, show the lineups table with upload modal
    return render(request, 'lineups_table.html', {'show_upload_modal': True})