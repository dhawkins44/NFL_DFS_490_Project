import pandas as pd
import numpy as np
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Load projections data and rename columns for consistency
projections = pd.read_csv('../dk_data/projections.csv')

column_rename_map = {
    'PLAYER': 'Name',
    'POS': 'Position',
    'TEAM': 'Team',
    'SAL': 'Salary',
    'FPTS': 'Fpts',
    'RST%': 'Own%',
}

projections.rename(columns=column_rename_map, inplace=True)

# Load weekly fantasy points data and calculate standard deviation for each player
fpts_2023 = pd.read_csv('../dk_data/fpts_2023.csv')
week_columns = [str(i) for i in range(1, 19)]
fpts_2023['StdDev'] = fpts_2023[week_columns].apply(
    lambda row: np.std(pd.to_numeric(row, errors='coerce').dropna()), axis=1
)

# Function to match similar player names using fuzzy matching
def find_best_match(name, name_list):
    best_match, score = process.extractOne(name, name_list, scorer=fuzz.token_set_ratio)
    if score > 90: 
        return best_match
    else:
        return None
if 'StdDev' not in projections.columns:
    # Perform fuzzy matching to align projections with fantasy points data
    fpts_player_names = fpts_2023['Player'].tolist()
    projections['BestMatch'] = projections['Name'].apply(lambda x: find_best_match(x, fpts_player_names))

    # Merge standard deviation into projections and clean up the final DataFrame
    projections = projections.merge(fpts_2023[['Player', 'StdDev']], left_on='BestMatch', right_on='Player', how='left')
    projections.drop_duplicates(subset='Name', inplace=True)
    projections.drop(columns=['Player', 'BestMatch'], inplace=True)

    # Save the final projections with standard deviations
    projections.to_csv('../dk_data/projections.csv', index=False)
