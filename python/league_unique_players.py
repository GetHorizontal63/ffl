import os
import json
import sys
import time
import re
import random
from pathlib import Path
import requests
from urllib.parse import quote
from bs4 import BeautifulSoup
# Add Selenium imports
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
# Add webdriver-manager import
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService

def extract_player_ids():
    """Main function to extract player IDs from roster JSON files and find PFF and StatMuse IDs."""
    # Define paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "Data"  # Go up twice to reach Data folder
    rosters_dir = data_dir / "rosters"
    output_file = data_dir / "player_ids.json"
    
    # Dictionary to store player information
    players = {}
    
    # Find all year folders in the rosters directory
    year_folders = [f for f in rosters_dir.iterdir() if f.is_dir()]
    
    print(f"Found {len(year_folders)} year folders in {rosters_dir}")
    
    # Track total JSON files processed
    total_files = 0
    total_players_processed = 0
    
    # Process each year folder
    for year_folder in year_folders:
        # Find all JSON files in this year folder
        json_files = list(year_folder.glob("*.json"))
        total_files += len(json_files)
        
        print(f"Processing {len(json_files)} JSON files from {year_folder.name}")
        
        # Process each file in this year
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                    # Process ESPN roster structure
                    if isinstance(data, dict) and "teams" in data and isinstance(data["teams"], list):
                        for team in data["teams"]:
                            if "roster" in team and isinstance(team["roster"], list):
                                for player in team["roster"]:
                                    if "name" in player and "playerId" in player:
                                        espn_id = str(player["playerId"])
                                        
                                        # If we haven't seen this player before, add them
                                        if espn_id not in players:
                                            players[espn_id] = {
                                                "name": player["name"],
                                                "espnId": espn_id,
                                                "statmuseId": None,
                                                "pffId": None,
                                                "position": player.get("position", ""),
                                                "proTeam": player.get("proTeam", "")
                                            }
                                        
                                        total_players_processed += 1
            except Exception as e:
                print(f"Error processing {json_file}: {str(e)}")
    
    print(f"Initial data collection: Found {len(players)} unique players")
    
    # Process a sample of players to find their PFF and StatMuse IDs
    # Filter out HC and D/ST entries
    valid_players = [p for p in players.values() if p.get('position') not in ['HC', 'D/ST']]
    
    # Define how many players to process (adjust as needed)
    sample_size = min(50, len(valid_players))
    sample_players = valid_players[:sample_size]
    
    print(f"\nSearching for PFF and StatMuse IDs for {sample_size} players...")
    
    for i, player in enumerate(sample_players):
        player_name = player['name']
        position = player.get('position', '')
        team = player.get('proTeam', '')
        
        print(f"Processing {i+1}/{sample_size}: {player_name} ({position}, {team})")
        
        # Find PFF ID using Google search
        pff_id = search_pff_id_via_google(player_name)
        if pff_id:
            print(f"  Found PFF ID: {pff_id}")
            espn_id = player['espnId']
            players[espn_id]['pffId'] = pff_id
        else:
            print(f"  No PFF ID found")
        
        # Find StatMuse ID using Google search
        statmuse_id = search_statmuse_id_via_google(player_name)
        if statmuse_id:
            print(f"  Found StatMuse ID: {statmuse_id}")
            espn_id = player['espnId']
            players[espn_id]['statmuseId'] = statmuse_id
        else:
            print(f"  No StatMuse ID found")
        
        # Sleep to avoid rate limiting
        time.sleep(random.uniform(1.0, 2.0))
    
    # Convert dictionary to list for output
    player_list = [{"id": id, **info} for id, info in players.items()]
    
    # Write output file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(player_list, f, indent=2)
    
    print(f"\nProcessed {total_files} JSON files across {len(year_folders)} years")
    print(f"Found {total_players_processed} player entries (with duplicates)")
    print(f"Extracted {len(player_list)} unique players to {output_file}")
    
    # Print some stats
    espn_count = sum(1 for p in player_list if p.get("espnId") is not None)
    statmuse_count = sum(1 for p in player_list if p.get("statmuseId") is not None)
    pff_count = sum(1 for p in player_list if p.get("pffId") is not None)
    
    print(f"Players with ESPN IDs: {espn_count}")
    print(f"Players with Statmuse IDs: {statmuse_count}")
    print(f"Players with PFF IDs: {pff_count}")

