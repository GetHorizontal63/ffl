# update_owners.py
import os
import json

# Base directory where your roster data is stored
base_dir = r"D:\Data Projects\RChos Fantasy\WebApp\Data\rosters"

# Owner mappings for all years
common_owners = {
    1: "Jack",
    2: "Anthony",
    3: "Gabe",
    5: "Tucker",
    6: "Omar",
    7: "Cubby",
    8: "Isaiah",
    10: "Kevin",
    11: "Armando",
    12: "Jeffrey",
    14: "Blake"
}

# Year-specific owner mappings
year_specific_owners = {
    4: {
        2019: "Caty", 2020: "Caty", 2021: "Caty", 2022: "Caty", 2023: "Caty",
        2024: "Mario"
    },
    9: {
        2019: "Jackson", 2020: "Jackson",
        2022: "Melanie", 2023: "Melanie", 2024: "Melanie"
    },
    13: {
        2019: "Jon",
        2020: "Brennan", 2021: "Brennan", 2022: "Brennan", 2023: "Brennan", 2024: "Brennan"
    },
    15: {
        2019: "Ryan",
        2020: "Sam", 2021: "Sam", 2022: "Sam", 2023: "Sam",
        2024: "Jason"
    },
    16: {
        2019: "Peter", 2020: "Peter", 2021: "Peter",
        2022: "Devin", 2023: "Devin", 2024: "Devin"
    }
}

def get_owner_name(team_id, year):
    """Get owner name based on team_id and year"""
    # Convert to integers to ensure proper comparison
    team_id = int(team_id)
    year = int(year)
    
    # Check if this is a team_id with year-specific owner
    if team_id in year_specific_owners:
        return year_specific_owners[team_id].get(year)
    
    # Otherwise return the common owner
    return common_owners.get(team_id)

def process_file(file_path, year):
    """Process a single JSON file"""
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        modified = False
        
        # Update owner for each team
        if 'teams' in data and isinstance(data['teams'], list):
            for team in data['teams']:
                if team.get('owner') is None:
                    owner_name = get_owner_name(team['team_id'], year)
                    if owner_name:
                        team['owner'] = owner_name
                        modified = True
        
        # Write back to file if modified
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f"Updated {file_path}")
            
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")

def process_year_directory(year_dir):
    """Process all files in a year directory"""
    year = os.path.basename(year_dir)
    print(f"Processing year: {year}")
    
    for file in os.listdir(year_dir):
        if file.endswith('.json'):
            file_path = os.path.join(year_dir, file)
            process_file(file_path, year)

def process_all_years():
    """Process all year directories"""
    try:
        for year in os.listdir(base_dir):
            year_dir = os.path.join(base_dir, year)
            if os.path.isdir(year_dir):
                process_year_directory(year_dir)
        
        print("All roster files have been processed.")
    except Exception as e:
        print(f"Error processing directories: {str(e)}")

if __name__ == "__main__":
    process_all_years()