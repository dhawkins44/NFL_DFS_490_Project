import pandas as pd
import numpy as np
from collections import defaultdict
import re
import os
from django.conf import settings

def process_lineup_data(lineups_file):
    """Process lineup data to generate comprehensive statistics."""
    try:
        # Read the CSV files
        df = pd.read_csv(lineups_file)

        # Convert tuple keys to strings
        def convert_tuple_keys(data):
            if isinstance(data, dict):
                return {
                    str(k) if isinstance(k, tuple) else k: convert_tuple_keys(v)
                    for k, v in data.items()
                }
            elif isinstance(data, list):
                return [convert_tuple_keys(item) for item in data]
            elif isinstance(data, set):
                return list(data)
            return data
        
        # Get upload directory path for additional data files
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        
        # Read additional files with case-insensitive column names
        with open(os.path.join(upload_dir, 'projections.csv')) as f:
            projections_df = pd.read_csv(f, header=0)
            projections_df.columns = [col.lower() for col in projections_df.columns]
            
        with open(os.path.join(upload_dir, 'player_ids.csv')) as f:
            player_ids_df = pd.read_csv(f, header=0)
            player_ids_df.columns = [col.lower() for col in player_ids_df.columns]
        
        # Pre-process the dataframe to extract player info
        df = preprocess_lineups(df)
        
        # Create stats dictionary
        stats = {
            'player_stats': get_player_stats(df, projections_df, player_ids_df),
            'team_stats': get_team_stats(df, player_ids_df),
            'matchup_stats': get_matchup_stats(df, player_ids_df),
            'correlation_stats': get_correlation_stats(df),
            'summary_stats': get_summary_stats(df)
        }
        
        # Convert all tuple keys to strings before returning
        return convert_tuple_keys(stats)
        
    except Exception as e:
        print(f"Error processing lineup data: {str(e)}")
        print(f"Column names in projections: {projections_df.columns.tolist() if 'projections_df' in locals() else 'Not loaded'}")
        print(f"Column names in player_ids: {player_ids_df.columns.tolist() if 'player_ids_df' in locals() else 'Not loaded'}")
        raise