def search_with_selenium(search_query, domain=None, timeout=10):
    """
    Search Google using Selenium to properly handle JavaScript-rendered results
    
    Args:
        search_query (str): The query to search for
        domain (str, optional): Optional domain to restrict the search to
        timeout (int): Maximum time to wait for page load in seconds
        
    Returns:
        list: List of extracted URLs from the search results
    """
    links = []
    driver = None
    
    try:
        # Set up Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode (no GUI)
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Add a user agent to appear more like a real browser
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36")
        
        # Use webdriver-manager to automatically install the correct driver version
        print("  Setting up Chrome driver with webdriver-manager...")
        try:
            # Create the driver with webdriver-manager for automatic driver management
            service = ChromeService(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
        except Exception as e:
            print(f"  Error with webdriver-manager: {str(e)}")
            print("  Falling back to regular Chrome driver...")
            driver = webdriver.Chrome(options=chrome_options)
        
        # Construct the Google search URL
        if domain:
            url = f"https://www.google.com/search?q={quote(search_query)}+site:{domain}"
        else:
            url = f"https://www.google.com/search?q={quote(search_query)}"
        
        print(f"  Navigating to: {url}")
        driver.get(url)
        
        # Wait for search results to load
        try:
            WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.g, div[data-sokoban-container]"))
            )
        except TimeoutException:
            print("  Could not find standard search results, trying alternate selectors...")
            # Try alternate selectors in case Google's HTML structure has changed
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "a[href^='http']"))
                )
            except:
                print("  Failed to find results with alternate selectors")
                
        # First try to get links using standard selector
        elements = driver.find_elements(By.CSS_SELECTOR, "div.g a, div[data-sokoban-container] a")
        
        # If no elements found, try a more generic approach
        if not elements:
            print("  Using generic link selector as fallback")
            elements = driver.find_elements(By.CSS_SELECTOR, "a[href^='http']")
        
        for element in elements:
            href = element.get_attribute("href")
            if href and not href.startswith("https://www.google.com") and not href.startswith("https://webcache.googleusercontent.com"):
                links.append(href)
                
        print(f"  Found {len(links)} links using Selenium")
        
        # Print the first few links for debugging
        for i, link in enumerate(links[:3]):
            print(f"  Link {i+1}: {link}")
        
        # If we still failed to find search results, try to save the page HTML for debugging
        if not links:
            debug_dir = Path(__file__).parent / "debug"
            debug_dir.mkdir(exist_ok=True)
            debug_file = debug_dir / f"google_search_{int(time.time())}.html"
            try:
                with open(debug_file, 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                print(f"  Saved debug HTML to {debug_file}")
            except Exception as e:
                print(f"  Failed to save debug HTML: {str(e)}")
            
        return links
        
    except TimeoutException:
        print("  Timeout waiting for search results to load")
    except WebDriverException as e:
        print(f"  WebDriver error: {str(e)}")
    except Exception as e:
        print(f"  Error during Selenium search: {str(e)}")
    finally:
        # Close the browser if it was created
        if driver:
            driver.quit()
    
    return links

def search_pff_id_via_google(player_name):
    """
    Search for a player's PFF ID by using Google to find the URL pattern
    
    Args:
        player_name (str): The player's name
        
    Returns:
        str: PFF ID if found, None otherwise
    """
    try:
        # Use Selenium for Google search
        search_query = f"{player_name} nfl players"
        links = search_with_selenium(search_query, domain="pff.com")
        
        # Look for PFF player URLs in these links
        for link in links:
            # Check if this is a PFF player page with an ID
            if '/players/' in link:
                # Extract the player ID using regex
                match = re.search(r'/players/[^/]+/(\d+)', link)
                if match:
                    return match.group(1)  # Return the ID part
    
    except Exception as e:
        print(f"  Error searching PFF via Google: {str(e)}")
    
    # If we didn't find a PFF ID, try a direct approach to the PFF website
    try:
        # Clean the player name for a URL
        clean_name = player_name.lower().replace(' ', '-').replace("'", "").replace(".", "")
        
        # Try to access the player's page directly
        url = f"https://www.pff.com/nfl/players/{clean_name}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        
        print(f"  Direct PFF search status code: {response.status_code}")
        
        if response.status_code == 200:
            # Check if there's a redirect with a player ID
            final_url = response.url
            match = re.search(r'/players/[^/]+/(\d+)', final_url)
            if match:
                return match.group(1)
    
    except Exception as e:
        print(f"  Error with direct PFF search: {str(e)}")
    
    return None

def search_statmuse_id_via_google(player_name):
    """
    Search for a player's StatMuse ID by using Google to find the URL pattern
    
    Args:
        player_name (str): The player's name
        
    Returns:
        str: StatMuse ID if found, None otherwise
    """
    try:
        # Use Selenium for Google search
        search_query = f"{player_name} nfl player stats"
        links = search_with_selenium(search_query, domain="statmuse.com")
        
        # Look for StatMuse player URLs in these links
        for link in links:
            # Check if this is a StatMuse player page with an ID
            if '/player/' in link:
                # Extract the player ID using regex
                match = re.search(r'/player/[^-]+-(\d+)', link)
                if match:
                    return match.group(1)  # Return the ID part
    
    except Exception as e:
        print(f"  Error searching StatMuse via Google: {str(e)}")
    
    # If we didn't find a StatMuse ID, try a direct approach
    try:
        # Format the player name for a StatMuse URL
        name_parts = player_name.lower().split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = name_parts[-1]
            clean_name = f"{first_name}-{last_name}"
            
            # Try to access the player's page directly
            url = f"https://www.statmuse.com/nfl/player/{clean_name}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
            
            response = requests.get(url, headers=headers, timeout=5)
            
            print(f"  Direct StatMuse search status code: {response.status_code}")
            
            if response.status_code == 200:
                # Check the final URL for the player ID
                final_url = response.url
                match = re.search(r'/player/[^-]+-(\d+)', final_url)
                if match:
                    return match.group(1)
                
                # If not in the URL, check the page content
                soup = BeautifulSoup(response.text, 'html.parser')
                player_links = soup.find_all('a', href=re.compile(r'/nfl/player/[^-]+-\d+'))
                
                for link in player_links:
                    href = link.get('href')
                    if href:
                        match = re.search(r'/player/[^-]+-(\d+)', href)
                        if match:
                            return match.group(1)
    
    except Exception as e:
        print(f"  Error with direct StatMuse search: {str(e)}")
    
    return None

def lookup_player_ids(search_value, search_by="name"):
    """
    Look up a player in the player_ids.json file by name or ID
    
    Args:
        search_value (str): The value to search for (name, ESPN ID, etc.)
        search_by (str): The field to search by ('name', 'espnId', 'pffId', 'statmuseId')
        
    Returns:
        dict or list: Player information if found, empty list if not found
    """
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "Data"
    player_ids_file = data_dir / "player_ids.json"
    
    if not player_ids_file.exists():
        print(f"Player IDs file not found: {player_ids_file}")
        return []
    
    try:
        with open(player_ids_file, 'r', encoding='utf-8') as f:
            player_list = json.load(f)
        
        # Handle name searches (which need partial matching)
        if search_by == "name":
            search_value = search_value.lower()
            matches = []
            
            for player in player_list:
                player_name = player.get("name", "").lower()
                if search_value in player_name:
                    matches.append(player)
            
            return matches
        
        # Handle exact ID matches
        else:
            for player in player_list:
                if player.get(search_by) == search_value:
                    return player
            
            return []
    
    except Exception as e:
        print(f"Error looking up player: {str(e)}")
        return []

# Modify the test_single_player function to use the lookup
def test_single_player():
    """Test player ID lookup or search via Google"""
    player_name = input("Enter player name: ")
    
    print(f"Searching for {player_name}...")
    
    # First try to find the player in our existing database
    existing_players = lookup_player_ids(player_name, "name")
    
    if existing_players:
        print(f"Found {len(existing_players)} matching players in database:")
        for idx, player in enumerate(existing_players):
            print(f"{idx+1}. {player['name']} (ESPN ID: {player['espnId']})")
            print(f"   PFF ID: {player.get('pffId', 'Not found')}")
            print(f"   StatMuse ID: {player.get('statmuseId', 'Not found')}")
        
        # If we found the player but some IDs are missing, ask if we want to try to find them
        if len(existing_players) == 1:
            player = existing_players[0]
            missing_ids = []
            
            if not player.get('pffId'):
                missing_ids.append('PFF')
            if not player.get('statmuseId'):
                missing_ids.append('StatMuse')
            
            if missing_ids and input(f"Try to find missing {' & '.join(missing_ids)} IDs? (y/n): ").lower() == 'y':
                # Find PFF ID if missing
                if 'PFF' in missing_ids:
                    pff_id = search_pff_id_via_google(player['name'])
                    if pff_id:
                        print(f"Found PFF ID: {pff_id}")
                        # Update the player_ids.json file
                        update_player_id(player['espnId'], 'pffId', pff_id)
                    else:
                        print("No PFF ID found")
                
                # Find StatMuse ID if missing
                if 'StatMuse' in missing_ids:
                    statmuse_id = search_statmuse_id_via_google(player['name'])
                    if statmuse_id:
                        print(f"Found StatMuse ID: {statmuse_id}")
                        # Update the player_ids.json file
                        update_player_id(player['espnId'], 'statmuseId', statmuse_id)
                    else:
                        print("No StatMuse ID found")
        
        return existing_players
    
    # If not found in database, try Google search
    print("Player not found in database. Searching online...")
    
    # Search for PFF ID
    pff_id = search_pff_id_via_google(player_name)
    if pff_id:
        print(f"Found PFF ID: {pff_id}")
    else:
        print("No PFF ID found")
    
    # Search for StatMuse ID
    statmuse_id = search_statmuse_id_via_google(player_name)
    if statmuse_id:
        print(f"Found StatMuse ID: {statmuse_id}")
    else:
        print("No StatMuse ID found")
    
    # If we found any IDs, ask if we want to add this player to the database
    if pff_id or statmuse_id:
        if input("Add this player to the database? (y/n): ").lower() == 'y':
            espn_id = input("Enter ESPN ID (or press Enter to skip): ")
            position = input("Enter position (or press Enter to skip): ")
            team = input("Enter team (or press Enter to skip): ")
            
            add_player_to_database(
                name=player_name,
                espn_id=espn_id if espn_id else None,
                pff_id=pff_id,
                statmuse_id=statmuse_id,
                position=position if position else None,
                team=team if team else None
            )
            
            print("Player added to database.")
    
    return {
        "name": player_name,
        "pff_id": pff_id,
        "statmuse_id": statmuse_id
    }

def update_player_id(espn_id, id_type, id_value):
    """Update a player's ID in the player_ids.json file"""
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "Data"
    player_ids_file = data_dir / "player_ids.json"
    
    try:
        with open(player_ids_file, 'r', encoding='utf-8') as f:
            player_list = json.load(f)
        
        for player in player_list:
            if player.get('espnId') == espn_id:
                player[id_type] = id_value
                break
        
        with open(player_ids_file, 'w', encoding='utf-8') as f:
            json.dump(player_list, f, indent=2)
            
        print(f"Updated {id_type} for player with ESPN ID {espn_id}")
        return True
    except Exception as e:
        print(f"Error updating player ID: {str(e)}")
        return False

def add_player_to_database(name, espn_id=None, pff_id=None, statmuse_id=None, position=None, team=None):
    """Add a new player to the player_ids.json file"""
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent.parent / "Data"
    player_ids_file = data_dir / "player_ids.json"
    
    try:
        if player_ids_file.exists():
            with open(player_ids_file, 'r', encoding='utf-8') as f:
                player_list = json.load(f)
        else:
            player_list = []
        
        # Create a new player entry
        new_player = {
            "name": name,
            "espnId": espn_id,
            "pffId": pff_id,
            "statmuseId": statmuse_id,
            "position": position,
            "proTeam": team
        }
        
        # If we have an ESPN ID, use it as the ID field
        if espn_id:
            new_player["id"] = espn_id
        # Otherwise, use a timestamp as a temporary ID
        else:
            new_player["id"] = f"temp_{int(time.time())}"
        
        # Add the player to the list
        player_list.append(new_player)
        
        # Write the updated list back to the file
        with open(player_ids_file, 'w', encoding='utf-8') as f:
            json.dump(player_list, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error adding player to database: {str(e)}")
        return False

if __name__ == "__main__":
    # Print installation instructions if this is the first run
    if not os.environ.get("SELENIUM_SETUP_SHOWN"):
        print("="*80)
        print("First-time Setup Instructions:")
        print("This script uses Selenium to scrape web pages. You'll need to install:")
        print("1. The Selenium package: pip install selenium")
        print("2. The WebDriver Manager: pip install webdriver-manager")
        print("="*80)
        os.environ["SELENIUM_SETUP_SHOWN"] = "1"
    
    # Check for required packages
    try:
        import pkg_resources
        required_packages = ['selenium', 'webdriver-manager']
        installed = {pkg.key for pkg in pkg_resources.working_set}
        missing = set(required_packages) - installed
        
        if missing:
            print("Missing required packages:")
            for pkg in missing:
                print(f"- {pkg}")
            print("Please install them using: pip install " + " ".join(missing))
            
            if input("Attempt to continue anyway? (y/n): ").lower() != 'y':
                print("Exiting.")
                sys.exit(1)
    except ImportError:
        print("Warning: Unable to check for required packages.")
    
    # Choose whether to run the full extraction or test a single player
    mode = input("Run full extraction (F), test single player (S), or lookup player (L)? ").upper()
    
    if mode == 'F':
        extract_player_ids()
    elif mode == 'L':
        search_term = input("Enter search term: ")
        search_type = input("Search by name (N), ESPN ID (E), PFF ID (P), or StatMuse ID (S)? ").upper()
        
        search_by = "name"
        if search_type == 'E':
            search_by = "espnId"
        elif search_type == 'P':
            search_by = "pffId"
        elif search_type == 'S':
            search_by = "statmuseId"
        
        results = lookup_player_ids(search_term, search_by)
        
        if results:
            if isinstance(results, list):
                print(f"\nFound {len(results)} matching players:")
                for idx, player in enumerate(results):
                    print(f"{idx+1}. {player['name']} (ESPN ID: {player['espnId']})")
                    print(f"   PFF ID: {player.get('pffId', 'Not found')}")
                    print(f"   StatMuse ID: {player.get('statmuseId', 'Not found')}")
            else:
                print("\nFound player:")
                print(f"Name: {results['name']}")
                print(f"ESPN ID: {results.get('espnId', 'Not found')}")
                print(f"PFF ID: {results.get('pffId', 'Not found')}")
                print(f"StatMuse ID: {results.get('statmuseId', 'Not found')}")
        else:
            print("No matching players found.")
    else:
        result = test_single_player()
        print(f"\nResults: {result}")