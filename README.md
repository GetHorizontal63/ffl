# Fantasy Football League Site

## Overview

This comprehensive web application serves as a platform for tracking, analyzing, and visualizing Fantasy Football League data alongside corresponding NFL statistics. It brings together fantasy team performance with actual NFL game data to provide rich context and analytics for league participants.

## Purpose

The FFLSite aims to:

1. Create a centralized hub for all fantasy league information
2. Provide detailed historical records of games, seasons, and player performances
3. Integrate real NFL data to contextualize fantasy performances
4. Enable deep analysis of team decisions, roster optimization, and league trends
5. Preserve league history and memorable moments
6. Enhance the overall fantasy football experience with rich visualizations and insights

## Features

### Game Management
- **Game Search**: Filter and find specific games by season, week, and team
- **Game Details**: Comprehensive view of matchups, including roster decisions, player performances, and optimization analysis
- **NFL Integration**: Real NFL game data connects fantasy performances to actual games

### Season Tracking
- **Season Overview**: Season-level statistics, trends, and notable performances
- **Weekly Results**: Complete breakdown of each week's matchups and outcomes
- **Playoff Brackets**: Visual representation of playoff progression and championship path

### Team Analysis
- **Franchise Data**: Historical team statistics, records, and accomplishments
- **Roster Analysis**: Evaluation of roster decisions, optimization scores, and missed opportunities
- **All-Pro Team**: Season-end recognition of top performers at each position

### Player Statistics
- **Player Performance Tracking**: Detailed statistics for each player across seasons
- **Position Analysis**: Breakdown of performance by position
- **NFL Context**: Connection to real NFL game performances

## Technical Details

### Architecture

The site is built using a modular JavaScript architecture with:
- Core service modules for data loading/processing
- UI components for specific features
- Central controllers for page coordination
- Data discovery system to work with existing files without hardcoding

### Data Structure

Data is organized in a hierarchical file structure:
```
/data/
  /season/{year}/
    season_data.json          # Season-level data
  /rosters/{year}/
    week_{number}_rosters.json # Weekly roster data
  /espn_game_stats/{year}/
    nfl_data_{year}_week_{week}.json # NFL game data
  /franchise/
    team_statistics.json      # Team historical data
  roster_rules.json           # League roster configuration
```

### Dynamic Data Discovery

The application uses sophisticated data discovery techniques to:
- Dynamically find available seasons without hardcoded ranges
- Probe for available weeks within seasons
- Adapt to changes in data structure or availability

### Key Components

1. **NFL Game Search & Details**: Browse and analyze NFL games with detailed statistics
2. **Game Details**: Comprehensive view of fantasy matchups with player performance
3. **Season Overview**: Dashboard for season-level performance and statistics
4. **Weekly Results**: Week-by-week breakdown of matchups and outcomes
5. **All-Pro Team Calculator**: Determine top performers across a season
6. **Franchise Statistics**: Historical team performance tracking

## Getting Started

### Prerequisites

- Web server with HTML/CSS/JavaScript support
- Data files organized according to the expected structure
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone or download the repository to your web server
2. Ensure the data files are correctly organized in the `/data` directory
3. Set up any required permissions for file access
4. Access the site via your web server's URL

### Data Requirements

For full functionality, you'll need:
1. Fantasy league game data
2. NFL game statistics (in the expected JSON format)
3. Roster configuration rules
4. Team information including names, logos, and abbreviations

## Development

### Technologies Used

- Vanilla JavaScript with modular patterns
- HTML5/CSS3 for structure and styling
- Fetch API for data loading
- JSON for data storage
- FontAwesome for icons
- Responsive design for multi-device support

### Adding Features

The codebase uses a modular approach where:
1. Service modules handle data loading and processing
2. UI components render specific features
3. Controllers coordinate page behavior

To add new features, follow this pattern and ensure your modules properly integrate with the existing data structure and event system.

### Customization

The site is designed to be easily customizable:
- Team information can be updated in relevant data files
- Roster rules can be modified in `roster_rules.json`
- Visual styling can be adjusted through CSS

## Troubleshooting

Common issues and solutions:
- **Missing Data**: The site uses fallbacks for missing data but will show errors if critical files are unavailable
- **Data Discovery**: If seasons or weeks aren't appearing, check file structure and naming conventions
- **Performance**: Large datasets may affect performance; consider optimizing JSON files

## Conclusion

This Fantasy Football League site provides a comprehensive platform for tracking, analyzing, and enjoying your fantasy football experience. With its integration of real NFL data and detailed analysis tools, it offers insights beyond traditional fantasy platforms while preserving your league's unique history and memorable moments.