def get_player_stats(df, projections_df, player_ids_df):
    """Calculate player-level statistics."""
    try:
        # Create ownership lookup dictionary
        ownership_lookup = {}
        for _, row in projections_df.iterrows():
            try:
                original_name = row['name']
                own_pct = row['own%'].replace('%', '') if isinstance(row['own%'], str) else row['own%']
                own_value = float(own_pct)

                # Store original name
                ownership_lookup[original_name] = own_value
                
                # Handle DST case
                if 'DST' in original_name:
                    team_name = original_name.split(' DST')[0]
                    ownership_lookup[team_name] = own_value
                    ownership_lookup[team_name.lower()] = own_value
                    ownership_lookup[team_name + ' DST'] = own_value
                    ownership_lookup[team_name.lower() + ' dst'] = own_value
                else:
                    # For players, store multiple variations
                    clean_name = original_name.replace('.', '').replace("'", '')
                    ownership_lookup[clean_name] = own_value
                    ownership_lookup[clean_name.lower()] = own_value
                    
                    # Handle hyphenated names
                    if '-' in original_name:
                        ownership_lookup[original_name.replace('-', '#')] = own_value
                        ownership_lookup[original_name.replace('-', '#').lower()] = own_value
                    
                    # Special handling for T.J. and similar
                    if '.' in original_name:
                        no_dots = original_name.replace('.', '')
                        ownership_lookup[no_dots] = own_value
                        ownership_lookup[no_dots.lower()] = own_value

                print(f"Added ownership for {original_name}: {own_value}")  # Debug print
                    
            except Exception as e:
                print(f"Error processing row in projections: {row}")
                continue

        # Create team lookup similar structure...
        team_lookup = {}
        for _, row in player_ids_df.iterrows():
            try:
                name = row['name']
                team = row['teamabbrev'] if 'teamabbrev' in row else row['team']
                team_lookup[name] = team
                team_lookup[name.lower()] = team
                team_lookup[name.replace('.', '')] = team
                team_lookup[name.replace('.', '').lower()] = team
                if '-' in name:
                    team_lookup[name.replace('-', '#')] = team
                    team_lookup[name.replace('-', '#').lower()] = team
            except Exception as e:
                print(f"Error processing row in player_ids: {row}")
                continue

        # Process each lineup
        total_lineups = len(df)
        player_stats = defaultdict(lambda: {
            'exposures': 0,
            'avg_fpts': 0.0,
            'salary': 0,
            'top_lineup_appearances': 0,
            'ownership': 0.0,
            'leverage': 0.0,
            'salary_per_point': 0.0,
            'positions_used': set(),
            'team': '',
            'total_fpts': 0.0,
            'lineups_used': []
        })

        flex_distribution = {
            'RB': 0,
            'WR': 0,
            'TE': 0
        }
        
        positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']

        # First parse players file to get position mappings
        player_positions = {}
        for _, row in player_ids_df.iterrows():
            name = row['name'].replace('-', '#').lower().strip()
            pos = row['position'].split('/')[0]  # Take first position if multiple
            player_positions[name] = pos

        for idx, row in df.iterrows():
            lineup_fpts = row['Fpts Proj']
            is_top_lineup = idx < total_lineups * 0.1

            # Special handling for FLEX position
            flex_name = row.get('FLEX_name', '').replace('-', '#').lower().strip()
            if flex_name:
                flex_pos = player_positions.get(flex_name)
                if flex_pos in ['RB', 'WR', 'TE']:
                    flex_distribution[flex_pos] += 1
            
            for pos in positions:
                name = row[f'{pos}_name']
                
                # Try to find ownership using various name formats
                ownership = (ownership_lookup.get(name) or 
                           ownership_lookup.get(name.lower()) or
                           ownership_lookup.get(name.replace('.', '')) or
                           ownership_lookup.get(name.replace('.', '').lower()) or
                           ownership_lookup.get(name.replace('-', '#')) or
                           ownership_lookup.get(name.replace('-', '#').lower()) or
                           0)
                
                # Update player stats
                player_stats[name]['exposures'] += 1
                player_stats[name]['total_fpts'] += lineup_fpts
                player_stats[name]['positions_used'].add(pos)
                player_stats[name]['lineups_used'].append(idx)
                player_stats[name]['ownership'] = ownership
                player_stats[name]['team'] = team_lookup.get(name.lower(), '')
                
                if is_top_lineup:
                    player_stats[name]['top_lineup_appearances'] += 1

        # Calculate final metrics for each player
        for name, stats in player_stats.items():
            stats['exposure_rate'] = (stats['exposures'] / total_lineups) * 100
            stats['avg_fpts'] = stats['total_fpts'] / stats['exposures']
            stats['top_lineup_rate'] = (stats['top_lineup_appearances'] / max(1, len(stats['lineups_used']))) * 100
            stats['positions_used'] = list(stats['positions_used'])
            stats['leverage'] = stats['exposure_rate'] - stats['ownership']

        # Add flex distribution to the player stats
        player_stats['flex_distribution'] = flex_distribution

        return dict(player_stats)
    
    except Exception as e:
        print(f"Error in get_player_stats: {str(e)}")
        raise

