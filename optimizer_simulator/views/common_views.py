from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import render
import pandas as pd
import os
import logging
import glob
import json

logger = logging.getLogger(__name__)

def clean_numeric_value(value):
    """Convert NaN or invalid numeric values to 0"""
    if pd.isna(value) or value == 'NaN' or value == float('nan'):
        return 0
    return value

def upload_file(request):
    """Handle file uploads for player data and projections"""
    upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
    required_files = ['player_ids.csv', 'projections.csv']
    files_exist = all(os.path.exists(os.path.join(upload_dir, f)) for f in required_files)

    logger.info(f"Upload directory: {upload_dir}")

    if request.method == 'POST':
        try:
            logger.info("Starting file upload process")
            
            # Create output directories with appropriate permissions
            optimizer_output_dir = os.path.join(settings.MEDIA_ROOT, 'optimizer_output')
            for directory in [upload_dir, optimizer_output_dir]:
                os.makedirs(directory, exist_ok=True)
                if settings.ON_RAILWAY:
                    os.chmod(directory, 0o777)
                else:
                    os.chmod(directory, 0o755)
                logger.info(f"Created/verified directory: {directory}")

            player_ids_file = request.FILES.get('player_ids_file')
            projections_file = request.FILES.get('projections_file')
            
            if not all([player_ids_file, projections_file]):
                logger.error("Missing required files")
                return JsonResponse({
                    'success': False, 
                    'error': 'All files are required'
                }, status=400)
            
            logger.info(f"Player IDs file: {player_ids_file.name} ({player_ids_file.size} bytes)")
            logger.info(f"Projections file: {projections_file.name} ({projections_file.size} bytes)")
            
            # Create directories with appropriate permissions
            optimizer_output_dir = os.path.join(settings.MEDIA_ROOT, 'optimizer_output')
            for directory in [upload_dir, optimizer_output_dir]:
                os.makedirs(directory, exist_ok=True)
                if settings.ON_RAILWAY:
                    os.chmod(directory, 0o777)
                else:
                    os.chmod(directory, 0o755)

            # Save uploaded files
            files = {
                'player_ids.csv': player_ids_file,
                'projections.csv': projections_file
            }
            
            for filename, file_obj in files.items():
                file_path = os.path.join(upload_dir, filename)
                with open(file_path, 'wb+') as destination:
                    for chunk in file_obj.chunks():
                        destination.write(chunk)
                if settings.ON_RAILWAY:
                    os.chmod(file_path, 0o666)
                else:
                    os.chmod(file_path, 0o644)

            # Process uploaded files
            player_ids_path = os.path.join(upload_dir, 'player_ids.csv')
            projections_path = os.path.join(upload_dir, 'projections.csv')
            
            player_df = pd.read_csv(player_ids_path)
            proj_df = pd.read_csv(projections_path)
            proj_df.columns = proj_df.columns.str.lower()

            # Combine player data with projections
            players = []
            for _, row in player_df.iterrows():
                base_position = row['Position'].split('/')[0] if pd.notna(row['Position']) else ''
                
                if 'DST' in str(row['Position']):
                    team = row['TeamAbbrev']
                    position = 'DST'
                else:
                    team = row['TeamAbbrev']
                    position = base_position

                proj_row = proj_df[proj_df['name'].str.lower() == row['Name'].lower()].iloc[0] if not proj_df[proj_df['name'].str.lower() == row['Name'].lower()].empty else None

                player = {
                    'Name': row['Name'],
                    'ID': row['ID'],
                    'Position': position,
                    'Team': team,
                    'Salary': int(str(row['Salary']).replace(',', '')),
                    'GameInfo': row['Game Info'],
                }

                if proj_row is not None:
                    player.update({
                        'Fpts': float(clean_numeric_value(proj_row.get('fpts', 0))),
                        'StdDev': float(clean_numeric_value(proj_row.get('stddev', 0))),
                        'Ceiling': float(clean_numeric_value(proj_row.get('ceiling', 0))),
                        'Ownership': float(str(clean_numeric_value(proj_row.get('own%', '0'))).replace('%', '')),
                    })
                else:
                    player.update({
                        'Fpts': 0,
                        'StdDev': 0,
                        'Ceiling': 0,
                        'Ownership': 0,
                    })

                players.append(player)

            # Save and verify combined player data
            players_json_path = os.path.join(upload_dir, 'players.json')
            logger.info(f"Saving players.json to: {players_json_path}")
            
            with open(players_json_path, 'w', encoding='utf-8') as f:
                json.dump(players, f, indent=4, ensure_ascii=False)
            
            if os.path.exists(players_json_path):
                logger.info(f"Successfully created players.json at {players_json_path}")
                try:
                    with open(players_json_path, 'r', encoding='utf-8') as f:
                        test_read = json.load(f)
                    logger.info(f"Successfully verified players.json with {len(test_read)} players")
                    if test_read:
                        logger.info(f"Sample player data: {test_read[0]}")
                except Exception as e:
                    logger.error(f"Created players.json but cannot read it: {str(e)}")
            else:
                logger.error(f"Failed to create players.json at {players_json_path}")

            return JsonResponse({
                'success': True,
                'message': 'Files uploaded successfully',
                'redirect_url': '/optimizer_simulator/optimizer/'
            })
            
        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}", exc_info=True)
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

    return render(request, 'optimizer.html', {'show_upload_modal': True})