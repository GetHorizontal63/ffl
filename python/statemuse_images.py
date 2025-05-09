import os
import json
import time
import random
import urllib.parse
import concurrent.futures
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


class StatMuseScraper:
    """
    A web scraper for StatMuse NFL player data with built-in rate limiting.
    """
    
    def __init__(
        self, 
        output_dir="D:\\Data Projects\\RChos Fantasy\\WebApp\\assets\\player-images",
        json_filename="player_database.json",
        start_id=25100,
        end_id=31700,
        max_workers=5,
        min_delay=2,
        max_delay=5,
        max_retries=3,
        batch_size=50,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ):
        """
        Initialize the scraper with configuration parameters.
        
        Args:
            output_dir: Directory to save player images and JSON data
            json_filename: Filename for the JSON database
            start_id: Starting player ID number
            end_id: Ending player ID number
            max_workers: Maximum number of concurrent workers
            min_delay: Minimum delay between requests (seconds)
            max_delay: Maximum delay between requests (seconds)
            max_retries: Maximum number of retries for failed requests
            batch_size: Process players in batches of this size
            user_agent: User agent string to use in requests
        """
        self.output_dir = Path(output_dir)
        self.json_path = self.output_dir / json_filename
        self.start_id = start_id
        self.end_id = end_id
        self.max_workers = max_workers
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self.batch_size = batch_size
        
        # Create a session for all requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.statmuse.com/nfl',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache',
        })
        
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load existing database if it exists
        self.player_database = []
        if self.json_path.exists():
            try:
                with open(self.json_path, 'r', encoding='utf-8') as f:
                    self.player_database = json.load(f)
                print(f"Loaded existing database with {len(self.player_database)} players")
            except json.JSONDecodeError:
                print("Error loading database, starting fresh")
        
        # Keep track of processed IDs
        self.processed_ids = {player["player_id"] for player in self.player_database}
    
    def pad_id(self, player_id):
        """Pad player ID with leading zeros to 5 digits."""
        return str(player_id).zfill(5)
    
    def random_delay(self):
        """Sleep for a random amount of time to avoid rate limiting."""
        delay = random.uniform(self.min_delay, self.max_delay)
        time.sleep(delay)
    
    def get_page_with_retry(self, url):
        """
        Get a page with exponential backoff retry logic.
        """
        for attempt in range(self.max_retries):
            try:
                # Add jitter to avoid synchronized requests
                if attempt > 0:
                    backoff = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(backoff)
                
                response = self.session.get(url, timeout=15)
                
                # Check if we're being rate limited or blocked
                if response.status_code == 429 or response.status_code == 403:
                    print(f"Rate limited or blocked (status {response.status_code}). Backing off...")
                    time.sleep(60)  # Back off for a minute
                    continue
                
                response.raise_for_status()
                return response
            
            except requests.RequestException as e:
                print(f"Error fetching {url}: {e}. Attempt {attempt+1}/{self.max_retries}")
                if attempt == self.max_retries - 1:
                    return None
        
        return None
    
    def download_image(self, image_url, output_path):
        """
        Download an image and save it to the specified path.
        """
        try:
            response = self.get_page_with_retry(image_url)
            if response and response.status_code == 200:
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                return True
            return False
        except Exception as e:
            print(f"Error downloading image {image_url}: {e}")
            return False
    
    def extract_image_url(self, img_tag):
        """
        Extract the original image URL from the StatMuse img tag.
        """
        if not img_tag:
            return None
        
        # Try to get from src attribute
        src = img_tag.get('src', '')
        if 'href=' in src:
            # Extract the URL from the _image endpoint
            parsed_url = urllib.parse.urlparse(src)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            if 'href' in query_params:
                # URL-decode the href parameter
                encoded_url = query_params['href'][0]
                return urllib.parse.unquote(encoded_url)
        
        # Try to get from srcset attribute
        srcset = img_tag.get('srcset', '')
        if 'href=' in srcset:
            # Extract the first URL from srcset
            parts = srcset.split(' ')[0]
            parsed_url = urllib.parse.urlparse(parts)
            query_params = urllib.parse.parse_qs(parsed_url.query)
            if 'href' in query_params:
                encoded_url = query_params['href'][0]
                return urllib.parse.unquote(encoded_url)
        
        return None
    
    def scrape_player(self, player_id):
        """
        Scrape a single player by ID.
        """
        padded_id = self.pad_id(player_id)
        
        # Skip if already processed
        if padded_id in self.processed_ids:
            return None
        
        url = f"https://www.statmuse.com/nfl/player/{padded_id}"
        
        # Add a random delay before each request
        self.random_delay()
        
        response = self.get_page_with_retry(url)
        if not response:
            return None
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract player name
        player_name_tag = soup.select_one('h1.text-2xl.leading-none.font-semibold')
        if not player_name_tag:
            return None  # No player found for this ID
        
        player_name = player_name_tag.text.strip()
        if not player_name:
            return None
        
        # Extract player image
        img_tag = soup.select_one('img[alt^="Illustration of"]')
        image_url = self.extract_image_url(img_tag)
        
        if not image_url:
            # Try an alternative selector
            img_tag = soup.select_one('img[loading="eager"]')
            image_url = self.extract_image_url(img_tag)
        
        # Split player name into first and last name
        name_parts = player_name.split()
        if len(name_parts) >= 2:
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
        else:
            first_name = player_name
            last_name = ""
        
        # Sanitize names for filename
        first_name = ''.join(c for c in first_name if c.isalnum() or c in ' -')
        last_name = ''.join(c for c in last_name if c.isalnum() or c in ' -')
        
        # Create player data
        player_data = {
            "player_id": padded_id,
            "player_url": url,
            "player_name": player_name,
            "first_name": first_name,
            "last_name": last_name
        }
        
        # Download and save image if available
        if image_url:
            player_data["image_url"] = image_url
            
            # Construct the filename
            image_filename = f"{first_name}_{last_name}.png"
            image_path = self.output_dir / image_filename
            player_data["local_image"] = str(image_path)
            
            # Download the image
            if not image_path.exists():
                success = self.download_image(image_url, image_path)
                if success:
                    player_data["image_downloaded"] = True
                else:
                    player_data["image_downloaded"] = False
            else:
                player_data["image_downloaded"] = True
        
        return player_data
    
    def process_batch(self, batch_ids):
        """
        Process a batch of player IDs.
        """
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.scrape_player, player_id): player_id for player_id in batch_ids}
            
            for future in concurrent.futures.as_completed(futures):
                player_id = futures[future]
                try:
                    player_data = future.result()
                    if player_data:
                        results.append(player_data)
                        print(f"Scraped player: {player_data['player_name']} (ID: {player_data['player_id']})")
                except Exception as e:
                    print(f"Error processing player {player_id}: {e}")
        
        return results
    
    def save_database(self):
        """
        Save the current player database to JSON.
        """
        with open(self.json_path, 'w', encoding='utf-8') as f:
            json.dump(self.player_database, f, indent=2)
        print(f"Database saved to {self.json_path}")
    
    def run(self):
        """
        Run the scraper for all player IDs in the specified range.
        """
        # Get IDs to process (exclude already processed)
        ids_to_process = [id for id in range(self.start_id, self.end_id + 1) 
                         if self.pad_id(id) not in self.processed_ids]
        
        print(f"Starting scraper: {len(ids_to_process)} players to process")
        
        # Process in batches
        for i in range(0, len(ids_to_process), self.batch_size):
            batch = ids_to_process[i:i+self.batch_size]
            print(f"\nProcessing batch {i//self.batch_size + 1}/{(len(ids_to_process)+self.batch_size-1)//self.batch_size} ({len(batch)} players)")
            
            # Process this batch
            results = self.process_batch(batch)
            
            # Add new players to the database
            self.player_database.extend(results)
            
            # Update processed IDs
            self.processed_ids.update({player["player_id"] for player in results})
            
            # Save progress after each batch
            self.save_database()
            
            # Take a longer break between batches to be extra safe
            if i + self.batch_size < len(ids_to_process):
                pause = random.uniform(10, 15)
                print(f"Batch complete. Pausing for {pause:.1f} seconds before next batch...")
                time.sleep(pause)
        
        print(f"\nScraping complete. Total players in database: {len(self.player_database)}")


if __name__ == "__main__":
    # Configuration parameters
    config = {
        "output_dir": "D:\\Data Projects\\RChos Fantasy\\WebApp\\assets\\player-images",
        "json_filename": "player_database.json",
        "start_id": 25100,      # First player ID to check
        "end_id": 31700,        # Last player ID to check
        "max_workers": 3,       # Number of concurrent threads (keep low to avoid rate limits)
        "min_delay": 2,         # Minimum seconds between requests
        "max_delay": 5,         # Maximum seconds between requests
        "max_retries": 3,       # Number of retries for failed requests
        "batch_size": 75        # Process players in batches
    }
    
    # Create and run the scraper
    scraper = StatMuseScraper(**config)
    scraper.run()