def get_team_stats(df, player_ids_df):
    """Calculate team-level statistics."""
    team_stats = defaultdict(lambda: {
        'total_exposures': 0,
        'stack_patterns': defaultdict(int),
        'avg_salary': 0.0,
        'avg_fpts': 0.0,
        'total_salary': 0.0,
        'total_fpts': 0.0,
        'lineups': [],
        'players_used': set(),
        'common_stacks': []
    })

    # Create QB team lookup
    qb_team_lookup = {
        row['name'].replace('-', '#').lower().strip(): row['teamabbrev']
        for _, row in player_ids_df.iterrows()
        if row['roster position'].split('/')[0] == 'QB'
    }

    # Extract stack information from the 'Stack' column
    for idx, row in df.iterrows():
        stack_info = row['Stack']  # This should be the actual stack pattern like "QB+0|2"
        lineup_fpts = row['Fpts Proj']
        salary = row['Salary']
        
        # Get QB and their team
        qb_name = row['QB_name'].lower()
        team = qb_team_lookup.get(qb_name)
        
        if team:
            # Use the full stack pattern string
            team_stats[team]['stack_patterns'][stack_info] += 1
            team_stats[team]['total_exposures'] += 1
            team_stats[team]['total_salary'] += salary
            team_stats[team]['total_fpts'] += lineup_fpts
            team_stats[team]['lineups'].append(idx)

    # Calculate final metrics for each team
    for team, stats in team_stats.items():
        if stats['total_exposures'] > 0:
            stats['avg_salary'] = stats['total_salary'] / stats['total_exposures']
            stats['avg_fpts'] = stats['total_fpts'] / stats['total_exposures']
            
        # Sort and store the actual stack patterns
        stats['common_stacks'] = sorted(
            [(pattern, count) for pattern, count in stats['stack_patterns'].items()],
            key=lambda x: x[1],
            reverse=True
        )

    return dict(team_stats)

