// Injury Substitution form handling

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkAuthenticationStatus();
    
    // Get team and league IDs from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('team_id');
    const leagueId = urlParams.get('league_id');
    
    if (!teamId || !leagueId) {
        showError('Team ID and League ID are required');
        return;
    }
    
    // Load team data
    loadTeamData(teamId, leagueId);
    
    // Set up form submission handler
    const injurySubForm = document.getElementById('injury-sub-form');
    if (injurySubForm) {
        injurySubForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitInjurySubstitution(teamId, leagueId);
        });
    }
    
    // Set up change handlers for player selectors
    const injuredPlayerSelect = document.getElementById('injured-player');
    if (injuredPlayerSelect) {
        injuredPlayerSelect.addEventListener('change', updateSubstituteOptions);
    }
});

// Check if user is authenticated
function checkAuthenticationStatus() {
    // Check localStorage first for quick UI update
    const isAuthenticated = localStorage.getItem('ffl_authenticated') === 'true';
    
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    // Update UI based on stored user data
    const userData = JSON.parse(localStorage.getItem('ffl_user') || '{}');
    updateUserInfo(userData);
    
    // Verify with server
    fetch('../server/check_auth.php', {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.authenticated) {
            // If server says not authenticated, redirect to login
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        } else {
            // Update user info in UI with server data
            updateUserInfo(data.user);
        }
    })
    .catch(error => {
        console.error('Authentication check error:', error);
    });
}

// Update user info in the header
function updateUserInfo(user) {
    const userStatusContainer = document.querySelector('.user-status');
    
    if (userStatusContainer && user) {
        // Clear existing content
        userStatusContainer.innerHTML = '';
        
        // Show logged in user information and logout button
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = user.username;
        userInfo.appendChild(username);
        
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', logoutUser);
        
        userStatusContainer.appendChild(userInfo);
        userStatusContainer.appendChild(logoutBtn);
    }
}

// Logout user
function logoutUser() {
    fetch('../server/auth.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=logout'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear local storage
            localStorage.removeItem('ffl_authenticated');
            localStorage.removeItem('ffl_user');
            
            // Redirect to home page
            window.location.href = '../index.html';
        } else {
            console.error('Logout failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
    });
}

// Load team and lineup data
function loadTeamData(teamId, leagueId) {
    // Get current week lineup data
    const formData = new FormData();
    formData.append('action', 'get_lineup');
    formData.append('team_id', teamId);
    
    fetch('../server/lineup.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update team name
            document.getElementById('team-name').textContent = data.team.name;
            
            // Populate injured player options (only starters)
            const injuredPlayerSelect = document.getElementById('injured-player');
            injuredPlayerSelect.innerHTML = '<option value="">Select injured player...</option>';
            
            const starters = data.lineup.filter(player => player.is_starter);
            starters.forEach(player => {
                const option = document.createElement('option');
                option.value = player.player_id;
                option.textContent = `${player.first_name} ${player.last_name} (${player.player_position})`;
                option.dataset.position = player.player_position;
                option.dataset.lineupPosition = player.position;
                injuredPlayerSelect.appendChild(option);
            });
            
            // Populate substitute player options (only bench players)
            const substitutePlayerSelect = document.getElementById('substitute-player');
            substitutePlayerSelect.innerHTML = '<option value="">Select substitute player...</option>';
            
            const benchPlayers = data.lineup.filter(player => !player.is_starter);
            benchPlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.player_id;
                option.textContent = `${player.first_name} ${player.last_name} (${player.player_position})`;
                option.dataset.position = player.player_position;
                substitutePlayerSelect.appendChild(option);
            });
            
            // If no players on bench, disable substitute select
            if (benchPlayers.length === 0) {
                substitutePlayerSelect.disabled = true;
                substitutePlayerSelect.innerHTML = '<option value="">No bench players available</option>';
            }
            
            // Load active games for the current week
            loadActiveGames(data.week, data.year);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Load team data error:', error);
        showError('Failed to load team data. Please try again.');
    });
}

// Load active NFL games for injury substitution
function loadActiveGames(week, year) {
    // Get active NFL games
    const formData = new FormData();
    formData.append('action', 'get_week_games');
    formData.append('week', week);
    formData.append('year', year);
    
    fetch('../server/nfl_data.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Populate game selector with active or recently finished games
            const gameSelector = document.getElementById('game-selector');
            gameSelector.innerHTML = '<option value="">Select game...</option>';
            
            // Filter for games in progress or recently ended
            const currentTime = new Date().getTime();
            const activeGames = data.games.filter(game => {
                const gameTime = new Date(game.kickoff_time).getTime();
                const isActive = game.status === 'in_progress';
                const recentlyEnded = game.status === 'final' && (currentTime - gameTime < 3 * 60 * 60 * 1000); // 3 hours
                return isActive || recentlyEnded;
            });
            
            if (activeGames.length === 0) {
                gameSelector.innerHTML = '<option value="">No active games</option>';
                gameSelector.disabled = true;
                showError('There are no active games for injury substitutions at this time.');
                document.querySelector('.form-actions button').disabled = true;
            } else {
                activeGames.forEach(game => {
                    const option = document.createElement('option');
                    option.value = game.id;
                    option.textContent = `${game.home_team} vs ${game.away_team} - ${game.status === 'in_progress' ? 'In Progress' : 'Recently Ended'}`;
                    gameSelector.appendChild(option);
                });
            }
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Load games error:', error);
        showError('Failed to load NFL games. Please try again.');
    });
}

