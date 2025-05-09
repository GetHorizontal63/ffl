import os
import json

# Updated list of tight ends
tight_ends = ["Albert Okwuegbunam", "Anthony Firkser", "Austin Hooper", "Blake Jarwin", 
             "Brevin Jordan", "Brock Wright", "C.J. Uzomah", "Caleb Wilson", 
             "Cameron Brate", "Cole Kmet", "Dallas Goedert", "Dalton Kincaid", 
             "Dalton Schultz", "Darren Waller", "David Njoku", "Dawson Knox", 
             "Drew Sample", "Durham Smythe", "Evan Engram", "Foster Moreau", 
             "Geoff Swaim", "George Kittle", "Gerald Everett", "Greg Dulcich", 
             "Harrison Bryant", "Hayden Hurst", "Hunter Henry", "Irv Smith Jr.", 
             "Isaiah Likely", "Jack Doyle", "Jake Ferguson", "James O'Shaughnessy", 
             "Jared Cook", "Jason Witten", "Jimmy Graham", "John Bates", 
             "Jonnu Smith", "Jordan Akins", "Josiah Deguara", "Josh Oliver", 
             "Juwan Johnson", "Kyle Pitts", "Logan Thomas", "Mark Andrews", 
             "Mike Gesicki", "Noah Fant", "Noah Gray", "O.J. Howard", 
             "Pat Freiermuth", "Pharaoh Brown", "Ricky Seals-Jones", "Rob Gronkowski", 
             "Robert Tonyan", "Ryan Griffin", "Sam LaPorta", "T.J. Hockenson", 
             "Taysom Hill", "Tommy Tremble", "Travis Kelce", "Trey Burton", 
             "Trey McBride", "Tyler Conklin", "Tyler Higbee", "Will Dissly", "Zach Ertz"]

def update_position(directory):
    """
    Recursively search all JSON files in directory and update position for tight ends
    """
    updated_files = 0
    updated_players = 0
    
    # Get total number of JSON files for progress tracking
    total_files = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                total_files += 1
    
    if total_files == 0:
        print("No JSON files found!")
        return 0, 0
    
    print(f"Found {total_files} JSON files to process")
    
    # Process files and track progress
    processed_files = 0
    
    # Walk through all directories and files
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                processed_files += 1
                
                # Show progress
                progress = (processed_files / total_files) * 100
                print(f"[{processed_files}/{total_files} - {progress:.1f}%] Processing: {file_path}")
                
                # Try to load and process the file
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    file_updated = False
                    file_players_updated = 0
                    
                    # Process teams and their rosters
                    if "teams" in data and isinstance(data["teams"], list):
                        for team in data["teams"]:
                            if "roster" in team and isinstance(team["roster"], list):
                                for player in team["roster"]:
                                    # Check if player is in our tight end list and position is WR
                                    if (player.get("name") in tight_ends and 
                                        player.get("position") == "WR"):
                                        player["position"] = "TE"
                                        updated_players += 1
                                        file_players_updated += 1
                                        file_updated = True
                                        print(f"  - Updated {player['name']} from WR to TE")
                    
                    # Save file if changes were made
                    if file_updated:
                        updated_files += 1
                        print(f"  - Total players updated in this file: {file_players_updated}")
                        with open(file_path, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2)
                
                except Exception as e:
                    print(f"  - ERROR processing {file_path}: {e}")
    
    return updated_files, updated_players

if __name__ == "__main__":
    roster_dir = os.path.join("data", "rosters")
    
    if not os.path.exists(roster_dir):
        print(f"Directory {roster_dir} does not exist!")
    else:
        print(f"Starting scan of directory: {roster_dir}")
        print("-" * 80)
        
        files_updated, players_updated = update_position(roster_dir)
        
        print("-" * 80)
        print(f"SUMMARY:")
        print(f"- Files updated: {files_updated}")
        print(f"- Players updated from WR to TE: {players_updated}")