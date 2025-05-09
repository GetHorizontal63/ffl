import os
import json
import requests
import time
from datetime import datetime

# Your league ID and authentication cookies
league_id = 21635379
espn_s2 = "AEB3EXkwqps%2FFeor%2BOYjof6ZOsJ%2Beq%2FNSGqyh1m2kItvGAevq8DNlGZogrF82taXe5c0iCnX6Fx4v5Fr19RvCAT%2BEGTaJ3%2Fm1BiRT%2FHpu%2Bs3cEcKds3iXq3iein2N3eukkUmQ1Z07xajHBH8K5sxfI0ibw0OJ1ljZXWUPKXLi5khJd2aRZU4PT6IcnMC3OoYxYDcZBegAs2E6%2FzvFqSve%2BFhRlmKvckfK1OUjqg3k4zzKHl%2B4gg4gQg%2BwNQh%2FjCVpP9u7XfV8NavCb9IPWzs%2FnCYtqH%2Bb9DeRTEM7jX2wcSnQ7jY2%2F4GH7y3rOsdCswgz%2Bg%3D"
swid = "{98115016-BA13-470A-BE43-D3C8DBE1B5BD}"

# Output directory
output_dir = r"D:\Data Projects\RChos Fantasy\WebApp\Data\rosters"

# Create the directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Position mapping dictionary
POSITION_MAPPING = {
    0: 'QB',
    1: 'TQB',
    2: 'RB', 
    3: 'RB/WR',
    4: 'WR',
    5: 'WR/TE',
    6: 'TE',
    7: 'OP',
    8: 'DT',
    9: 'DE',
    10: 'LB',
    11: 'DL',
    12: 'CB',
    13: 'S', 
    14: 'DB',
    15: 'DP',
    16: 'D/ST',
    17: 'K',
    18: 'P',
    19: 'HC',
    20: 'BE',
    21: 'IR',
    22: 'RESERVE',
    23: 'FLEX',
    24: 'EDR'
}

# Team abbreviation mapping
TEAM_ABBREVS = {
    1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 
    8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 
    15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 
    22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 
    29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU"
}

def make_request(url, params=None, cookies=None):
    """Make a request to the ESPN API with proper headers and improved error handling"""
    try:
        # Add necessary headers for the API request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'X-Fantasy-Platform': 'kona-PROD-7dff19c4aec5a7a56334404f83473da379798872',
            'X-Fantasy-Source': 'kona',
            'Referer': 'https://fantasy.espn.com/football/league'
        }
        
        # Debug information
        print(f"Requesting URL: {url}")
        if params:
            print(f"With parameters: {params}")
        
        response = requests.get(
            url,
            params=params,
            cookies=cookies,
            headers=headers,
            timeout=30
        )
        
        # Check for errors
        response.raise_for_status()
        
        # Print first part of response for debugging
        response_text = response.text
        print(f"Response preview: {response_text[:100]}...")
        
        # Check if response is empty or non-JSON
        if not response_text.strip():
            print("Empty response received")
            return None
        
        # Return the JSON response
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response content: {e.response.content[:200]}")  # Show beginning of error response
        return None
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Raw response (first 500 chars): {response.text[:500]}")
        return None
    except Exception as e:
        print(f"Error making request: {str(e)}")
        return None

def test_connection(year):
    """Test the connection to the ESPN API before proceeding with full extraction"""
    print(f"Testing connection to ESPN Fantasy Football API for year {year}...")
    
    # Setup cookies
    cookies = {
        "SWID": swid,
        "espn_s2": espn_s2
    }
    
    # Determine the correct base URL based on year
    if year < 2018:
        base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/{league_id}?seasonId={year}"
    else:
        base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
    
    # Try a simple request to check if we can connect
    test_data = make_request(base_url, cookies=cookies)
    
    if test_data:
        print("Successfully connected to ESPN API!")
        return True
    else:
        print("Failed to connect to ESPN API. Check your credentials and league ID.")
        
        # Try the old ESPN domain as a fallback
        print("Attempting fallback to old ESPN domain...")
        if year < 2018:
            fallback_url = f"https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/{league_id}?seasonId={year}"
        else:
            fallback_url = f"https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
        
        fallback_data = make_request(fallback_url, cookies=cookies)
        if fallback_data:
            print("Successfully connected using fallback URL!")
            return True
        
        return False

