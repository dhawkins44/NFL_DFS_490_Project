from django.http import JsonResponse, HttpResponse, Http404
from django.shortcuts import render
from django.conf import settings
from optimizer_simulator.utils.simulator import NFL_GPP_Simulator
import json
import os
import logging
import glob
import csv

logger = logging.getLogger(__name__)

def simulator_view(request):
    context = {
        'active_tab': 'simulator',
        'show_upload_modal': False
    }
    logger.info("Rendering simulator view with context: %s", context)
    return render(request, 'simulator.html', context)

def run_simulation(request):
    """Handle simulation requests"""
    if request.method == 'POST':
        try:
            # Get configuration from request
            config = json.loads(request.body.decode('utf-8'))

            # Define paths
            config_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'config.json')
            player_ids_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'player_ids.csv')
            projections_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'projections.csv')
            contest_structure_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'contest_structure.csv')
            
            # Check player_ids.csv
            with open(player_ids_path, 'r') as f:
                player_ids_data = list(csv.DictReader(f))
                positions = set(p['Position'] for p in player_ids_data)

            # Check projections.csv
            with open(projections_path, 'r') as f:
                proj_data = list(csv.DictReader(f))
                non_zero_own = sum(1 for p in proj_data if float(p.get('Own%', 0)) > 0)

            # Clear existing simulator output files
            simulator_output_dir = os.path.join(settings.MEDIA_ROOT, 'simulator_output')
            existing_files = glob.glob(os.path.join(simulator_output_dir, 'dk_gpp_sim*'))
            for f in existing_files:
                os.remove(f)

            # Clean up existing config
            if os.path.exists(config_path):
                os.remove(config_path)
            
            # Build simulator configuration
            simulator_config = {
                "projection_path": projections_path,
                "player_path": player_ids_path,
                "contest_structure_path": contest_structure_path,
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
                "matchup_limits": config.get('matchup_limits', {}),
                "matchup_at_least": config.get('matchup_at_least', {}),
                "team_limits": config.get('team_limits', {}),
                "custom_correlations": config.get('custom_correlations', {}),
            }

            # Write configuration file
            with open(config_path, 'w') as f:
                json.dump(simulator_config, f, indent=4)

            # Initialize simulator
            simulator = NFL_GPP_Simulator(
                site='dk',
                field_size=config.get('field_size', 100),
                num_iterations=config.get('num_simulations', 1000),
                use_contest_data=config.get('use_contest_data', False),
                use_lineup_input=config.get('use_lineup_input', False),
                config_path=config_path,
            )

            # Generate lineups if needed
            if len(simulator.field_lineups) == 0:
                logger.info("No lineups found, generating field lineups")
                simulator.generate_field_lineups()
                
            if len(simulator.field_lineups) == 0:
                raise ValueError("Failed to generate valid lineups for simulation")

            # Run simulation
            simulator.run_tournament_simulation()
            
            # Generate output
            output_path = simulator.output()
            
            # Get just the filename from the full path
            filename = os.path.basename(output_path)

            return JsonResponse({
                'success': True,
                'message': 'Simulation completed successfully',
                'download_url': f"/optimizer_simulator/simulator/download/{filename}/",
            })
            
        except Exception as e:
            logger.error(f"Error running simulation: {str(e)}")
            logger.error(f"Error traceback:", exc_info=True)
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

def simulation_stats_view(request):
    """View for simulation statistics"""
    try:
        results_path = os.path.join(settings.MEDIA_ROOT, 'media/simulator_output')
        files = [f for f in os.listdir(results_path) if f.endswith('.csv')]
        
        if not files:
            return render(request, 'error.html', {
                'message': 'No simulation results found. Please run a simulation first.'
            })
            
        latest_file = max(files, key=lambda x: os.path.getctime(os.path.join(results_path, x)))
        latest_file_path = os.path.join(results_path, latest_file)
        
        return render(request, 'simulation_stats.html', {
            'results_file': latest_file_path
        })
        
    except Exception as e:
        logger.error(f"Error in simulation_stats_view: {str(e)}")
        return render(request, 'error.html', {'message': str(e)})

def download_file(request, filename):
    """Handle file downloads"""
    # Remove the extra 'media' from the path
    file_path = os.path.join(settings.MEDIA_ROOT, 'simulator_output', filename)

    if os.path.exists(file_path):
        with open(file_path, 'rb') as fh:
            response = HttpResponse(fh.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
    else:
        logger.error(f"File not found at path: {file_path}")
        try:
            dir_path = os.path.join(settings.MEDIA_ROOT, 'simulator_output')
            files = os.listdir(dir_path)
        except Exception as e:
            logger.error(f"Error listing directory: {e}")
        raise Http404(f"File not found: {filename}")
