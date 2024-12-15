from django.http import JsonResponse, HttpResponse, Http404
from django.shortcuts import render
from django.conf import settings
from optimizer_simulator.utils.simulator import NFL_GPP_Simulator
from optimizer_simulator.utils.numpy_encoder import NumpyEncoder
import json
import os
import logging
import glob
import csv
import re

logger = logging.getLogger(__name__)

def simulator_view(request):
    """Main view for the simulator page"""
    context = {
        'active_tab': 'simulator',
        'show_upload_modal': False
    }
    return render(request, 'simulator.html', context)

def run_simulation(request):
    """Handles POST requests to run DFS tournament simulations"""
    if request.method == 'POST':
        try:
            config = json.loads(request.body.decode('utf-8'))
            # Extract custom lineups from the config
            custom_lineups = config.get('custom_lineups', [])

            # Set up file paths for required inputs
            config_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'config.json')
            player_ids_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'player_ids.csv')
            projections_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'projections.csv')
            contest_structure_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'contest_structure.csv')
            
            # Validate input files have required data
            with open(player_ids_path, 'r') as f:
                player_ids_data = list(csv.DictReader(f))
                positions = set(p['Position'] for p in player_ids_data)

            player_positions = {
                p['ID']: p['Position'] 
                for p in player_ids_data 
                if 'ID' in p and 'Position' in p
            }

            with open(projections_path, 'r') as f:
                proj_data = list(csv.DictReader(f))
                non_zero_own = sum(1 for p in proj_data if float(p.get('Own%', 0)) > 0)

            # Clean up previous simulation files
            simulator_output_dir = os.path.join(settings.MEDIA_ROOT, 'simulator_output')
            existing_files = glob.glob(os.path.join(simulator_output_dir, 'dk_gpp_sim*'))
            for f in existing_files:
                os.remove(f)

            if os.path.exists(config_path):
                os.remove(config_path)
            
            # Build simulator config from user inputs and defaults
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
                "custom_lineups": custom_lineups,  # Add custom lineups to the config
            }

            with open(config_path, 'w') as f:
                json.dump(simulator_config, f, indent=4)

            # Initialize and run simulation
            simulator = NFL_GPP_Simulator(
                site='dk',
                field_size=config.get('field_size', 100),
                num_iterations=config.get('num_simulations', 1000),
                use_contest_data=config.get('use_contest_data', False),
                use_lineup_input=config.get('use_lineup_input', False),
                config_path=config_path,
            )

            # Add custom lineups to the simulator's field lineups
            if custom_lineups:
                # First, build a mapping of IDs to player dictionary keys
                id_to_key = {}
                for key, player_data in simulator.player_dict.items():
                    if 'ID' in player_data:
                        id_to_key[str(player_data['ID'])] = key
                
                for i, lineup in enumerate(custom_lineups):
                    
                    # Reorder from frontend order [QB,RB,RB,WR,WR,WR,TE,FLEX,DST] 
                    # to simulator order [DST,QB,RB,RB,WR,WR,WR,TE,FLEX]
                    ordered_lineup = [
                        str(lineup[8]),  # DST
                        str(lineup[0]),  # QB
                        str(lineup[1]),  # RB
                        str(lineup[2]),  # RB
                        str(lineup[3]),  # WR
                        str(lineup[4]),  # WR
                        str(lineup[5]),  # WR
                        str(lineup[6]),  # TE
                        str(lineup[7]),  # FLEX
                    ]
                    
                    # Verify we have exactly 9 players
                    if len(ordered_lineup) != 9:
                        logger.error(f"Invalid lineup length: {len(ordered_lineup)}")
                        continue
                        
                    try:
                        # Verify all players exist in mapping
                        for player_id in ordered_lineup:
                            if player_id not in id_to_key:
                                logger.error(f"Player ID {player_id} not found in mapping")
                                raise ValueError(f"Player ID {player_id} not found")

                        # Calculate total salary and projected points
                        total_salary = sum(
                            float(simulator.player_dict[id_to_key[player_id]]["Salary"]) 
                            for player_id in ordered_lineup
                        )
                        
                        total_fpts = sum(
                            float(simulator.player_dict[id_to_key[player_id]]["Fpts"]) 
                            for player_id in ordered_lineup
                        )

                        # Store the lineup exactly as received from frontend
                        simulator.field_lineups[i] = {
                            "Lineup": ordered_lineup,
                            "Wins": 0,
                            "Top1Percent": 0,
                            "ROI": 0,
                            "Cashes": 0,
                            "Type": "custom",
                            "Count": 1,
                            "Salary": total_salary,
                            "Fpts": total_fpts,
                            "FieldFpts": total_fpts,
                            "Ceiling": total_fpts,
                            "Own%": 0,
                            "Stack": "No Stack",
                            "Stack2": "No Stack",
                            "Players vs DST": 0
                        }
                        
                    except Exception as e:
                        logger.error(f"Error processing lineup {i}: {str(e)}")
                        logger.error(f"Lineup data: {ordered_lineup}")
                        continue

                # Generate the remaining lineups without adjusting field_size
                simulator.generate_field_lineups()
            else:
                # If no custom lineups, generate the full field
                simulator.generate_field_lineups()
            
            if not simulator.field_lineups:
                raise ValueError("Failed to generate valid lineups for simulation")

            simulator.run_tournament_simulation()
            
            # Get output filenames for download links
            lineups_output_path, exposures_output_path = simulator.output()
            exposures_filename = os.path.basename(exposures_output_path)
            lineups_filename = os.path.basename(lineups_output_path)

            # Create a player lookup dictionary
            player_lookup = {}
            for key, player in simulator.player_dict.items():
                if 'ID' in player:
                    # Clean up the name formatting
                    name = player['Name'].replace('#', '-').title()
                    player_lookup[str(player['ID'])] = {
                        'Name': name,
                        'Team': player['Team'],
                        'Position': player['Position'],
                        'Salary': player['Salary'],
                        'Fpts': player['Fpts'],
                        'Ownership': player.get('Ownership', 0),
                        'Opponent': player.get('Opp', 'N/A'),
                        'ID': player['ID']
                    }
            
            # Process lineup data to ensure stack info is included
            processed_lineups = {}
            with open(lineups_output_path, 'r') as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    # Get the lineup from field_lineups
                    lineup_data = simulator.field_lineups[idx]
                    
                    # Add the CSV data we want
                    processed_lineups[idx] = {
                        **lineup_data,  # Keep original lineup data
                        'Stack1 Type': row['Stack1 Type'],
                        'Stack2 Type': row['Stack2 Type'],
                        'Ceiling': float(row['Ceiling']),
                    }

            return JsonResponse({
                'success': True,
                'message': 'Simulation completed successfully',
                'lineups': processed_lineups,
                'players': player_lookup,
                'num_simulations': simulator.num_iterations,
                'exposures_filename': exposures_filename,
                'lineups_filename': lineups_filename,
            }, encoder=NumpyEncoder)
            
        except Exception as e:
            logger.error("Error running simulation: %s", str(e), exc_info=True)
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=500)

def simulation_stats_view(request):
    """Displays statistics from the most recent simulation"""
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
    """Downloads simulation result files with security checks"""
    try:
        if not re.match(r'^[\w\-\.]+$', filename):
            raise Http404("Invalid filename")

        file_path = os.path.join(settings.MEDIA_ROOT, 'simulator_output', filename)
        
        if not os.path.exists(file_path):
            raise Http404("File not found")

        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename={filename}'
            return response

    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        return HttpResponse(str(e), status=500)
