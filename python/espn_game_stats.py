import requests
import json
import os
import time
from datetime import datetime

# Create the output directory if it doesn't exist
output_dir = "data/espn_game_stats"
os.makedirs(output_dir, exist_ok=True)

def get_nfl_games(year, week, season_type=2):
    """
    Get basic NFL game data for a specific week
    
    Parameters:
    - year: season year (e.g., 2023)
    - week: week number (1-18 for regular season)
    - season_type: 1=preseason, 2=regular season, 3=postseason
    
    Returns: Dictionary of game data
    """
    print(f"  Fetching games for Year: {year}, Week: {week}, Season Type: {season_type}")
    
    url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
    params = {
        "lang": "en",
        "region": "us",
        "calendartype": "blacklist",
        "limit": 100,
        "dates": year,
        "seasontype": season_type,
        "week": week
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise exception for error status codes
        
        # Log the exact URL that was requested
        print(f"    URL: {response.url}")
        print(f"    Status Code: {response.status_code}")
        
        data = response.json()
        
        # Debug: check what we're getting back
        events_count = len(data.get('events', []))
        print(f"    Found {events_count} games")
        
        return data
    except Exception as e:
        print(f"    ERROR: {str(e)}")
        return None

def get_game_details(game_id):
    """
    Get detailed data for a specific game
    
    Parameters:
    - game_id: ESPN's event ID for the game
    
    Returns: Dictionary of game details
    """
    print(f"    Fetching details for game ID: {game_id}")
    
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary"
    params = {
        "event": game_id,
        "lang": "en",
        "region": "us"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        print(f"      Status Code: {response.status_code}")
        
        data = response.json()
        return data
    except Exception as e:
        print(f"      ERROR: {str(e)}")
        return None

def get_player_stats_for_week(year, week, season_type=2):
    """
    Get player statistics for all games in a specific week
    
    Parameters:
    - year: season year (e.g., 2023)
    - week: week number (1-18 for regular season)
    - season_type: 1=preseason, 2=regular season, 3=postseason
    
    Returns: Dictionary of all game and player data
    """
    # First get all games for the specified week
    games_data = get_nfl_games(year, week, season_type)
    
    if not games_data or 'events' not in games_data or not games_data['events']:
        print(f"  No games found for Year: {year}, Week: {week}")
        return None
    
    # Process each game to get player stats
    all_game_data = {}
    all_game_data['year'] = year
    all_game_data['week'] = week
    all_game_data['season_type'] = season_type
    all_game_data['games'] = []
    
    for event in games_data.get('events', []):
        game_id = event.get('id')
        
        # Get detailed data for this game
        game_details = get_game_details(game_id)
        
        if game_details:
            all_game_data['games'].append(game_details)
        
        # Add a delay to avoid rate limiting
        time.sleep(1)
    
    return all_game_data

def get_season_data(year, weeks, season_type=2):
    """
    Get data for specified weeks of an NFL season
    
    Parameters:
    - year: season year (e.g., 2023)
    - weeks: list of week numbers to process
    - season_type: 1=preseason, 2=regular season, 3=postseason
    
    Returns: Dictionary of season data
    """
    season_data = {
        'year': year,
        'season_type': season_type,
        'weeks': {}
    }
    
    for week in weeks:
        # Check if this week's data already exists
        week_filename = os.path.join(output_dir, f"nfl_data_{year}_week_{week}.json")
        if os.path.exists(week_filename):
            print(f"Skipping Year: {year}, Week: {week} - File already exists: {week_filename}")
            
            # Load existing data and add to our season_data
            try:
                with open(week_filename, 'r', encoding='utf-8') as f:
                    week_data = json.load(f)
                season_data['weeks'][str(week)] = week_data
                game_count = len(week_data.get('games', []))
                print(f"  Loaded existing data for {game_count} games from {week_filename}")
                continue
            except Exception as e:
                print(f"  Error loading existing file: {str(e)}")
                print(f"  Will re-download this week's data")
        
        print(f"Processing Year: {year}, Week: {week}")
        
        week_data = get_player_stats_for_week(year, week, season_type)
        
        if week_data:
            season_data['weeks'][str(week)] = week_data
            
            # Save each week individually as JSON
            with open(week_filename, 'w', encoding='utf-8') as f:
                json.dump(week_data, f, indent=2)
            
            game_count = len(week_data.get('games', []))
            print(f"  Saved data for {game_count} games to {week_filename}")
    
    # Check if season file should be saved
    weeks_str = "-".join(str(w) for w in weeks)
    season_filename = os.path.join(output_dir, f"nfl_data_{year}_weeks_{weeks_str}.json")
    
    # Only save if we have at least one week's data
    if season_data['weeks']:
        with open(season_filename, 'w', encoding='utf-8') as f:
            json.dump(season_data, f, indent=2)
        print(f"Saved season data to {season_filename}")
    else:
        print(f"No data to save for {year} season")
    
    return season_data

def get_multiple_seasons_data(years, weeks, season_type=2):
    """
    Get data for multiple NFL seasons with specified weeks
    
    Parameters:
    - years: list of years to process
    - weeks: list of weeks to process for all years
    - season_type: 1=preseason, 2=regular season, 3=postseason
    
    Returns: Dictionary of all seasons data
    """
    all_seasons_data = {
        'seasons': {}
    }
    
    # Check if the all seasons file already exists
    years_str = "-".join(str(y) for y in years)
    all_seasons_filename = os.path.join(output_dir, f"nfl_data_{years_str}_all_seasons.json")
    
    if os.path.exists(all_seasons_filename):
        print(f"Found existing all-seasons file: {all_seasons_filename}")
        try:
            with open(all_seasons_filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                all_seasons_data = existing_data
                print("Loaded existing all-seasons data - will update with any new data")
        except Exception as e:
            print(f"Error loading existing all-seasons file: {str(e)}")
            print("Starting with fresh data")
    
    for year in years:
        print(f"Processing Season: {year}, Weeks: {weeks}")
        
        # Check if we already have this year's data in our loaded all_seasons_data
        if str(year) in all_seasons_data.get('seasons', {}) and all(str(w) in all_seasons_data['seasons'][str(year)].get('weeks', {}) for w in weeks):
            print(f"All requested weeks for season {year} are already in the all-seasons data")
            continue
            
        season_data = get_season_data(year, weeks, season_type)
        
        # Only add season data if we got some results
        if season_data and season_data.get('weeks'):
            all_seasons_data.setdefault('seasons', {})[str(year)] = season_data
    
    # Only save if we have data
    if all_seasons_data.get('seasons'):
        with open(all_seasons_filename, 'w', encoding='utf-8') as f:
            json.dump(all_seasons_data, f, indent=2)
        print(f"Saved all seasons data to {all_seasons_filename}")
    else:
        print("No seasons data to save - all requested data might already exist")
    
    return all_seasons_data

def get_user_input():
    """Prompt user for seasons and weeks to download"""
    print("\nNFL ESPN Data Downloader")
    print("=======================")
    
    # Get season types
    print("\nSeason Types:")
    print("1 = Preseason")
    print("2 = Regular Season")
    print("3 = Postseason")
    
    while True:
        try:
            season_type = int(input("\nEnter season type (1/2/3, default=2): ") or "2")
            if season_type not in [1, 2, 3]:
                print("Invalid season type. Please enter 1, 2, or 3.")
                continue
            break
        except ValueError:
            print("Please enter a valid number.")
    
    # Get year range
    while True:
        try:
            start_year = int(input("\nEnter start year: "))
            end_year = int(input("Enter end year: "))
            
            if start_year > end_year:
                print("Start year must be less than or equal to end year.")
                continue
                
            years = list(range(start_year, end_year + 1))
            break
        except ValueError:
            print("Please enter valid years as integers.")
    
    # Determine max week based on season type and most recent year
    # This assumes the most recent year has the current week structure
    max_week = 18 if (season_type == 2 and end_year >= 2021) else 17
    if season_type == 3:
        max_week = 5  # Postseason typically has 5 weeks max
    if season_type == 1:
        max_week = 4  # Preseason typically has 4 weeks max
    
    print(f"\nWeeks selection (applies to all seasons, max week: {max_week}):")
    print("- Enter specific weeks (e.g. 1,3,5)")
    print("- Enter a range (e.g. 1-4)")
    print("- Enter 'all' for all weeks")
    
    while True:
        weeks_input = input("Enter weeks to download: ")
        
        if weeks_input.lower() == 'all':
            weeks = list(range(1, max_week + 1))
            break
        
        try:
            # Check if input contains a range (e.g. "1-4")
            if "-" in weeks_input:
                start, end = map(int, weeks_input.split("-"))
                if start < 1 or end > max_week or start > end:
                    print(f"Invalid range. Please enter weeks between 1 and {max_week}.")
                    continue
                weeks = list(range(start, end + 1))
            else:
                # Parse comma-separated values
                weeks = [int(w.strip()) for w in weeks_input.split(",")]
                if any(w < 1 or w > max_week for w in weeks):
                    print(f"Invalid week(s). Please enter weeks between 1 and {max_week}.")
                    continue
            
            if not weeks:
                print("Please enter at least one week.")
                continue
            
            break
        except ValueError:
            print("Invalid input. Please enter weeks as integers.")
    
    return years, weeks, season_type

# Main function
if __name__ == "__main__":
    print(f"Output directory: {os.path.abspath(output_dir)}")
    
    # Get user input for years and weeks
    years, weeks, season_type = get_user_input()
    
    # Display summary of what will be downloaded
    print("\nDownload Summary:")
    print(f"Season Type: {'Preseason' if season_type == 1 else 'Regular Season' if season_type == 2 else 'Postseason'}")
    print(f"Years: {', '.join(str(y) for y in years)}")
    print(f"Weeks: {', '.join(str(w) for w in weeks)}")
    
    confirm = input("\nProceed with download? (y/n): ")
    if confirm.lower() != 'y':
        print("Download cancelled.")
        exit()
    
    # Start download
    print("\nStarting download...")
    all_data = get_multiple_seasons_data(years, weeks, season_type)
    
    # Count games
    game_count = 0
    for year, season_data in all_data['seasons'].items():
        for week, week_data in season_data['weeks'].items():
            game_count += len(week_data.get('games', []))

    print(f"\nData processing complete with {game_count} total games.")
    print(f"All files saved to: {os.path.abspath(output_dir)}")