// Update substitute player options based on injured player selection
function updateSubstituteOptions() {
    const injuredPlayerSelect = document.getElementById('injured-player');
    const substitutePlayerSelect = document.getElementById('substitute-player');
    
    // If no injured player selected, reset substitute options
    if (!injuredPlayerSelect.value) {
        return;
    }
    
    // Get position of injured player
    const injuredPosition = injuredPlayerSelect.options[injuredPlayerSelect.selectedIndex].dataset.position;
    const lineupPosition = injuredPlayerSelect.options[injuredPlayerSelect.selectedIndex].dataset.lineupPosition;
    
    // Highlight compatible substitutes
    for (let i = 0; i < substitutePlayerSelect.options.length; i++) {
        const option = substitutePlayerSelect.options[i];
        if (option.value) {
            const substitutePosition = option.dataset.position;
            
            // Check if substitute position is compatible with injured player's lineup position
            const isCompatible = isPositionCompatible(substitutePosition, lineupPosition);
            
            if (isCompatible) {
                option.classList.add('compatible');
                option.classList.remove('incompatible');
            } else {
                option.classList.add('incompatible');
                option.classList.remove('compatible');
            }
        }
    }
}

// Check if a substitute player's position is compatible with a lineup position
function isPositionCompatible(playerPosition, lineupPosition) {
    // If lineup position is a standard position, must match exactly
    if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(lineupPosition)) {
        return playerPosition === lineupPosition;
    }
    
    // Handle FLEX positions
    if (lineupPosition === 'FLEX') {
        return ['RB', 'WR', 'TE'].includes(playerPosition);
    }
    
    // Handle SUPERFLEX positions
    if (lineupPosition === 'SUPERFLEX') {
        return ['QB', 'RB', 'WR', 'TE'].includes(playerPosition);
    }
    
    return false;
}

// Submit injury substitution request
function submitInjurySubstitution(teamId, leagueId) {
    const injuredPlayerId = document.getElementById('injured-player').value;
    const substitutePlayerId = document.getElementById('substitute-player').value;
    const gameId = document.getElementById('game-selector').value;
    
    // Validate inputs
    if (!injuredPlayerId || !substitutePlayerId || !gameId) {
        showError('All fields are required');
        return;
    }
    
    // Get the current week
    const week = new URLSearchParams(window.location.search).get('week') || new Date().getWeek();
    const year = new Date().getFullYear();
    
    // Create form data
    const formData = new FormData();
    formData.append('action', 'submit_injury_sub');
    formData.append('team_id', teamId);
    formData.append('league_id', leagueId);
    formData.append('injured_player_id', injuredPlayerId);
    formData.append('substitute_player_id', substitutePlayerId);
    formData.append('game_id', gameId);
    formData.append('week', week);
    formData.append('year', year);
    
    // Submit the request
    fetch('../server/lineup.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(data.message);
            
            // Disable form after successful submission
            document.getElementById('injury-sub-form').querySelectorAll('select, button').forEach(el => {
                el.disabled = true;
            });
            
            // Add a link to return to lineup page
            const successMessage = document.getElementById('success-message');
            const returnLink = document.createElement('a');
            returnLink.href = `lineup.html?team_id=${teamId}`;
            returnLink.textContent = 'Return to Lineup';
            returnLink.className = 'btn btn-primary';
            returnLink.style.marginTop = '10px';
            returnLink.style.display = 'inline-block';
            successMessage.appendChild(document.createElement('br'));
            successMessage.appendChild(returnLink);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        showError('An error occurred while submitting the request. Please try again.');
    });
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide success message if showing
    document.getElementById('success-message').style.display = 'none';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Hide error message if showing
    document.getElementById('error-message').style.display = 'none';
}

// Helper method to get current NFL week (add to Date prototype)
Date.prototype.getWeek = function() {
    // NFL season typically starts around week 1 of September
    const currentYear = this.getFullYear();
    const currentMonth = this.getMonth() + 1; // JavaScript months are 0-based
    const currentDay = this.getDate();
    
    // If we're before September, we're in preseason/offseason
    if (currentMonth < 9) {
        return 1;
    }
    
    // Otherwise calculate the week based on the current date
    // NFL season typically starts around Sept 7-10
    const seasonStartDay = 8; // Approximate average start date
    
    if (currentMonth == 9) {
        const daysSinceStart = currentDay - seasonStartDay;
        if (daysSinceStart < 0) return 1; // Before season starts
        
        return Math.floor(daysSinceStart / 7) + 1;
    } else if (currentMonth == 10) {
        return Math.floor((currentDay + (30 - seasonStartDay)) / 7) + 1;
    } else if (currentMonth == 11) {
        return Math.floor((currentDay + (30 - seasonStartDay) + 31) / 7) + 1;
    } else if (currentMonth == 12) {
        return Math.floor((currentDay + (30 - seasonStartDay) + 31 + 30) / 7) + 1;
    } else {
        // January or later (playoffs)
        return 18; // Regular season is over
    }
};
