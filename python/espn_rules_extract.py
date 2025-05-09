#!/usr/bin/env python3
"""
ESPN Fantasy Football Rules Extractor

This script scrapes the rules from an ESPN Fantasy Football league settings page
and saves them as a JSON file in a data directory.

Usage:
    python espn_rules_extractor.py [season_year]
"""

import json
import os
import sys
import re
import requests
from bs4 import BeautifulSoup
import argparse

# Base URL for league settings
BASE_URL = "https://fantasy.espn.com/football/league/settings"

def create_directory_if_not_exists(directory_path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        print(f"Created directory: {directory_path}")

def extract_rules(league_id, season_id):
    """
    Extract rules from the league settings page
    
    Args:
        league_id: The ESPN league ID
        season_id: The season year
    
    Returns:
        dict: The extracted rules
    """
    # Construct the URL
    url = f"{BASE_URL}?leagueId={league_id}&seasonId={season_id}&view=summary"
    
    print(f"Fetching rules from: {url}")
    
    # Make the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Authentication cookies - these are needed for private leagues
    cookies = {
        'espn_s2': "AEB3EXkwqps%2FFeor%2BOYjof6ZOsJ%2Beq%2FNSGqyh1m2kItvGAevq8DNlGZogrF82taXe5c0iCnX6Fx4v5Fr19RvCAT%2BEGTaJ3%2Fm1BiRT%2FHpu%2Bs3cEcKds3iXq3iein2N3eukkUmQ1Z07xajHBH8K5sxfI0ibw0OJ1ljZXWUPKXLi5khJd2aRZU4PT6IcnMC3OoYxYDcZBegAs2E6%2FzvFqSve%2BFhRlmKvckfK1OUjqg3k4zzKHl%2B4gg4gQg%2BwNQh%2FjCVpP9u7XfV8NavCb9IPWzs%2FnCYtqH%2Bb9DeRTEM7jX2wcSnQ7jY2%2F4GH7y3rOsdCswgz%2Bg%3D",
        'SWID': "{98115016-BA13-470A-BE43-D3C8DBE1B5BD}"
    }
    
    try:
        response = requests.get(url, headers=headers, cookies=cookies)
        response.raise_for_status()  # Raise exception for 4XX/5XX status codes
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the page: {e}")
        return None
    
    # Parse the HTML content with BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Start building our rules dictionary
    rules = {
        "season": season_id,
        "league_id": league_id,
        "league_info": {},
        "basic_settings": {},
        "draft_settings": {},
        "roster_settings": {},
        "scoring_settings": {},
        "teams_divisions": {},
        "player_rules": {},
        "acquisition_waiver_rules": {},
        "trade_rules": {},
        "keepers_rules": {},
        "regular_season_setup": {},
        "playoff_bracket_setup": {}
    }
    
    # Since the page is likely to be rendered with JavaScript, we may not be able to extract all the data
    # Let's try to find some basic information from the HTML
    
    # Use the ESPN API to get the detailed settings
    api_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season_id}/segments/0/leagues/{league_id}?view=mSettings"
    
    try:
        api_response = requests.get(api_url, headers=headers, cookies=cookies)
        api_response.raise_for_status()
        settings_data = api_response.json()
        
        # Extract and organize the settings data
        if 'settings' in settings_data:
            settings = settings_data['settings']
            
            # Basic settings
            if 'name' in settings:
                rules['league_info']['name'] = settings['name']
            
            # Scoring settings
            if 'scoringSettings' in settings:
                rules['scoring_settings'] = settings['scoringSettings']
            
            # Roster settings
            if 'rosterSettings' in settings:
                rules['roster_settings'] = settings['rosterSettings']
            
            # Draft settings
            if 'draftSettings' in settings:
                rules['draft_settings'] = settings['draftSettings']
            
            # Schedule settings
            if 'scheduleSettings' in settings:
                rules['regular_season_setup'] = settings['scheduleSettings']
            
            # Playoff settings
            if 'playoffSettings' in settings:
                rules['playoff_bracket_setup'] = settings['playoffSettings']
            
            # Trade settings
            if 'tradeSettings' in settings:
                rules['trade_rules'] = settings['tradeSettings']
            
            # Acquisition settings
            if 'acquisitionSettings' in settings:
                rules['acquisition_waiver_rules'] = settings['acquisitionSettings']
        
        # Extract teams information
        teams_url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season_id}/segments/0/leagues/{league_id}?view=mTeam"
        teams_response = requests.get(teams_url, headers=headers, cookies=cookies)
        teams_data = teams_response.json()
        
        if 'teams' in teams_data:
            rules['teams'] = teams_data['teams']
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the API data: {e}")
    
    return rules

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Extract ESPN Fantasy Football League Rules')
    parser.add_argument('season', nargs='?', type=int, help='Season year (e.g., 2025)')
    args = parser.parse_args()
    
    # If season is not provided as a command line argument, prompt the user
    if args.season is None:
        while True:
            try:
                season = input("Enter the season year (e.g., 2025): ")
                season_id = int(season)
                if 2000 <= season_id <= 2100:  # Reasonable range check
                    break
                else:
                    print("Please enter a valid year between 2000 and 2100.")
            except ValueError:
                print("Please enter a valid year (numeric value).")
    else:
        season_id = args.season
    
    # League ID for your league
    league_id = 21635379
    
    # Create data\rules directory
    create_directory_if_not_exists(os.path.join("data", "rules"))
    
    # Extract the rules
    rules = extract_rules(league_id, season_id)
    
    if rules:
        # Save to JSON file in data\rules directory with rules_YYYY.json format
        output_file = os.path.join("data", "rules", f"rules_{season_id}.json")
        
        with open(output_file, 'w') as f:
            json.dump(rules, f, indent=4)
        
        print(f"Successfully extracted rules to {output_file}")
    else:
        print("Failed to extract rules.")

if __name__ == "__main__":
    main()