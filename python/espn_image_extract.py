import json
import os
import requests
import time
from pathlib import Path
from tqdm import tqdm
import glob
from PIL import Image
import io

def process_game_stats_files():
    # Initialize player dictionary to store all player info
    player_dict = {}
    
    # Recursively find all JSON files in the data\espn_game_stats directory and subdirectories
    json_files = glob.glob('data/espn_game_stats/**/*.json', recursive=True)
    
    print(f"Found {len(json_files)} JSON files to process...")
    
    # Process each JSON file
    for json_file in tqdm(json_files, desc="Processing game stats files"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract year, week, and season_type from the file data
            year = data.get('year')
            week = data.get('week')
            season_type = data.get('season_type')
            
            if not all([year, week, season_type]):
                continue
            
            # Extract games data
            games = data.get('games', [])
            
            for game in games:
                boxscore = game.get('boxscore', {})
                teams_data = boxscore.get('teams', [])
                
                # Create a mapping of team IDs to team names
                teams = {}
                for team_data in teams_data:
                    team = team_data.get('team', {})
                    team_id = team.get('id')
                    if team_id:
                        teams[team_id] = {
                            'displayName': team.get('displayName', ''),
                            'abbreviation': team.get('abbreviation', '')
                        }
                
                # Extract player data
                players_data = boxscore.get('players', [])
                
                for player_category in players_data:
                    team_info = player_category.get('team', {})
                    team_id = team_info.get('id')
                    
                    statistics = player_category.get('statistics', [])
                    
                    for stat_category in statistics:
                        athletes = stat_category.get('athletes', [])
                        
                        for athlete_data in athletes:
                            athlete = athlete_data.get('athlete', {})
                            
                            if athlete and 'id' in athlete:
                                player_id = athlete.get('id')
                                player_guid = athlete.get('guid')
                                player_name = athlete.get('displayName', '')
                                # Extract player position
                                player_position = athlete.get('position', {}).get('abbreviation', '')
                                
                                if not player_id:
                                    continue
                                
                                # Initialize player record if not exists
                                if player_id not in player_dict:
                                    player_dict[player_id] = {
                                        'id': player_id,
                                        'guid': player_guid,
                                        'name': player_name,
                                        'position': player_position,  # Add position field
                                        'seasons': {},
                                        'headshot_url': ''
                                    }
                                    
                                    # Add headshot URL if available
                                    headshot = athlete.get('headshot', {})
                                    if headshot and 'href' in headshot:
                                        player_dict[player_id]['headshot_url'] = headshot.get('href')
                                
                                # Update player position if it's empty in our dict but available in this record
                                if not player_dict[player_id]['position'] and player_position:
                                    player_dict[player_id]['position'] = player_position
                                
                                # Update player seasons information
                                if team_id and year:
                                    if year not in player_dict[player_id]['seasons']:
                                        player_dict[player_id]['seasons'][year] = []
                                    
                                    team_entry = {
                                        'team_id': team_id,
                                        'team_name': teams.get(team_id, {}).get('displayName', ''),
                                        'team_abbr': teams.get(team_id, {}).get('abbreviation', '')
                                    }
                                    
                                    # Only add if not already in the list
                                    if team_entry not in player_dict[player_id]['seasons'][year]:
                                        player_dict[player_id]['seasons'][year].append(team_entry)
        
        except Exception as e:
            print(f"Error processing file {json_file}: {str(e)}")
    
    # Save the player dictionary to a JSON file
    output_file = 'data/espn_player_dictionary.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(player_dict, f, indent=2)
    
    print(f"\nExtracted information for {len(player_dict)} players.")
    print(f"Player dictionary saved to {output_file}")
    
    return player_dict

def is_valid_image(image_data):
    """Check if the downloaded data is a valid image file"""
    try:
        image = Image.open(io.BytesIO(image_data))
        # Additional check: make sure it's not a tiny placeholder or error image
        width, height = image.size
        # If image dimensions are too small, it might be a placeholder
        if width < 50 or height < 50:
            return False
        return True
    except:
        return False

def download_player_images(player_dict):
    # Create output directory if it doesn't exist
    output_dir = "assets/espn-player-images"
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # URL templates for ESPN player headshots
    url_templates = [
        # Primary template with combiner
        "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{player_id}.png&w=600&h=436",
        # Alternate template without combiner
        "https://a.espncdn.com/i/headshots/nfl/players/full/{player_id}.png",
        # Fallback template with different size
        "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{player_id}.png&w=350&h=254",
        # Another possible domain
        "https://secure.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{player_id}.png&w=600&h=436"
    ]
    
    # Placeholder image URL that we'll use if no player image is found
    placeholder_url = "https://a.espncdn.com/i/headshots/nfl/players/full/0.png"
    
    print(f"Starting download of player images...")
    
    # Track successful and failed downloads
    success_count = 0
    failed_count = 0
    skipped_count = 0
    placeholder_count = 0
    
    log_file = open("download_log.txt", "w")
    
    # Download each player's image
    for player_id, player_info in tqdm(player_dict.items(), desc="Downloading player images"):
        # Define output file path
        output_file = output_path / f"{player_id}.png"
        
        # Skip if file already exists and is valid
        if output_file.exists() and os.path.getsize(output_file) > 1000:  # Ensure file isn't tiny
            skipped_count += 1
            continue
        
        found_valid_image = False
        
        # Try from headshot URL in data first (if available)
        headshot_url = player_info.get('headshot_url', '')
        if headshot_url:
            try:
                response = requests.get(headshot_url, stream=True, timeout=10)
                if response.status_code == 200:
                    image_data = response.content
                    if is_valid_image(image_data):
                        with open(output_file, 'wb') as img_file:
                            img_file.write(image_data)
                        success_count += 1
                        found_valid_image = True
                        log_file.write(f"SUCCESS (original URL): {player_info['name']} (ID: {player_id})\n")
            except Exception as e:
                log_file.write(f"ERROR with original URL for {player_info['name']} (ID: {player_id}): {str(e)}\n")
        
        # If original URL didn't work, try each template
        if not found_valid_image:
            for template in url_templates:
                if found_valid_image:
                    break
                    
                try:
                    url = template.format(player_id=player_id)
                    response = requests.get(url, stream=True, timeout=10)
                    
                    if response.status_code == 200:
                        image_data = response.content
                        if is_valid_image(image_data):
                            with open(output_file, 'wb') as img_file:
                                img_file.write(image_data)
                            success_count += 1
                            found_valid_image = True
                            log_file.write(f"SUCCESS (template): {player_info['name']} (ID: {player_id}) - {url}\n")
                except Exception as e:
                    log_file.write(f"ERROR with template for {player_info['name']} (ID: {player_id}): {str(e)}\n")
        
        # If still no valid image, use placeholder
        if not found_valid_image:
            try:
                response = requests.get(placeholder_url, stream=True, timeout=10)
                if response.status_code == 200:
                    with open(output_file, 'wb') as img_file:
                        img_file.write(response.content)
                    placeholder_count += 1
                    log_file.write(f"PLACEHOLDER: {player_info['name']} (ID: {player_id})\n")
                else:
                    failed_count += 1
                    log_file.write(f"FAILED: {player_info['name']} (ID: {player_id}) - All attempts failed\n")
            except Exception as e:
                failed_count += 1
                log_file.write(f"FAILED: {player_info['name']} (ID: {player_id}) - Error with placeholder: {str(e)}\n")
        
        # Add a small delay to avoid hitting rate limits
        time.sleep(0.1)
    
    log_file.close()
    
    print(f"\nDownload complete!")
    print(f"Successfully downloaded: {success_count}")
    print(f"Using placeholder: {placeholder_count}")
    print(f"Failed: {failed_count}")
    print(f"Skipped (already exists): {skipped_count}")
    print(f"See download_log.txt for detailed results")

if __name__ == "__main__":
    # Process game stats files to create player dictionary
    player_dict = process_game_stats_files()
    
    # Download player images
    download_player_images(player_dict)