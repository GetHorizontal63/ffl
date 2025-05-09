// League Players Page Functionality

// Global variables
let currentLeagueId = 0;
let currentPage = 1;
let totalPages = 1;
let playersPerPage = 25;
let myTeams = [];
let leagueData = null;
let selectedPlayerId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkAuthenticationStatus();
    
    // Get league ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');
    
    if (!leagueId) {
        showError('League ID is required');
        return;
    }
    
    // Load league info and players
    loadLeagueInfo(leagueId);
    loadPlayers(leagueId);
    
    // Set up event listeners for filters
    setupFilters();
    
    // Set up pagination controls
    setupPagination();
    
    // Set up add player modal
    setupAddPlayerModal();
});

// Check authentication status with server
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

// Load league information
function loadLeagueInfo(leagueId) {
    const formData = new FormData();
    formData.append('action', 'get_league_details');
    formData.append('league_id', leagueId);
    
    fetch('../server/league.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update league name and other details
            document.getElementById('league-name').textContent = data.league.name;
            
            // Set league homepage link
            const leagueHomepageLink = document.getElementById('league-homepage');
            if (leagueHomepageLink) {
                leagueHomepageLink.href = `league.html?id=${leagueId}`;
            }
            
            // Store user's teams in this league for later use
            window.userTeamsInLeague = data.teams.filter(team => team.is_my_team);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Error loading league info:', error);
        showError('Failed to load league information');
    });
}

// Load players with filtering
function loadPlayers(leagueId, page = 1) {
    // Show loading state
    const playersTableBody = document.getElementById('players-tbody');
    playersTableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading players...</td></tr>';
    
    // Get filter values
    const statusFilter = document.getElementById('player-status').value;
    const positionFilter = document.getElementById('position-filter').value;
    const searchQuery = document.getElementById('player-search').value;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('action', 'get_league_players');
    formData.append('league_id', leagueId);
    formData.append('status', statusFilter);
    formData.append('position', positionFilter);
    formData.append('search', searchQuery);
    formData.append('page', page);
    formData.append('limit', 25); // Show 25 players per page
    
    // Send request to server
    fetch('../server/player_api.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderPlayers(data.players, playersTableBody);
            updatePagination(data.page, data.total_pages);
        } else {
            playersTableBody.innerHTML = `<tr><td colspan="6" class="error-row">${data.message}</td></tr>`;
        }
    })
    .catch(error => {
        console.error('Error loading players:', error);
        playersTableBody.innerHTML = '<tr><td colspan="6" class="error-row">Failed to load players. Please try again.</td></tr>';
    });
}

// Render players in the table
function renderPlayers(players, tableBody) {
    if (!players || players.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data-row">No players found</td></tr>';
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Create a row for each player
    players.forEach(player => {
        const row = document.createElement('tr');
        
        // Player column with photo and name
        const playerCell = document.createElement('td');
        playerCell.className = 'player-cell';
        playerCell.innerHTML = `
            <img src="${player.photo_url || '../assets/player-default.png'}" alt="${player.full_name}" class="player-thumb">
            <div class="player-info">
                <div class="player-name">
                    ${player.full_name}
                    ${player.injury_status ? `<span class="injury-indicator">${player.injury_status}</span>` : ''}
                </div>
            </div>
        `;
        
        // NFL Team
        const teamCell = document.createElement('td');
        teamCell.textContent = player.team_abbr || 'FA';
        
        // Position
        const posCell = document.createElement('td');
        posCell.textContent = player.player_position;
        
        // Status
        const statusCell = document.createElement('td');
        if (player.player_status === 'active') {
            statusCell.innerHTML = '<span class="available">Active</span>';
        } else if (player.player_status === 'injured') {
            statusCell.innerHTML = '<span class="injured">Injured</span>';
        } else {
            statusCell.textContent = player.player_status;
        }
        
        // Fantasy Team
        const fantasyTeamCell = document.createElement('td');
        fantasyTeamCell.textContent = player.fantasy_team_name || 'Free Agent';
        
        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        // If player is available, show add button
        // If player is on one of user's teams, show drop button
        if (!player.fantasy_team_id) {
            actionsCell.innerHTML = `
                <button class="btn btn-primary btn-sm add-player-btn" data-player-id="${player.player_id}" data-player-name="${player.full_name}">
                    <i class="fas fa-plus"></i> Add
                </button>
            `;
        } else if (window.userTeamsInLeague && window.userTeamsInLeague.some(team => team.id == player.fantasy_team_id)) {
            actionsCell.innerHTML = `
                <button class="btn btn-danger btn-sm drop-player-btn" data-player-id="${player.player_id}" data-player-name="${player.full_name}" data-team-id="${player.fantasy_team_id}">
                    <i class="fas fa-times"></i> Drop
                </button>
            `;
        }
        
        // Append all cells to the row
        row.appendChild(playerCell);
        row.appendChild(teamCell);
        row.appendChild(posCell);
        row.appendChild(statusCell);
        row.appendChild(fantasyTeamCell);
        row.appendChild(actionsCell);
        
        // Append row to table body
        tableBody.appendChild(row);
    });
    
    // Add event listeners to the add/drop buttons
    addPlayerButtonListeners();
}

// Set up the filters
function setupFilters() {
    const statusFilter = document.getElementById('player-status');
    const positionFilter = document.getElementById('position-filter');
    const searchInput = document.getElementById('player-search');
    const searchButton = document.getElementById('search-button');
    
    // Function to trigger the search
    const triggerSearch = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const leagueId = urlParams.get('id');
        if (leagueId) {
            loadPlayers(leagueId, 1); // Reset to page 1 when filters change
        }
    };
    
    // Add change event listeners
    statusFilter.addEventListener('change', triggerSearch);
    positionFilter.addEventListener('change', triggerSearch);
    
    // Add search button click event
    searchButton.addEventListener('click', triggerSearch);
    
    // Add key press event to search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            triggerSearch();
            e.preventDefault();
        }
    });
}

