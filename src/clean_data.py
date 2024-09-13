import pandas as pd
import numpy as np
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Load CSV files
projections = pd.read_csv('../dk_data/projections.csv')
fpts_2023 = pd.read_csv('../dk_data/fpts_2023.csv')
player_ids = pd.read_csv('../dk_data/player_ids.csv')

# Rename columns in projections for consistency
column_rename_map = {
    'PLAYER': 'Name', 'POS': 'Position', 'TEAM': 'Team',
    'SAL': 'Salary', 'FPTS': 'Fpts', 'RST%': 'Own%'
}
projections.rename(columns=column_rename_map, inplace=True)

# Function to find best match using fuzzy matching
def find_best_match(name, name_list):
    if isinstance(name, str) and name.strip():  # Ensure name is non-empty
        best_match, score = process.extractOne(name, name_list, scorer=fuzz.token_set_ratio)
        if score > 90:
            return best_match
    return None

# List of player names from player_ids
player_ids_names = player_ids['Name'].tolist()

# Apply fuzzy matching to update names in projections and fpts_2023
for df, name_col in [(projections, 'Name'), (fpts_2023, 'Player')]:
    df['BestMatch'] = df[name_col].apply(lambda x: find_best_match(x, player_ids_names))
    df[name_col] = df.apply(lambda row: row['BestMatch'] if row['BestMatch'] else row[name_col], axis=1)
    df.drop(columns=['BestMatch'], inplace=True)

# Calculate standard deviation for fpts_2023
week_columns = [str(i) for i in range(1, 19)]
fpts_2023['StdDev'] = fpts_2023[week_columns].apply(lambda row: np.std(pd.to_numeric(row, errors='coerce').dropna()), axis=1)

# Merge StdDev into projections
if 'StdDev' not in projections.columns:
    projections = projections.merge(fpts_2023[['Player', 'StdDev']], left_on='Name', right_on='Player', how='left')
    projections.drop(columns=['Player'], inplace=True)
    projections.drop_duplicates(subset='Name', inplace=True)

# Save the final projections and fpts_2023 to CSV files
projections.to_csv('../dk_data/projections.csv', index=False)
fpts_2023.to_csv('../dk_data/fpts_2023.csv', index=False)