def get_matchup_stats(df, player_ids_df):
    """Calculate matchup-level statistics."""
    matchup_stats = defaultdict(lambda: {
        'total_lineups': 0,
        'avg_fpts': 0.0,
        'stack_patterns': defaultdict(int),
        'player_combinations': defaultdict(int),
        'total_fpts': 0.0,
        'lineups': [],
        'common_player_pairs': []
    })

    # Create matchup lookup from player_ids
    matchup_lookup = {}
    for _, row in player_ids_df.iterrows():
        player_name = row['name'].replace('-', '#').lower().strip()
        if 'game info' in row:
            matchup = row['game info'].split(' ')[0]
            matchup_lookup[player_name] = matchup

    # Process each lineup
    for idx, row in df.iterrows():
        qb_name = row['QB_name'].lower()
        matchup = matchup_lookup.get(qb_name, '')
        
        if matchup:
            lineup_fpts = row['Fpts Proj']
            matchup_stats[matchup]['total_lineups'] += 1
            matchup_stats[matchup]['total_fpts'] += lineup_fpts
            matchup_stats[matchup]['lineups'].append(idx)
            
            # Track player combinations in this matchup
            players = [row[f'{pos}_name'] for pos in ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX']]
            for i in range(len(players)):
                for j in range(i + 1, len(players)):
                    player_pair = tuple(sorted([players[i], players[j]]))
                    matchup_stats[matchup]['player_combinations'][player_pair] += 1

    # Calculate final metrics for each matchup
    for matchup, stats in matchup_stats.items():
        if stats['total_lineups'] > 0:
            stats['avg_fpts'] = stats['total_fpts'] / stats['total_lineups']
            
        # Sort and limit common player pairs
        stats['common_player_pairs'] = sorted(
            stats['player_combinations'].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

    return dict(matchup_stats)

def get_correlation_stats(df):
    """Calculate correlation statistics."""
    correlation_stats = {
        'player_pairs': [],
        'position_correlations': defaultdict(float),
        'stack_performance': defaultdict(lambda: {
            'count': 0,
            'total_fpts': 0.0,
            'avg_fpts': 0.0
        }),
        'total_lineups': len(df)  # Add this for percentage calculations
    }
    
    # Initialize a dictionary to count pairs
    player_pair_counts = defaultdict(int)
    
    # Include 'DST' in the positions list
    positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']
    
    for _, row in df.iterrows():
        lineup_fpts = row['Fpts Proj']
        
        # Process each possible player pair
        players = [row[f'{pos}_name'] for pos in positions]
        for i in range(len(players)):
            for j in range(i + 1, len(players)):
                player1 = players[i]
                player2 = players[j]
                pair = tuple(sorted([player1, player2]))
                player_pair_counts[pair] += 1
                
        # Update stack performance if this is part of a stack
        if 'Stack' in row:
            stack_type = get_stack_type(row['Stack'])
            correlation_stats['stack_performance'][stack_type]['count'] += 1
            correlation_stats['stack_performance'][stack_type]['total_fpts'] += lineup_fpts
    
    # Convert player pair counts to a list of dictionaries
    correlation_stats['player_pairs'] = [
        {'player1': pair[0], 'player2': pair[1], 'count': count}
        for pair, count in player_pair_counts.items()
    ]
    
    # Calculate average performance for each stack type
    for stack_type in correlation_stats['stack_performance']:
        stats = correlation_stats['stack_performance'][stack_type]
        if stats['count'] > 0:
            stats['avg_fpts'] = stats['total_fpts'] / stats['count']

    # Convert stack_performance to a regular dict
    correlation_stats['stack_performance'] = dict(correlation_stats['stack_performance'])

    return correlation_stats


def get_summary_stats(df):
    """Calculate summary statistics."""
    total_lineups = len(df)
    
    summary_stats = {
        'total_lineups': total_lineups,
        'avg_salary': df['Salary'].mean(),
        'avg_fpts': df['Fpts Proj'].mean(),
        'salary_distribution': {
            'min': df['Salary'].min(),
            'max': df['Salary'].max(),
            'std': df['Salary'].std()
        },
        'fpts_distribution': {
            'min': df['Fpts Proj'].min(),
            'max': df['Fpts Proj'].max(),
            'std': df['Fpts Proj'].std()
        },
        'stack_distribution': analyze_stack_distribution(df),
        'position_distribution': get_position_distribution(df),
        'salary_utilization': {
            'total': df['Salary'].sum(),
            'per_lineup': df['Salary'].mean(),
            'efficiency': df['Fpts Proj'].sum() / df['Salary'].sum()
        }
    }
    
    return summary_stats

def analyze_stack_distribution(df):
    """Analyze the distribution of different stack types."""
    stack_distribution = defaultdict(int)
    
    for stack in df['Stack']:
        stack_patterns = stack.split(' ; ')
        for pattern in stack_patterns:
            stack_distribution[pattern] += 1
    
    # Convert to percentages
    total = len(df)
    return {k: (v/total)*100 for k, v in stack_distribution.items()}

def get_position_distribution(df):
    """Get the distribution of positions in FLEX spot."""
    flex_positions = df['FLEX_name'].value_counts()
    return flex_positions.to_dict()

def get_stack_type(stack_string):
    """Parse stack string to determine stack type."""
    patterns = stack_string.split(' ; ')
    stack_sizes = [p.split('|')[0] for p in patterns]
    
    if any('QB+' in s for s in stack_sizes):
        qb_stack = next(s for s in stack_sizes if 'QB+' in s)
        size = int(qb_stack.replace('QB+', ''))
        return f'QB+{size}'
    
    return 'Other'

def preprocess_lineups(df):
    """
    Preprocess the lineup data to extract player information from combined strings.
    
    Args:
        df (pd.DataFrame): Raw lineup dataframe
    
    Returns:
        pd.DataFrame: Processed dataframe with separated player information
    """
    # Create position columns
    positions = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'DST']
    
    # Split player strings into name, id, and add position
    processed_data = []
    
    for _, row in df.iterrows():
        lineup_data = {}
        
        # Process each player in the lineup
        for pos, player_str in zip(positions, row[:9]):
            # Player format is "Name (ID)"
            name = player_str.split(' (')[0]
            player_id = player_str.split('(')[1].rstrip(')')
            
            lineup_data[f'{pos}_name'] = name
            lineup_data[f'{pos}_id'] = player_id
            
        # Add the rest of the row data (Salary, Fpts Proj, etc.)
        for col in df.columns[9:]:
            lineup_data[col] = row[col]
            
        processed_data.append(lineup_data)
    
    processed_df = pd.DataFrame(processed_data)
    
    return processed_df