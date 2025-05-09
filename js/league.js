// League management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkAuthenticationStatus();
    
    // Set up form submission
    setupLeagueForm();
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
            // Update user info in UI
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

// Set up league creation form
function setupLeagueForm() {
    const leagueForm = document.getElementById('league-form');
    
    if (leagueForm) {
        leagueForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('league-name').value;
            const description = document.getElementById('league-description').value;
            const maxTeams = document.getElementById('max-teams').value;
            const scoringType = document.getElementById('scoring-type').value;
            const draftDate = document.getElementById('draft-date').value;
            const errorMessage = document.getElementById('error-message');
            
            // Validate inputs
            if (!name) {
                showError(errorMessage, 'League name is required');
                return;
            }
            
            // Create form data for submission
            const formData = new FormData();
            formData.append('action', 'create_league');
            formData.append('name', name);
            formData.append('description', description);
            formData.append('max_teams', maxTeams);
            formData.append('scoring_type', scoringType);
            formData.append('draft_date', draftDate);
            formData.append('season_year', new Date().getFullYear());
            
            // Submit the form
            fetch('../server/league.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to the new league page
                    window.location.href = `league.html?id=${data.league_id}`;
                } else {
                    showError(errorMessage, data.message);
                }
            })
            .catch(error => {
                showError(errorMessage, 'An error occurred. Please try again.');
                console.error('League creation error:', error);
            });
        });
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

// Helper function to show error messages
function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
    
    // Hide the error after 5 seconds
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}
