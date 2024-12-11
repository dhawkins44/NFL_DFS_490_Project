from django.http import JsonResponse, HttpResponse, Http404
from django.conf import settings
from django.shortcuts import render
from django.core.serializers.json import DjangoJSONEncoder
from optimizer_simulator.utils.optimizer import NFL_Optimizer
from optimizer_simulator.utils.optimizer_stats_processing import process_lineup_data
from optimizer_simulator.utils.numpy_encoder import NumpyEncoder
import numpy as np
import pandas as pd
import os
import logging
import glob
import json

logger = logging.getLogger(__name__)

def run_optimizer_view(request):
    if request.method == 'POST':
        try:
            # Get configuration from request
            config = json.loads(request.body.decode('utf-8'))
            num_lineups = config.get('num_lineups', 10)
            num_uniques = config.get('num_uniques', 1)
            
            # Define paths
            config_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'config.json')
            player_ids_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'player_ids.csv')
            projections_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'projections.csv')

            # Delete existing optimizer output files starting with 'dk_optimal_lineups*'
            optimizer_output_dir = os.path.join(settings.MEDIA_ROOT, 'optimizer_output')
            existing_files = glob.glob(os.path.join(optimizer_output_dir, 'dk_optimal_lineups*'))
            for f in existing_files:
                os.remove(f)

            # Delete existing config.json file
            if os.path.exists(config_path):
                os.remove(config_path)

            # Build the configuration dictionary to write to config.json
            optimizer_config = {
                "projection_path": projections_path,
                "player_path": player_ids_path,
                "contest_structure_path": "contest_structure.csv",
                "use_double_te": config.get('use_double_te', True),
                "global_team_limit": int(config.get('global_team_limit', 4)),
                "projection_minimum": float(config.get('projection_minimum', 5)),
                "randomness": float(config.get('randomness', 25)),
                "min_lineup_salary": int(config.get('min_lineup_salary', 49200)),
                "max_pct_off_optimal": float(config.get('max_pct_off_optimal', 0.25)),
                "num_players_vs_def": int(config.get('num_players_vs_def', 0)),
                "pct_field_using_stacks": float(config.get('pct_field_using_stacks', 0.65)),
                "pct_field_double_stacks": float(config.get('pct_field_double_stacks', 0.4)),
                "default_qb_var": float(config.get('default_qb_var', 0.4)),
                "default_skillpos_var": float(config.get('default_skillpos_var', 0.5)),
                "default_def_var": float(config.get('default_def_var', 0.5)),
                "allow_qb_vs_dst": config.get('allow_qb_vs_dst', False),
                "at_most": config.get('at_most', {}),
                "at_least": config.get('at_least', {}),
                "stack_rules": config.get('stack_rules', {}),
                "matchup_limits": config.get('matchup_limits', {}),
                "matchup_at_least": config.get('matchup_at_least', {}),
                "team_limits": config.get('team_limits', {}),
            }

            # Write the config.json file
            with open(config_path, 'w') as f:
                json.dump(optimizer_config, f, indent=4)
            
            # Run optimizer
            optimizer = NFL_Optimizer(
                site='dk',
                num_lineups=num_lineups,
                num_uniques=num_uniques,
                config_path=config_path,
            )
            optimizer.optimize()
            output_file, lineup_data = optimizer.output()
            download_url = f"/optimizer_simulator/download/{output_file}/"
            
            return JsonResponse({
                'success': True,
                'lineups': lineup_data,
                'download_url': download_url
            })
            
        except Exception as e:
            logger.error(f"Error running optimizer: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

def download_output_view(request, output_file):
    # Security: prevent directory traversal
    if '..' in output_file or output_file.startswith('/'):
        logger.warning(f"Attempted directory traversal attack with file: {output_file}")
        raise Http404
    
    file_path = os.path.join(settings.MEDIA_ROOT, output_file)
    if os.path.exists(file_path):
        with open(file_path, 'rb') as fh:
            response = HttpResponse(fh.read(), content_type="text/csv")
            response['Content-Disposition'] = f'attachment; filename={os.path.basename(file_path)}'
            return response
    logger.error(f"File not found: {output_file}")
    raise Http404

def optimizer_view(request):
    try:
        # Check if required files exist
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        required_files = ['player_ids.csv', 'projections.csv']
        files_exist = all(os.path.exists(os.path.join(upload_dir, f)) for f in required_files)

        # Get force_upload parameter from query string
        force_upload = request.GET.get('force_upload', False)
        
        context = {
            'show_upload_modal': not files_exist,  # Only show modal if files don't exist
            'show_lineups': False
        }
        
        return render(request, 'optimizer.html', context)
        
    except Exception as e:
        logger.error(f"Error in optimizer view: {str(e)}")
        return render(request, 'error.html', {'message': str(e)})
    
def get_players(request):
    try:
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        players_json_path = os.path.join(upload_dir, 'players.json')
        with open(players_json_path, 'r') as f:
            players = json.load(f)
        return JsonResponse({'players': players})
    except Exception as e:
        logger.error(f"Error fetching players: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

def optimizer_stats_view(request):
    try:
        optimizer_output_dir = os.path.join(settings.MEDIA_ROOT, 'optimizer_output')
        files = [f for f in os.listdir(optimizer_output_dir) 
                if f.startswith('dk_optimal_lineups') and f.endswith('.csv')]
        
        if not files:
            return render(request, 'error.html', {
                'message': 'No optimizer output files found. Please run the optimizer first.'
            })
            
        latest_file = max(files, 
                         key=lambda x: os.path.getctime(os.path.join(optimizer_output_dir, x)))
        latest_file_path = os.path.join(optimizer_output_dir, latest_file)
        
        # Process the data
        stats = process_lineup_data(latest_file_path)
        
        # Convert to JSON using custom encoder
        stats_json = json.dumps(stats, cls=NumpyEncoder, default=str)
        
        return render(request, 'optimizer_stats.html', {
            'stats_json': stats_json
        })
        
    except Exception as e:
        logger.error(f"Error in optimizer_stats_view: {str(e)}")
        return render(request, 'error.html', {'message': str(e)})


def get_optimizer_stats_data(request):
    try:
        optimizer_output_dir = os.path.join(settings.MEDIA_ROOT, 'optimizer_output')
        files = [f for f in os.listdir(optimizer_output_dir) 
                if f.startswith('dk_optimal_lineups') and f.endswith('.csv')]
        
        if not files:
            return JsonResponse({
                'error': 'No optimizer output files found'
            }, status=404)
            
        latest_file = max(files, 
                         key=lambda x: os.path.getctime(os.path.join(optimizer_output_dir, x)))
        latest_file_path = os.path.join(optimizer_output_dir, latest_file)
        
        # Process the data
        stats = process_lineup_data(latest_file_path)
        
        # Convert any sets to lists and handle NumPy types
        def convert_types(obj):
            if isinstance(obj, set):
                return list(obj)
            elif isinstance(obj, dict):
                return {k: convert_types(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_types(i) for i in obj]
            elif isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            return obj
        
        stats = convert_types(stats)
        
        return JsonResponse(stats, encoder=NumpyEncoder)
        
    except Exception as e:
        logger.error(f"Error in get_optimizer_stats_data: {str(e)}")
        return JsonResponse({
            'error': f'Error getting optimizer stats data: {str(e)}'
        }, status=500)