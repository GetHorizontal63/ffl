/**
 * RChos Fantasy Football League - Data Service
 * 
 * This module handles all data operations including:
 * - Loading league data
 * - Data caching
 * - Providing data access methods
 * - Statistical calculations
 */

const DataService = (function() {
    // Split large data into chunks for better loading
    const DATA_CONFIG = {
        // Core data (small files) - keep in main repo
        core: {
            baseUrl: 'https://raw.githubusercontent.com/GetHorizontal63/ffl_assets/main/data/',
            files: {
                teamAbbreviations: 'team_abbreviations.json',
                leagueConfig: 'league_config.json'
            }
        },
        
        // Large data (chunked) - separate repository or hosting
        chunks: {
            baseUrl: 'https://raw.githubusercontent.com/GetHorizontal63/ffl_data/main/',
            files: {
                leagueScores: (year) => `league_scores_${year}.json`, // Split by year
                seasonData: (year) => `season/${year}/season_data.json`,
                rosterData: (year, chunk) => `rosters/${year}/chunk_${chunk}.json` // Split large rosters
            }
        }
    };
    
    // Lazy loading for large datasets
    async function fetchLargeDataset(dataType, params = []) {
        // Only load data when specifically requested
        // Implement pagination/chunking for very large files
        
        console.log(`Loading large dataset: ${dataType}`);
        // Show loading indicator for large data
        
        const chunks = await fetchDataChunks(dataType, params);
        return mergechunks(chunks);
    }
    
    // Private variables
    let _leagueData = null;
    let _divisionData = null;  // Add variable for division data
    let _isDataLoaded = false;
    let _isDivisionsLoaded = false;  // Track division data loading
    let _lastLoaded = null;
    let _dataListeners = [];
    let _isLoading = false; // Track loading state
    let _loadError = null;  // Store any loading error

    // Configuration
    const _config = {
        dataPath: '../Data/league_score_data.json',
        divisionsPath: '../Data/divisions.json',  // Add path for divisions.json
        cacheExpiration: 30 * 60 * 1000, // 30 minutes in milliseconds
        useLocalStorage: true,
        storageKey: 'rchosffl_data',
        divisionsStorageKey: 'rchosffl_divisions'  // Add storage key for divisions
    };
    
    // Cache for loaded data with size limits
    const dataCache = new Map();
    const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB cache limit
    let currentCacheSize = 0;
    
    // Store data in localStorage
    const _storeData = function() {
        if (!_config.useLocalStorage) return;
        
        try {
            localStorage.setItem(_config.storageKey, JSON.stringify({
                data: _leagueData,
                timestamp: _lastLoaded
            }));
        } catch (error) {
            console.warn('Failed to store data in localStorage:', error);
        }
    };
    
    // Get stored data from localStorage
    const _getStoredData = function() {
        if (!_config.useLocalStorage) return null;
        
        try {
            const stored = localStorage.getItem(_config.storageKey);
            if (!stored) return null;
            
            const parsedData = JSON.parse(stored);
            const now = new Date().getTime();
            
            // Check if data is still valid
            if (now - parsedData.timestamp <= _config.cacheExpiration) {
                return parsedData;
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to retrieve data from localStorage:', error);
            return null;
        }
    };
    
    // Notify all listeners that data has been loaded
    const _notifyListeners = function() {
        _dataListeners.forEach(listener => {
            try {
                listener(_leagueData);
            } catch (error) {
                console.error('Error in data listener:', error);
            }
        });
    };
    
    // Parse raw data and perform any necessary transformations
    const _parseData = function(rawData) {
        // Normalize the data
        if (rawData && rawData.length > 0) {
            // Create a structured format for the app
            const leagueData = {
                league_data: {
                    seasons: []
                }
            };
            
            // Group by season
            const seasonGroups = {};
            
            rawData.forEach(game => {
                // Convert season to string for consistency
                const season = String(game.Season);
                
                // Initialize season if not exists
                if (!seasonGroups[season]) {
                    seasonGroups[season] = {
                        season: season,
                        weeks: {}
                    };
                }
                
                // Convert week to string
                const week = String(game.Week);
                
                // Initialize week if not exists
                if (!seasonGroups[season].weeks[week]) {
                    seasonGroups[season].weeks[week] = {
                        week: week,
                        league_week: String(game["League Week"]),
                        season_period: game["Season Period"],
                        games: []
                    };
                }
                
                // Parse all numeric fields
                const teamScore = parseFloat(game["Team Score"]);
                const opponentScore = parseFloat(game["Opponent Score"]);
                
                // Parse score diff, handling the case where it might be a string with quotes
                let scoreDiff = game["Score Diff"];
                if (typeof scoreDiff === 'string') {
                    // Remove any quotes from string
                    scoreDiff = scoreDiff.replace(/["']/g, '');
                }
                scoreDiff = parseFloat(scoreDiff);
                
                // Add game to the week
                seasonGroups[season].weeks[week].games.push({
                    team: game.Team,
                    opponent: game.Opponent,
                    team_score: teamScore,
                    opponent_score: opponentScore,
                    score_diff: scoreDiff,
                    game_id: game["Game ID"]
                });
            });
            
            // Convert to arrays for easier processing
            Object.values(seasonGroups).forEach(season => {
                const weekArray = Object.values(season.weeks);
                season.weeks = weekArray;
                leagueData.league_data.seasons.push(season);
            });
            
            return leagueData;
        }
        
        // Return original data if parsing fails
        return rawData;
    };
    
    // Process raw data into a more structured format
    const _processRawData = function(rawData) {
        // This is just a wrapper for _parseData to ensure backward compatibility
        return _parseData(rawData);
    };
    
    // Load division data
    const _loadDivisionData = async function() {
        try {
            // Check if we have recent data in storage
            if (_config.useLocalStorage) {
                const stored = localStorage.getItem(_config.divisionsStorageKey);
                if (stored) {
                    const parsedData = JSON.parse(stored);
                    const now = new Date().getTime();
                    
                    if (now - parsedData.timestamp <= _config.cacheExpiration) {
                        console.log('Using cached division data');
                        _divisionData = parsedData.data;
                        _isDivisionsLoaded = true;
                        return _divisionData;
                    }
                }
            }
            
            // Use XMLHttpRequest for local file access
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', _config.divisionsPath, true);
                xhr.responseType = 'json';
                
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        // Store division data
                        _divisionData = xhr.response;
                        _isDivisionsLoaded = true;
                        _lastLoaded = new Date().getTime();
                        
                        // Cache in localStorage
                        if (_config.useLocalStorage) {
                            try {
                                localStorage.setItem(_config.divisionsStorageKey, JSON.stringify({
                                    data: _divisionData,
                                    timestamp: _lastLoaded
                                }));
                            } catch (error) {
                                console.warn('Failed to store division data in localStorage:', error);
                            }
                        }
                        
                        console.log('Division data loaded successfully');
                        resolve(_divisionData);
                    } else {
                        const error = new Error(`Failed to load division data: ${xhr.status}`);
                        console.error(error);
                        reject(error);
                    }
                };
                
                xhr.onerror = function() {
                    const error = new Error('Network error while loading division data');
                    console.error(error);
                    reject(error);
                };
                
                xhr.send();
            });
        } catch (error) {
            console.error('Error loading division data:', error);
            throw error;
        }
    };

    // Calculate team statistics for all teams
    const _calculateAllTeamStats = function(seasonFilter = null) {
        const teams = module.getAllTeams();
        const allStats = {};
        
        teams.forEach(team => {
            allStats[team] = module.calculateTeamStats(team, seasonFilter);
        });
        
        return allStats;
    };
    
    // Initialize and load data
    function _loadData() {
        _isLoading = true;
        
        // Clear any existing error
        _loadError = null;
        
        // Specify the exact file path
        const dataFilePath = '../Data/league_score_data.json';
        console.log('Loading league data from:', dataFilePath);
        
        // Fetch the data
        fetch(dataFilePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                // Store the loaded data
                _leagueData = data;
                _isDataLoaded = true;
                _isLoading = false;
                
                console.log('League data loaded successfully');
                
                // Process the raw data into a more usable format
                _leagueData = _processRawData(data);
                
                // Dispatch an event to notify that data is loaded
                const dataLoadedEvent = new CustomEvent('dataLoaded');
                document.dispatchEvent(dataLoadedEvent);
                
                console.log('League data processed and ready');
            })
            .catch(error => {
                _loadError = error.message;
                _isLoading = false;
                console.error('Error loading league data:', error);
            });
    }

    // Public API
    const module = {
        // Initialize the data service
        init: async function(options = {}) {
            // Override default config with options
            Object.assign(_config, options);
            
            console.log('Initializing DataService with config:', _config);
            
            // Load data
            try {
                // Load both league data and division data in parallel
                await Promise.all([
                    this.loadData(),
                    _loadDivisionData()
                ]);
                console.log('DataService initialized successfully');
                return _leagueData;
            } catch (error) {
                console.error('Error initializing data service:', error);
                throw error;
            }
        },
        
        // Load league data
        loadData: async function() {
            try {
                console.log('Loading league data from path:', _config.dataPath);
                
                // Check if we have recent data in storage
                const storedData = _getStoredData();
                if (storedData) {
                    console.log('Using cached league data');
                    _leagueData = storedData.data;
                    _isDataLoaded = true;
                    _lastLoaded = storedData.timestamp;
                    _notifyListeners();
                    return _leagueData;
                }
                
                // Use XMLHttpRequest instead of fetch for local file access
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', _config.dataPath, true);
                    xhr.responseType = 'json';
                    
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            // Parse and store data
                            _leagueData = _parseData(xhr.response);
                            _isDataLoaded = true;
                            _lastLoaded = new Date().getTime();
                            
                            // Cache in localStorage
                            _storeData();
                            
                            console.log('League data loaded successfully');
                            
                            // Notify listeners
                            _notifyListeners();
                            
                            resolve(_leagueData);
                        } else {
                            const error = new Error(`Failed to load data: ${xhr.status}`);
                            console.error(error);
                            reject(error);
                        }
                    };
                    
                    xhr.onerror = function() {
                        const error = new Error('Network error while loading data');
                        console.error(error);
                        reject(error);
                    };
                    
                    xhr.send();
                });
            } catch (error) {
                console.error('Error loading league data:', error);
                throw error;
            }
        },
        
        // Check if data is loaded
        isDataLoaded: function() {
            return _isDataLoaded;
        },
        
        /**
         * Get the division a team belongs to in a specific season
         * @param {string} team - The team name
         * @param {string|null} season - The season to check (null or undefined will use latest season)
         * @returns {string} - Division name or null if not found
         */
        getTeamDivision: function(team, season) {
            if (!team) return null;
            
            try {
                // If no season specified, use most recent season
                if (!season) {
                    season = this.getMostRecentSeason();
                } else if (season === 'All Time') {
                    // For 'All Time', just return empty string
                    return '';
                }
                
                // Get division data from loaded data
                const divisionData = _divisionData || {};
                const seasonDivisions = divisionData[season] || {};
                
                // Look through all divisions to find the team
                for (const [divisionName, teams] of Object.entries(seasonDivisions)) {
                    if (Array.isArray(teams) && teams.includes(team)) {
                        return divisionName;
                    }
                }
                
                return 'Unknown';
            } catch (error) {
                console.error(`Error getting division for team ${team} in season ${season}:`, error);
                return 'Unknown';
            }
        },
        
        /**
         * Get divisions from the most recent season
         * @returns {Array} - Array of division objects with name and teams
         */
        getLatestDivisions: function() {
            const latestSeason = this.getMostRecentSeason();
            if (!latestSeason) return [];
            
            const divisionData = _divisionData || {};
            const seasonDivisions = divisionData[latestSeason] || {};
            
            return Object.entries(seasonDivisions).map(([name, teams]) => ({
                name: name,
                teams: teams || []
            }));
        },
        
        /**
         * Get most recent season from the data
         * @returns {string} - Season identifier
         */
        getMostRecentSeason: function() {
            if (!_leagueData || !_leagueData.league_data || !_leagueData.league_data.seasons) {
                return null;
            }
            
            const seasons = _leagueData.league_data.seasons;
            if (seasons.length === 0) return null;
            
            // Find the highest season number
            let mostRecent = seasons[0].season;
            
            seasons.forEach(season => {
                if (parseInt(season.season) > parseInt(mostRecent)) {
                    mostRecent = season.season;
                }
            });
            
            return mostRecent;
        },
        
        /**
         * Get the raw loaded data for direct access
         * @returns {Object} - The raw data object
         */
        getRawData: function() {
            return {
                league_data: _leagueData?.league_data || null,
                divisions: _divisionData || null
            };
        },

        // Add a listener for data load events
        addDataListener: function(callback) {
            if (typeof callback === 'function') {
                _dataListeners.push(callback);
                
                // If data is already loaded, call the listener immediately
                if (_isDataLoaded) {
                    callback(_leagueData);
                }
            }
        },
        
        // Remove a data listener
        removeDataListener: function(callback) {
            const index = _dataListeners.indexOf(callback);
            if (index !== -1) {
                _dataListeners.splice(index, 1);
            }
        },
        
        // Clear cached data
        clearCache: function() {
            if (_config.useLocalStorage) {
                localStorage.removeItem(_config.storageKey);
                localStorage.removeItem(_config.divisionsStorageKey);  // Clear divisions cache
            }
            
            _leagueData = null;
            _divisionData = null;  // Clear division data
            _isDataLoaded = false;
            _isDivisionsLoaded = false;  // Reset divisions loading flag
            _lastLoaded = null;
        },
        
        // Get all teams from the data
        getAllTeams: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const teamsSet = new Set();
            
            _leagueData.league_data.seasons.forEach(season => {
                season.weeks.forEach(week => {
                    week.games.forEach(game => {
                        if (game.team !== 'Bye') teamsSet.add(game.team);
                        if (game.opponent !== 'Bye') teamsSet.add(game.opponent);
                    });
                });
            });
            
            return Array.from(teamsSet).sort();
        },
        
        // Get all seasons from the data
        getAllSeasons: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const seasonsSet = new Set();
            
            _leagueData.league_data.seasons.forEach(season => {
                seasonsSet.add(season.season);
            });
            
            return Array.from(seasonsSet).sort();
        },
        
        // Get data for a specific season
        getSeason: function(seasonYear) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            return _leagueData.league_data.seasons.find(s => s.season === seasonYear) || null;
        },
        
        // Get all weeks for a specific season
        getSeasonWeeks: function(seasonYear) {
            const season = this.getSeason(seasonYear);
            if (!season) return [];
            
            return [...season.weeks].sort((a, b) => parseInt(a.week) - parseInt(b.week));
        },

        // Get all weeks for a specific season
        getWeeksForSeason: function(season) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const seasonData = _leagueData.league_data.seasons.find(s => s.season == season);
            if (!seasonData) return [];
            
            return seasonData.weeks.map(week => week.week);
        },
        
        // Get games for a specific week
        getGamesForWeek: function(season, week) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const seasonData = _leagueData.league_data.seasons.find(s => s.season == season);
            if (!seasonData) return [];
            
            const weekData = seasonData.weeks.find(w => w.week == week);
            if (!weekData) return [];
            
            return weekData.games;
        },
        
        // Calculate overall season stats
        calculateSeasonStats: function(season) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const seasonData = _leagueData.league_data.seasons.find(s => s.season == season);
            if (!seasonData) return null;
            
            let totalGames = 0;
            let totalPoints = 0;
            let highestScore = 0;
            let lowestScore = Number.MAX_VALUE;
            let closestGame = Number.MAX_VALUE;
            let biggestBlowout = 0;
            
            seasonData.weeks.forEach(week => {
                week.games.forEach(game => {
                    if (game.team !== 'Bye' && game.opponent !== 'Bye') {
                        totalGames++;
                        
                        const teamScore = parseFloat(game.team_score);
                        const opponentScore = parseFloat(game.opponent_score);
                        
                        totalPoints += teamScore;
                        
                        // Track highest/lowest scores
                        highestScore = Math.max(highestScore, teamScore);
                        lowestScore = Math.min(lowestScore, teamScore);
                        
                        // Track game margins
                        const scoreDiff = Math.abs(teamScore - opponentScore);
                        closestGame = Math.min(closestGame, scoreDiff);
                        biggestBlowout = Math.max(biggestBlowout, scoreDiff);
                    }
                });
            });
            
            return {
                season: season,
                games: totalGames,
                totalPoints: totalPoints,
                avgScore: totalGames > 0 ? totalPoints / totalGames : 0,
                highestScore: highestScore,
                lowestScore: lowestScore === Number.MAX_VALUE ? 0 : lowestScore,
                closestGame: closestGame === Number.MAX_VALUE ? 0 : closestGame,
                biggestBlowout: biggestBlowout
            };
        },
        
        // Get league leaders
        getLeagueLeaders: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const teams = this.getAllTeams();
            if (!teams || teams.length === 0) return null;
            
            const teamStats = teams.map(team => {
                const stats = this.calculateTeamStats(team);
                if (!stats || stats.games === 0) return null;
                
                return {
                    team: team,
                    games: stats.games,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.winPct,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.avgPointsFor
                };
            }).filter(Boolean);
            
            // Sort for different categories
            const pointsLeaders = [...teamStats].sort((a, b) => b.pointsFor - a.pointsFor);
            const winsLeaders = [...teamStats].sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return b.winPct - a.winPct;
            });
            
            return {
                pointsLeaders: pointsLeaders,
                winsLeaders: winsLeaders
            };
        },
        
        // Calculate team statistics
        calculateTeamStats: function(team, seasonFilter = null) {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return null;
            }
            
            const stats = {
                team: team,
                games: 0,
                wins: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                highestScore: 0,
                lowestScore: Infinity,
                seasons: new Set(),
                currentStreak: 0,
                streakType: null,
                longestWinStreak: 0,
                longestLossStreak: 0,
                gameLog: []
            };
            
            // Sort seasons chronologically 
            const sortedSeasons = [..._leagueData.league_data.seasons]
                .sort((a, b) => parseInt(a.season) - parseInt(b.season));
                
            // Process each season
            sortedSeasons.forEach(season => {
                // Apply season filter if present
                if (seasonFilter && season.season !== seasonFilter) {
                    return;
                }
                
                // Sort weeks chronologically
                const sortedWeeks = [...season.weeks]
                    .sort((a, b) => parseInt(a.week) - parseInt(b.week));
                    
                // Process each week
                sortedWeeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Only process games for the requested team
                        if (game.team !== team) {
                            return;
                        }
                        
                        // Update basic stats
                        stats.games++;
                        stats.seasons.add(season.season);
                        stats.pointsFor += parseFloat(game.team_score);
                        stats.pointsAgainst += parseFloat(game.opponent_score);
                        
                        // Track highest/lowest scores
                        stats.highestScore = Math.max(stats.highestScore, parseFloat(game.team_score));
                        stats.lowestScore = Math.min(stats.lowestScore, parseFloat(game.team_score));
                        
                        // Add to game log
                        stats.gameLog.push({
                            season: season.season,
                            week: week.week,
                            seasonPeriod: week.season_period,
                            opponent: game.opponent,
                            teamScore: parseFloat(game.team_score),
                            opponentScore: parseFloat(game.opponent_score),
                            scoreDiff: parseFloat(game.score_diff),
                            result: parseFloat(game.score_diff) > 0 ? 'W' : 'L'
                        });
                        
                        // Update win/loss and streaks
                        if (parseFloat(game.score_diff) > 0) {
                            stats.wins++;
                            
                            // Update streaks
                            if (stats.streakType === 'W') {
                                stats.currentStreak++;
                            } else {
                                stats.streakType = 'W';
                                stats.currentStreak = 1;
                            }
                            
                            // Update longest win streak
                            stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
                        } else {
                            stats.losses++;
                            
                            // Update streaks
                            if (stats.streakType === 'L') {
                                stats.currentStreak++;
                            } else {
                                stats.streakType = 'L';
                                stats.currentStreak = 1;
                            }
                            
                            // Update longest loss streak
                            stats.longestLossStreak = Math.max(stats.longestLossStreak, stats.currentStreak);
                        }
                    });
                });
            });
            
            // Calculate derived stats
            stats.winPct = stats.games > 0 ? stats.wins / stats.games : 0;
            stats.avgPointsFor = stats.games > 0 ? stats.pointsFor / stats.games : 0;
            stats.avgPointsAgainst = stats.games > 0 ? stats.pointsAgainst / stats.games : 0;
            stats.pointDifferential = stats.pointsFor - stats.pointsAgainst;
            stats.avgPointDifferential = stats.games > 0 ? stats.pointDifferential / stats.games : 0;
            stats.seasons = Array.from(stats.seasons).sort();
            
            // Count 200+ point games
            stats.games200Plus = stats.gameLog.filter(game => game.teamScore >= 200).length;
            
            // Fix lowest score if no games played
            if (stats.lowestScore === Infinity) {
                stats.lowestScore = 0;
            }
            
            // Format current streak for display
            stats.currentStreakDisplay = stats.currentStreak > 0 ? 
                `${stats.currentStreak}${stats.streakType}` : 'None';
            
            return stats;
        },
        
        // Calculate all team stats
        calculateAllTeamStats: function(seasonFilter = null) {
            return _calculateAllTeamStats(seasonFilter);
        },
        
        // Calculate season standings for a specific season and week
        calculateSeasonStandings: function(season, week = 'All') {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            // Get all teams
            const teams = this.getAllTeams();
            
            // Get the season data
            const seasonData = this.getSeason(season);
            if (!seasonData) return [];
            
            // Calculate stats for each team in the season up to the selected week
            const teamStats = {};
            
            // Filter weeks based on the week filter
            let weeksToInclude = [...seasonData.weeks]; 
            
            if (week !== 'All') {
                // Only include weeks up to and including the selected week
                weeksToInclude = weeksToInclude.filter(weekData => 
                    parseInt(weekData.week) <= parseInt(week)
                );
            }
            
            // Sort weeks chronologically
            weeksToInclude.sort((a, b) => parseInt(a.week) - parseInt(b.week));
            
            // Process each team
            teams.forEach(team => {
                // Initialize team stats
                teamStats[team] = {
                    team: team,
                    division: this.getTeamDivision(team, season),
                    wins: 0,
                    losses: 0,
                    pointsFor: 0,
                    pointsAgainst: 0,
                    games: 0,
                    currentStreak: 0,
                    streakType: null
                };
                
                // Process each week's games for this team
                weeksToInclude.forEach(week => {
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Only process games where this team participated
                        if (game.team === team) {
                            // Update basic stats
                            teamStats[team].games++;
                            teamStats[team].pointsFor += parseFloat(game.team_score);
                            teamStats[team].pointsAgainst += parseFloat(game.opponent_score);
                            
                            // Update win/loss and streaks
                            if (parseFloat(game.score_diff) > 0) {
                                teamStats[team].wins++;
                                
                                // Update streak
                                if (teamStats[team].streakType === 'W') {
                                    teamStats[team].currentStreak++;
                                } else {
                                    teamStats[team].streakType = 'W';
                                    teamStats[team].currentStreak = 1;
                                }
                            } else {
                                teamStats[team].losses++;
                                
                                // Update streak
                                if (teamStats[team].streakType === 'L') {
                                    teamStats[team].currentStreak++;
                                } else {
                                    teamStats[team].streakType = 'L';
                                    teamStats[team].currentStreak = 1;
                                }
                            }
                        }
                    });
                });
                
                // Calculate derived stats
                teamStats[team].winPct = teamStats[team].games > 0 ? 
                    teamStats[team].wins / teamStats[team].games : 0;
                teamStats[team].avgPointsFor = teamStats[team].games > 0 ? 
                    teamStats[team].pointsFor / teamStats[team].games : 0;
                teamStats[team].avgPointsAgainst = teamStats[team].games > 0 ? 
                    teamStats[team].pointsAgainst / teamStats[team].games : 0;
                teamStats[team].pointDifferential = 
                    teamStats[team].pointsFor - teamStats[team].pointsAgainst;
                teamStats[team].avgPointDifferential = teamStats[team].games > 0 ? 
                    teamStats[team].pointDifferential / teamStats[team].games : 0;
                teamStats[team].currentStreakDisplay = teamStats[team].currentStreak > 0 ? 
                    `${teamStats[team].currentStreak}${teamStats[team].streakType}` : 'None';
            });
            
            // Create standings array from teams with at least one game
            const standings = Object.values(teamStats)
                .filter(stats => stats.games > 0)
                .map(stats => ({
                    team: stats.team,
                    division: stats.division,
                    wins: stats.wins,
                    losses: stats.losses,
                    winPct: stats.winPct,
                    pointsFor: stats.pointsFor,
                    avgPointsFor: stats.avgPointsFor,
                    pointsAgainst: stats.pointsAgainst,
                    avgPointsAgainst: stats.avgPointsAgainst,
                    pointDifferential: stats.pointDifferential,
                    avgPointDifferential: stats.avgPointDifferential,
                    streak: stats.currentStreakDisplay
                }));
            
            return standings;
        },
        
        // Find games where teams scored 200+ points
        find200ClubMembers: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const club200Members = [];
            
            // Sort seasons chronologically 
            const sortedSeasons = [..._leagueData.league_data.seasons]
                .sort((a, b) => parseInt(a.season) - parseInt(b.season));
                
            // Process each season
            sortedSeasons.forEach(season => {
                // Sort weeks chronologically
                const sortedWeeks = [...season.weeks]
                    .sort((a, b) => parseInt(a.week) - parseInt(b.week));
                    
                // Process each week
                sortedWeeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Check if the team score is 200 or higher
                        if (parseFloat(game.team_score) >= 200) {
                            club200Members.push({
                                team: game.team,
                                opponent: game.opponent,
                                teamScore: parseFloat(game.team_score),
                                opponentScore: parseFloat(game.opponent_score),
                                season: season.season,
                                week: week.week,
                                seasonOrder: parseInt(season.season), // For sorting by season
                                weekOrder: parseInt(week.week)        // For sorting by week
                            });
                        }
                    });
                });
            });
            
            return club200Members;
        },
        
        // Get all scores from all games
        getAllScores: function() {
            if (!_isDataLoaded || !_leagueData || !_leagueData.league_data) {
                return [];
            }
            
            const allScores = [];
            
            // Process each season
            _leagueData.league_data.seasons.forEach(season => {
                // Process each week
                season.weeks.forEach(week => {
                    // Process each game
                    week.games.forEach(game => {
                        // Skip games against "Bye"
                        if (game.team === 'Bye' || game.opponent === 'Bye') {
                            return;
                        }
                        
                        // Add team scores to the array
                        allScores.push(parseFloat(game.team_score));
                    });
                });
            });
            
            return allScores;
        },
        
        // Utility: Format number with commas
        formatNumber: function(number) {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        // Utility: Format as percentage
        formatPercent: function(number, decimals = 1) {
            return (number * 100).toFixed(decimals) + '%';
        },
        
        // Utility: Get color for win/loss records
        getRecordColor: function(wins, losses) {
            if (wins === 0 && losses === 0) return '#6b7280'; // Gray for no games
            
            const winPct = wins / (wins + losses);
            
            if (winPct >= 0.7) return '#10b981'; // Green for good records
            if (winPct >= 0.5) return '#3b82f6'; // Blue for winning records
            if (winPct >= 0.3) return '#f59e0b'; // Yellow/orange for below .500
            return '#ef4444'; // Red for poor records
        },
        
        // Utility: Sort teams by various criteria
        sortTeams: function(teams, sortBy, direction = 'desc') { the largest Game ID
            const sortFunctions = {
                name: (a, b) => a.team.localeCompare(b.team),oaded || !_leagueData || !_leagueData.league_data) {
                wins: (a, b) => b.wins - a.wins,null;
                losses: (a, b) => b.losses - a.losses,
                winPct: (a, b) => b.winPct - a.winPct,
                pointsFor: (a, b) => b.pointsFor - a.pointsFor,let maxGameId = 0;
                pointsAgainst: (a, b) => b.pointsAgainst - a.pointsAgainst,RecentWeek = null;
                pointDiff: (a, b) => (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)ll;
            };
             Iterate through all seasons and weeks to find the largest Game ID
            const sortFunction = sortFunctions[sortBy] || sortFunctions.winPct;   _leagueData.league_data.seasons.forEach(season => {
            let sorted = [...teams].sort(sortFunction);          season.weeks.forEach(week => {
                            week.games.forEach(game => {
            // Reverse if ascending order requested      const gameId = parseInt(game.game_id);
            if (direction === 'asc') {                   if (gameId > maxGameId) {
                sorted.reverse();                            maxGameId = gameId;
            }
            season;
            return sorted;
        },                   });
                            maxGameId = gameId;                });






















}    module.exports = DataService;if (typeof module !== 'undefined' && module.exports) {// Export the DataService module for use in Node.js environments})();    return module;        };        }            };                season: mostRecentSeason                week: mostRecentWeek,            return {                        });                });                    });                        }                            mostRecentSeason = season.season;                            mostRecentWeek = week.week;            });
            
            return {
                week: mostRecentWeek,
                season: mostRecentSeason
            };
        },
        
        // GitHub LFS data fetching
        init: () => Promise.resolve(), // No initialization needed for GitHub LFS
        fetchLeagueScores: () => fetchData('leagueScores'),
        fetchTeamAbbreviations: () => fetchData('teamAbbreviations'),
        fetchSeasonData: (year) => fetchData('seasonData', [year]),
        fetchRosterData: (year, week) => fetchData('rosterData', [year, week]),
        clearCache: () => {
            dataCache.clear();
            currentCacheSize = 0;
        }
    };
    
    return module;
})();

// Export the DataService module for use in Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}
