/**
 * Sock Tan Collective FFL - Standings Page JavaScript
 * 
 * This file handles functionality for the standings page including:
 * - Loading and displaying standings data
 * - Sorting and filtering standings
 * - Generating standings visualizations
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the standings page
    StandingsPage.init();
});

// Standings Page Module
const StandingsPage = (function() {
    // Private variables
    let _currentSeason = 'All Time';
    let _currentWeek = 'All';
    let _standings = [];
    let _tableElement = null;
    let _sortBy = 'winPct';
    let _sortDirection = 'desc';
    let _divisionStandings = {};
    
    // Initialize the page
    function _init() {
        console.log('Initializing standings page...');
        
        // Get DOM elements
        const standingsContainer = document.getElementById('standingsContainer');
        const seasonSelect = document.getElementById('seasonSelect');
        const weekSelect = document.getElementById('weekSelect');
        
        // Initialize loading state
        Utils.toggleLoading(true, standingsContainer);
        
        // Load data
        DataService.init()
            .then(() => {
                console.log('Data service initialized');
                // Data loaded successfully
                Utils.toggleLoading(false, standingsContainer);
                
                // Populate season dropdown
                _populateSeasonDropdown(seasonSelect);
                
                // Set initial season (from URL or default to most recent)
                const seasonParam = Utils.getUrlParameter('season');
                if (seasonParam) {
                    _currentSeason = seasonParam;
                } else {
                    // Get all seasons and find the most recent
                    const allSeasons = DataService.getAllSeasons();
                    if (allSeasons && allSeasons.length > 0) {
                        // Sort seasons (assuming they're numeric or comparable strings)
                        allSeasons.sort();
                        // Get the last (most recent) season
                        _currentSeason = allSeasons[allSeasons.length - 1];
                    } else {
                        _currentSeason = 'All Time';
                    }
                }
                console.log('Initial season:', _currentSeason);
                
                if (seasonSelect) {
                    // Ensure the value exists in the dropdown
                    const exists = Array.from(seasonSelect.options).some(option => option.value === _currentSeason);
                    seasonSelect.value = exists ? _currentSeason : 'All Time';
                    _currentSeason = seasonSelect.value; // In case it defaulted
                }
                
                // Populate week dropdown based on selected season
                _populateWeekDropdown(weekSelect, _currentSeason);
                
                // Set initial week (from URL or default to All)
                _currentWeek = Utils.getUrlParameter('week') || 'All';
                
                if (weekSelect) {
                    // Ensure the value exists in the dropdown
                    const exists = Array.from(weekSelect.options).some(option => option.value === _currentWeek);
                    weekSelect.value = exists ? _currentWeek : 'All';
                    _currentWeek = weekSelect.value; // In case it defaulted
                }
                
                // Calculate standings
                _calculateStandings();
                
                // Display standings
                _createStandingsDisplay(standingsContainer);
                
                // Add event listeners
                _addEventListeners(seasonSelect, weekSelect);
                
                console.log('Standings page initialized');
            })
            .catch(error => {
                console.error('Error initializing standings page:', error);
                Utils.toggleLoading(false, standingsContainer);
                
                // Display error message in the container
                if (standingsContainer) {
                    standingsContainer.innerHTML = `
                        <div class="error-message">
                            <p>Failed to load standings data. Please try refreshing the page.</p>
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                }
            });
    }
    
    // Populate season dropdown
    function _populateSeasonDropdown(select) {
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add "All Time" option
        const allTimeOption = document.createElement('option');
        allTimeOption.value = 'All Time';
        allTimeOption.textContent = 'All Time';
        select.appendChild(allTimeOption);
        
        // Add season options
        const seasons = DataService.getAllSeasons();
        
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season; // Display just the year, no "Season" prefix
            select.appendChild(option);
        });
    }
    
    // Populate week dropdown based on selected season
    function _populateWeekDropdown(select, season) {
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '';
        
        // If "All Time" is selected, disable the week dropdown
        if (season === 'All Time') {
            const option = document.createElement('option');
            option.value = 'All';
            option.textContent = 'All Weeks';
            select.appendChild(option);
            select.disabled = true;
            return;
        }
        
        // Enable the dropdown
        select.disabled = false;
        
        // Add "All Weeks" option
        const allWeeksOption = document.createElement('option');
        allWeeksOption.value = 'All';
        allWeeksOption.textContent = 'All Weeks';
        select.appendChild(allWeeksOption);
        
        // Get weeks for the selected season
        const weeks = DataService.getWeeksForSeason(season);
        
        weeks.forEach(week => {
            const option = document.createElement('option');
            option.value = week;
            option.textContent = `Week ${week}`;
            select.appendChild(option);
        });
    }
    
    // Calculate standings based on current season and week
    function _calculateStandings() {
        console.log(`Calculating standings for ${_currentSeason}, Week ${_currentWeek}`);
        
        // Reset division standings
        _divisionStandings = {};
        
        if (_currentSeason === 'All Time') {
            // Calculate all-time standings
            const allTeams = DataService.getAllTeams();
            _standings = allTeams.map(team => {
                const stats = DataService.calculateTeamStats(team);
                
                // Skip teams with no games
                if (!stats || stats.games === 0) return null;
                
                // Put all teams in one division with no name for All Time view
                const division = "";
                
                return {
                    team: team,
                    division: division,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.winPct,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.avgPointsFor,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.avgPointsAgainst,
                    pointDifferential: stats.pointDifferential,
                    avgPointDifferential: stats.avgPointDifferential,
                    games: stats.games,
                    streak: stats.currentStreakDisplay
                };
            }).filter(Boolean); // Remove null entries
        } else {
            // Calculate season standings up to the selected week
            _standings = DataService.calculateSeasonStandings(_currentSeason, _currentWeek) || [];
            console.log(`Got ${_standings.length} teams for ${_currentSeason}, Week ${_currentWeek}`);
            
            // Set division for each team
            _standings.forEach(team => {
                team.division = DataService.getTeamDivision(team.team, _currentSeason) || 'Unknown';
            });
        }
        
        // Group by division
        _standings.forEach(team => {
            const division = team.division || 'Unknown';
            if (!_divisionStandings[division]) {
                _divisionStandings[division] = [];
            }
            _divisionStandings[division].push(team);
        });
        
        // Sort each division
        for (const division in _divisionStandings) {
            _sortDivisionStandings(_divisionStandings[division]);
        }
        
        console.log('Standings calculated:', Object.keys(_divisionStandings).length, 'divisions');
    }
    
    // Sort standings within a division
    function _sortDivisionStandings(divisionTeams) {
        divisionTeams.sort((a, b) => {
            let aValue, bValue;
            
            switch (_sortBy) {
                case 'team':
                    aValue = a.team;
                    bValue = b.team;
                    return _sortDirection === 'asc' ? 
                        aValue.localeCompare(bValue) : 
                        bValue.localeCompare(aValue);
                    
                case 'wins':
                    aValue = a.wins;
                    bValue = b.wins;
                    break;
                    
                case 'losses':
                    aValue = a.losses;
                    bValue = b.losses;
                    break;
                    
                case 'winPct':
                    aValue = a.winPct;
                    bValue = b.winPct;
                    break;
                    
                case 'pointsFor':
                    aValue = a.avgPointsFor;
                    bValue = b.avgPointsFor;
                    break;
                    
                case 'pointsAgainst':
                    aValue = a.avgPointsAgainst;
                    bValue = b.avgPointsAgainst;
                    break;
                    
                case 'pointDiff':
                    aValue = a.avgPointDifferential;
                    bValue = b.avgPointDifferential;
                    break;
                    
                default:
                    aValue = a.winPct;
                    bValue = b.winPct;
            }
            
            // For numeric values
            return _sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
        
        // Add rank within division
        divisionTeams.forEach((team, index) => {
            team.rank = index + 1;
        });
    }
    
    // Create standings display
    function _createStandingsDisplay(container) {
        if (!container) {
            console.error('Standings container not found');
            return;
        }
        
        console.log('Creating standings display');
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add section title with current filters
        const title = document.createElement('h2');
        title.textContent = _getStandingsTitle();
        container.appendChild(title);
        
        // Create a section for each division
        for (const division in _divisionStandings) {
            const divisionSection = document.createElement('div');
            divisionSection.className = 'division-section';
            
            const divisionHeader = document.createElement('h3');
            divisionHeader.textContent = division || 'All Teams';
            divisionSection.appendChild(divisionHeader);
            
            // Create table
            const table = document.createElement('table');
            table.className = 'standings-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="rank">#</th>
                        <th data-sort="team" class="team-name">Team</th>
                        <th data-sort="winPct" class="record-cell">Record</th>
                        <th data-sort="winPct" class="win-pct">Win %</th>
                        <th data-sort="pointsFor" class="points-total">PF</th>
                        <th data-sort="pointsAgainst" class="points-total">PA</th>
                        <th data-sort="pointDiff" class="point-diff">+/-</th>
                        <th data-sort="pointsFor" class="points-for">PF/G</th>
                        <th data-sort="pointsAgainst" class="points-against">PA/G</th>
                        <th data-sort="pointDiff" class="point-diff">+/-/G</th>
                        <th class="streak">Streak</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            
            // Assign to class variable for sorting
            _tableElement = table;
            
            // Populate table body
            const tbody = table.querySelector('tbody');
            _displayDivisionStandings(_divisionStandings[division], tbody);
            
            divisionSection.appendChild(table);
            container.appendChild(divisionSection);
            
            // Initialize sorting for this table
            _initializeSorting(table);
        }
        
        // Display message if no standings
        if (Object.keys(_divisionStandings).length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No standings data available for the selected criteria.';
            container.appendChild(emptyMessage);
        }
        
        console.log('Standings display created');
    }
    
    // Get title based on current filters
    function _getStandingsTitle() {
        if (_currentSeason === 'All Time') {
            return 'All-Time Standings';
        } else if (_currentWeek === 'All') {
            return `${_currentSeason} Season Standings`;
        } else {
            return `${_currentSeason} Season, Week ${_currentWeek} Standings`;
        }
    }
    
    // Display standings for a division
    function _displayDivisionStandings(teams, tbody) {
        if (!tbody) return;
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Add row for each team
        teams.forEach(team => {
            const row = document.createElement('tr');
            
            // Create record span with color
            const recordColor = Utils.getRecordColor(team.wins, team.losses);
            const recordSpan = `<span class="record" style="color: ${recordColor};">${team.wins}-${team.losses}</span>`;
            
            // Create row content
            row.innerHTML = `
                <td class="rank">${team.rank}</td>
                <td class="team-name"><a href="franchise.html?team=${encodeURIComponent(team.team)}">${team.team}</a></td>
                <td class="record-cell">${recordSpan}</td>
                <td class="win-pct">${Utils.formatPercent(team.winPct)}</td>
                <td class="points-total">${Utils.formatNumber(team.pointsFor, 1)}</td>
                <td class="points-total">${Utils.formatNumber(team.pointsAgainst, 1)}</td>
                <td class="point-diff ${team.pointDifferential >= 0 ? 'positive' : 'negative'}">${team.pointDifferential > 0 ? '+' : ''}${Utils.formatNumber(team.pointDifferential, 1)}</td>
                <td class="points-for">${Utils.formatNumber(team.avgPointsFor, 1)}</td>
                <td class="points-against">${Utils.formatNumber(team.avgPointsAgainst, 1)}</td>
                <td class="point-diff ${team.avgPointDifferential >= 0 ? 'positive' : 'negative'}">${team.avgPointDifferential > 0 ? '+' : ''}${Utils.formatNumber(team.avgPointDifferential, 1)}</td>
                <td class="streak">${team.streak}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Display message if no standings
        if (teams.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="11" class="empty-message">No standings data available for this division.</td>
            `;
            tbody.appendChild(emptyRow);
        }
    }
    
    // Initialize sorting functionality for a table
    function _initializeSorting(table) {
        const headers = table.querySelectorAll('th[data-sort]');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortBy = header.getAttribute('data-sort');
                
                // If already sorting by this column, toggle direction
                if (sortBy === _sortBy) {
                    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // New sort column, default to descending except for team name
                    _sortBy = sortBy;
                    _sortDirection = sortBy === 'team' ? 'asc' : 'desc';
                }
                
                // Resort and redisplay
                for (const division in _divisionStandings) {
                    _sortDivisionStandings(_divisionStandings[division]);
                }
                
                // Refresh the display
                _createStandingsDisplay(document.getElementById('standingsContainer'));
            });
        });
    }
    
    // Add event listeners
    function _addEventListeners(seasonSelect, weekSelect) {
        if (seasonSelect) {
            seasonSelect.addEventListener('change', () => {
                _currentSeason = seasonSelect.value;
                console.log('Season changed to:', _currentSeason);
                
                // Update URL parameter
                Utils.setUrlParameter('season', _currentSeason === 'All Time' ? null : _currentSeason);
                
                // Reset week selection when season changes
                _currentWeek = 'All';
                Utils.setUrlParameter('week', null);
                
                // Update the week dropdown
                _populateWeekDropdown(weekSelect, _currentSeason);
                if (weekSelect) {
                    weekSelect.value = _currentWeek;
                }
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }
        
        if (weekSelect) {
            weekSelect.addEventListener('change', () => {
                _currentWeek = weekSelect.value;
                console.log('Week changed to:', _currentWeek);
                
                // Update URL parameter
                Utils.setUrlParameter('week', _currentWeek === 'All' ? null : _currentWeek);
                
                // Recalculate standings
                _calculateStandings();
                
                // Update display
                const standingsContainer = document.getElementById('standingsContainer');
                if (standingsContainer) {
                    _createStandingsDisplay(standingsContainer);
                } else {
                    console.error('Standings container not found when updating display');
                }
            });
        }
    }
    
    // Export public API
    return {
        init: _init
    };
})();