def export_roster_data(year):
    """Export roster data for a specific year"""
    try:
        print(f"Connecting to ESPN Fantasy Football for year {year}...")
        
        # Test connection first to determine working API endpoint
        if not test_connection(year):
            print(f"Skipping year {year} due to connection issues.")
            return False
            
        # Determine the base URL based on which one worked in the test
        if year < 2018:
            base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/leagueHistory/{league_id}?seasonId={year}"
            print(f"Using legacy API endpoint for year {year}: {base_url}")
        else:
            base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
            print(f"Using standard API endpoint for year {year}: {base_url}")
        
        # Set the number of weeks based on the year
        if year in [2019, 2020]:
            total_weeks = 16
        else:  # 2021 and beyond
            total_weeks = 17
            
        print(f"Processing {total_weeks} weeks for year {year}")
        
        # Create a directory for this year
        year_dir = os.path.join(output_dir, str(year))
        os.makedirs(year_dir, exist_ok=True)
        
        # Base URL for the ESPN API - updated to use the new LM API endpoint
        base_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
        
        # Setup cookies
        cookies = {
            "SWID": swid,
            "espn_s2": espn_s2
        }
        
        # First, get the league teams once to minimize requests
        team_json = make_request(
            base_url,
            params={"view": "mTeam"},
            cookies=cookies
        )
        
        if not team_json:
            print(f"Failed to get team data for year {year}. Skipping...")
            return False
        
        # Create a mapping of team IDs to team names
        team_names = {}
        if 'teams' in team_json:
            for team in team_json['teams']:
                if 'id' in team and 'location' in team and 'nickname' in team:
                    team_id = team['id']
                    team_name = f"{team['location']} {team['nickname']}"
                    team_names[team_id] = team_name
        
        # Export team rosters for each week
        for week in range(1, total_weeks + 1):
            print(f"Processing week {week}...")
            
            try:
                # Get league data with matchup info for the week
                params = {
                    "view": "mMatchup",
                    "view": "mMatchupScore",
                    "scoringPeriodId": week,
                    "matchupPeriodId": week
                }
                
                # Make the request to get league data with matchup info
                league_json = make_request(
                    base_url,
                    params=params,
                    cookies=cookies
                )
                
                if not league_json:
                    print(f"Failed to get league data for week {week}. Skipping...")
                    continue
                
                # Try to get rosters with a different endpoint that might work better
                roster_url = f"{base_url}/teams"
                roster_params = {
                    "scoringPeriodId": week,
                    "view": "mRoster"
                }
                
                roster_json = make_request(
                    roster_url,
                    params=roster_params,
                    cookies=cookies
                )
                
                # Use the roster data if available, otherwise fall back to league data
                use_roster_data = roster_json is not None
                
                # Initialize data for this week
                weekly_data = {
                    'year': year,
                    'week': week,
                    'scoring_type': league_json.get('settings', {}).get('scoringSettings', {}).get('scoringType', "Unknown"),
                    'teams': [],
                    'extracted_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Get all members to match owners
                members = {}
                if 'members' in league_json:
                    for member in league_json['members']:
                        if 'id' in member:
                            members[member['id']] = f"{member.get('firstName', '')} {member.get('lastName', '')}".strip()
                
                # Process teams and rosters
                teams_to_process = []
                
                if use_roster_data and roster_json:
                    teams_to_process = roster_json
                elif 'teams' in league_json:
                    teams_to_process = league_json['teams']
                
                for team in teams_to_process:
                    team_id = team.get('id')
                    team_name = team_names.get(team_id, f"Team {team_id}")
                    
                    # Get owner info if available
                    owner = None
                    if 'owners' in team and len(team['owners']) > 0:
                        owner_id = team['owners'][0]
                        owner = members.get(owner_id)
                    
                    # Initialize team data
                    team_data = {
                        'team_id': team_id,
                        'team_name': team_name,
                        'owner': owner,
                        'roster': []
                    }
                    
                    # Process each player in the roster
                    if 'roster' in team and 'entries' in team['roster']:
                        for entry in team['roster']['entries']:
                            if 'playerPoolEntry' in entry and 'player' in entry['playerPoolEntry']:
                                player = entry['playerPoolEntry']['player']
                                
                                # Get player basics
                                player_id = player.get('id')
                                player_name = player.get('fullName')
                                
                                # Get player position
                                position = None
                                if 'defaultPositionId' in player:
                                    pos_id = player.get('defaultPositionId')
                                    position = POSITION_MAPPING.get(pos_id, f"POS{pos_id}")
                                
                                # Get player team
                                pro_team = None
                                if 'proTeamId' in player:
                                    pro_team_id = player.get('proTeamId')
                                    pro_team = TEAM_ABBREVS.get(pro_team_id, f"TEAM{pro_team_id}")
                                
                                # Get lineup slot
                                slot_id = entry.get('lineupSlotId')
                                slot_position = POSITION_MAPPING.get(slot_id, f"SLOT{slot_id}")
                                
                                # Get injury status
                                injury_status = "ACTIVE"
                                if 'injuryStatus' in player:
                                    injury_status = player.get('injuryStatus')
                                
                                # Get fantasy points - actual and projected
                                actual_points = None
                                projected_points = None
                                
                                if 'stats' in player:
                                    for stat in player['stats']:
                                        if stat.get('scoringPeriodId') != week:
                                            continue
                                            
                                        if stat.get('statSourceId') == 0:  # Actual stats
                                            actual_points = stat.get('appliedTotal')
                                        elif stat.get('statSourceId') == 1:  # Projected stats
                                            projected_points = stat.get('appliedTotal')
                                
                                # Create player data object
                                player_data = {
                                    'playerId': player_id,
                                    'name': player_name,
                                    'position': position,
                                    'proTeam': pro_team,
                                    'slotId': slot_id,
                                    'slotPosition': slot_position,
                                    'injuryStatus': injury_status,
                                    'actualPoints': actual_points,
                                    'projectedPoints': projected_points
                                }
                                
                                team_data['roster'].append(player_data)
                    
                    weekly_data['teams'].append(team_data)
                
                # Save the weekly data
                week_filename = os.path.join(year_dir, f"week_{week}_rosters.json")
                with open(week_filename, 'w') as f:
                    json.dump(weekly_data, f, indent=4)
                
                print(f"Week {week} data saved to {week_filename}")
                
                # Add a small delay to avoid rate limiting
                time.sleep(2)
                
            except Exception as e:
                print(f"Error processing week {week} of year {year}: {str(e)}")
                print("Continuing to next week...")
                continue
        
        print(f"All weekly data for {year} saved successfully")
        return True
    
    except Exception as e:
        print(f"Error processing year {year}: {str(e)}")
        return False

def main():
    """Main function to extract roster data for all specified years"""
    # Export data for each year
    years_to_export = [2019, 2020, 2021, 2022, 2023, 2024]
    
    print(f"Exporting ESPN fantasy roster data to {output_dir}...")
    
    # Check if ESPN S2 cookie and SWID are valid
    if not espn_s2 or not swid:
        print("ERROR: ESPN S2 cookie or SWID is missing. Please update the script with valid credentials.")
        return
    
    # Count of successful exports
    success_count = 0
    
    for year in years_to_export:
        print(f"\n{'='*50}")
        print(f"Exporting data for {year}...")
        print(f"{'='*50}")
        
        if export_roster_data(year):
            success_count += 1
    
    print(f"\nExport completed! Successfully exported data for {success_count} out of {len(years_to_export)} years.")

if __name__ == "__main__":
    main()