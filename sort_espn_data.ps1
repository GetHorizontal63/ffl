# PowerShell script to sort files by year in filename
# Path to the directory containing the files
$sourceDir = "D:\FFLSite\data\espn_game_stats"

# Get all JSON files in the directory
$files = Get-ChildItem -Path $sourceDir -Filter "*.json"

# Process each file
foreach ($file in $files) {
    # Extract the year from the filename using regex pattern
    # Pattern looks for "nfl_data_" followed by 4 digits (the year)
    if ($file.Name -match "nfl_data_(\d{4})") {
        $year = $matches[1]
        
        # Create the destination directory if it doesn't exist
        $destinationDir = Join-Path -Path $sourceDir -ChildPath $year
        if (-not (Test-Path -Path $destinationDir)) {
            New-Item -Path $destinationDir -ItemType Directory | Out-Null
            Write-Host "Created directory: $destinationDir"
        }
        
        # Move the file to the year folder
        $destinationPath = Join-Path -Path $destinationDir -ChildPath $file.Name
        Move-Item -Path $file.FullName -Destination $destinationPath
        Write-Host "Moved $($file.Name) to $year folder"
    }
    else {
        Write-Host "Skipped $($file.Name) - could not extract year from filename"
    }
}

Write-Host "File sorting complete"