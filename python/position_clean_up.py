# update_positions.py
import os
import json

# Base directory where your roster data is stored
base_dir = r"D:\Data Projects\RChos Fantasy\WebApp\Data\rosters"

# Position mappings
position_mappings = {
    "WR/TE": "K",
    "TQB": "QB",
    "RB/WR": "WR",
    "DB": "HC",
    "OP": "P"
}

def process_file(file_path):
    """Process a single JSON file to update position values"""
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified = False
        
        # Update positions for each player in each team's roster
        if 'teams' in data and isinstance(data['teams'], list):
            for team in data['teams']:
                if 'roster' in team and isinstance(team['roster'], list):
                    for player in team['roster']:
                        # Check if position needs to be updated
                        if player.get('position') in position_mappings:
                            player['position'] = position_mappings[player['position']]
                            modified = True
                        
                        # Also check slotPosition if it exists
                        if player.get('slotPosition') in position_mappings:
                            player['slotPosition'] = position_mappings[player['slotPosition']]
                            modified = True
        
        # Write back to file if modified
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"Updated positions in {file_path}")
            
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")

def process_year_directory(year_dir):
    """Process all files in a year directory"""
    year = os.path.basename(year_dir)
    print(f"Processing year: {year}")
    
    for file in os.listdir(year_dir):
        if file.endswith('.json'):
            file_path = os.path.join(year_dir, file)
            process_file(file_path)

def process_all_years():
    """Process all year directories"""
    try:
        for year in os.listdir(base_dir):
            year_dir = os.path.join(base_dir, year)
            if os.path.isdir(year_dir):
                process_year_directory(year_dir)
        
        print("All position updates have been completed.")
    except Exception as e:
        print(f"Error processing directories: {str(e)}")

if __name__ == "__main__":
    process_all_years()