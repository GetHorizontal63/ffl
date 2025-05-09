// User Teams Management Script

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkAuthenticationStatus();
    
    // Load user's teams
    loadUserTeams();
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

// Load user's teams
function loadUserTeams() {
    fetch('../server/teams.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=get_my_teams'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderTeamsList(data.teams);
        } else {
            showError(data.message);
        }
    })
    .catch(error => {
        console.error('Error loading teams:', error);
        showError('Failed to load your teams. Please try again.');
    });
}

// Render the list of user's teams
function renderTeamsList(teams) {
    const teamsListContainer = document.getElementById('teams-list');
    const noTeamsContainer = document.getElementById('no-teams');
    
    if (teams.length === 0) {
        // Show "no teams" message
        teamsListContainer.style.display = 'none';
        noTeamsContainer.style.display = 'block';
        return;
    }
    
    // Show teams list, hide "no teams" message
    teamsListContainer.style.display = 'block';
    noTeamsContainer.style.display = 'none';
    
    // Clear loading message
    teamsListContainer.innerHTML = '';
    
    // Group teams by season year
    const teamsByYear = teams.reduce((acc, team) => {
        if (!acc[team.season_year]) {
            acc[team.season_year] = [];
        }
        acc[team.season_year].push(team);
        return acc;
    }, {});
    
    // Sort years in descending order
    const sortedYears = Object.keys(teamsByYear).sort((a, b) => b - a);
    
    // Loop through each year
    sortedYears.forEach(year => {
        // Create year header
        const yearHeader = document.createElement('div');
        yearHeader.className = 'teams-year-header';
        yearHeader.innerHTML = `<h3>${year} Season</h3>`;
        teamsListContainer.appendChild(yearHeader);
        
        // Create teams grid
        const teamsGrid = document.createElement('div');
        teamsGrid.className = 'teams-grid';
        
        // Add teams to grid
        teamsByYear[year].forEach(team => {
            const teamCard = createTeamCard(team);
            teamsGrid.appendChild(teamCard);
        });
        
        teamsListContainer.appendChild(teamsGrid);
    });
}

// Create a team card element
function createTeamCard(team) {
    const teamCard = document.createElement('div');
    teamCard.className = 'team-card';
    
    // Determine league status badge
    let statusBadge = '';
    switch(team.status) {
        case 'setup':
            statusBadge = '<span class="league-status setup">Setup</span>';
            break;
        case 'draft':
            statusBadge = '<span class="league-status draft">Draft</span>';
            break;
        case 'active':
            statusBadge = '<span class="league-status active">Active</span>';
            break;
        case 'completed':
            statusBadge = '<span class="league-status completed">Completed</span>';
            break;
        default:
            statusBadge = '';
    }
    
    // Default team logo if not provided
    const logoUrl = team.logo_url || '../assets/team-placeholder.png';
    
    // Calculate team record
    const wins = team.wins || 0;
    const losses = team.losses || 0;
    const ties = team.ties || 0;
    const record = `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;
    
    // Format team card HTML
    teamCard.innerHTML = `
        <div class="team-logo">
            <img src="${logoUrl}" alt="${team.name}">
            ${statusBadge}
        </div>
        <div class="team-info">
            <h3 class="team-name">${team.name}</h3>
            <div class="league-name">${team.league_name}</div>
            <div class="team-record">${record}</div>
        </div>
        <div class="team-actions">
            <a href="lineup.html?team_id=${team.team_id}" class="btn btn-primary btn-sm">Lineup</a>
            <a href="league.html?id=${team.league_id}" class="btn btn-secondary btn-sm">League</a>
        </div>
    `;
    
    // Add click event to navigate to team details page
    teamCard.addEventListener('click', function(e) {
        // Only navigate if not clicking on one of the buttons
        if (!e.target.closest('.btn')) {
            window.location.href = `team-details.html?id=${team.team_id}`;
        }
    });
    
    return teamCard;
}

// Show error message
function showError(message) {
    const errorMessageElement = document.getElementById('error-message');
    
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.classList.add('show');
        
        // Hide error message after 5 seconds
        setTimeout(() => {
            errorMessageElement.classList.remove('show');
        }, 5000);
    }
}