// Set up pagination controls
function setupPagination() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    prevButton.addEventListener('click', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const leagueId = urlParams.get('id');
        const currentPage = parseInt(this.dataset.currentPage || 1);
        
        if (currentPage > 1) {
            loadPlayers(leagueId, currentPage - 1);
        }
    });
    
    nextButton.addEventListener('click', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const leagueId = urlParams.get('id');
        const currentPage = parseInt(this.dataset.currentPage || 1);
        const totalPages = parseInt(this.dataset.totalPages || 1);
        
        if (currentPage < totalPages) {
            loadPlayers(leagueId, currentPage + 1);
        }
    });
}

// Update pagination info and controls
function updatePagination(currentPage, totalPages) {
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update buttons and their data attributes
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    
    prevButton.dataset.currentPage = currentPage;
    prevButton.dataset.totalPages = totalPages;
    nextButton.dataset.currentPage = currentPage;
    nextButton.dataset.totalPages = totalPages;
}

// Set up the add player modal
function setupAddPlayerModal() {
    const modal = document.getElementById('add-player-modal');
    const closeButton = modal.querySelector('.close');
    const cancelButton = document.getElementById('cancel-add');
    const confirmButton = document.getElementById('confirm-add');
    
    // Close the modal
    function closeModal() {
        modal.style.display = 'none';
    }
    
    // Close on close button, cancel button, and clicking outside
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Handle confirm add
    confirmButton.addEventListener('click', function() {
        const playerId = this.dataset.playerId;
        const teamId = document.getElementById('selected-team').value;
        
        if (!playerId || !teamId) {
            alert('Please select a team to add this player to.');
            return;
        }
        
        addPlayer(playerId, teamId);
    });
}

// Add event listeners to Add Player buttons
function addPlayerButtonListeners() {
    // Add player buttons
    const addButtons = document.querySelectorAll('.add-player-btn');
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            const playerId = this.dataset.playerId;
            const playerName = this.dataset.playerName;
            
            // If user has multiple teams in this league, show team selection modal
            if (window.userTeamsInLeague && window.userTeamsInLeague.length > 1) {
                showAddPlayerModal(playerId, playerName);
            } else if (window.userTeamsInLeague && window.userTeamsInLeague.length === 1) {
                // If user has only one team, add directly to that team
                addPlayer(playerId, window.userTeamsInLeague[0].id);
            } else {
                showError('You do not have any teams in this league');
            }
        });
    });
    
    // Drop player buttons
    const dropButtons = document.querySelectorAll('.drop-player-btn');
    dropButtons.forEach(button => {
        button.addEventListener('click', function() {
            const playerId = this.dataset.playerId;
            const playerName = this.dataset.playerName;
            const teamId = this.dataset.teamId;
            
            if (confirm(`Are you sure you want to drop ${playerName} from your team?`)) {
                dropPlayer(playerId, teamId);
            }
        });
    });
}

// Show the Add Player modal with team selection
function showAddPlayerModal(playerId, playerName) {
    const modal = document.getElementById('add-player-modal');
    const playerNameElement = document.getElementById('add-player-name');
    const teamSelect = document.getElementById('selected-team');
    const confirmButton = document.getElementById('confirm-add');
    
    // Set player name and ID
    playerNameElement.textContent = playerName;
    confirmButton.dataset.playerId = playerId;
    
    // Populate team selection dropdown
    teamSelect.innerHTML = '';
    window.userTeamsInLeague.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
    });
    
    // Show the modal
    modal.style.display = 'block';
}

// Add a player to a team
function addPlayer(playerId, teamId) {
    const formData = new FormData();
    formData.append('action', 'add_player');
    formData.append('player_id', playerId);
    formData.append('team_id', teamId);
    formData.append('acquisition_type', 'free_agent');
    
    fetch('../server/lineup.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal if open
            const modal = document.getElementById('add-player-modal');
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
            
            // Show success message
            alert(`Successfully added ${data.player.name} to your team.`);
            
            // Reload players list
            const urlParams = new URLSearchParams(window.location.search);
            const leagueId = urlParams.get('id');
            loadPlayers(leagueId);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Error adding player:', error);
        showError('Failed to add player. Please try again.');
    });
}

// Drop a player from a team
function dropPlayer(playerId, teamId) {
    const formData = new FormData();
    formData.append('action', 'drop_player');
    formData.append('player_id', playerId);
    formData.append('team_id', teamId);
    
    fetch('../server/lineup.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            alert(`Successfully dropped ${data.player_name} from your team.`);
            
            // Reload players list
            const urlParams = new URLSearchParams(window.location.search);
            const leagueId = urlParams.get('id');
            loadPlayers(leagueId);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Error dropping player:', error);
        showError('Failed to drop player. Please try again.');
    });
}

// Show error message
function showError(message) {
    alert(message);
}
