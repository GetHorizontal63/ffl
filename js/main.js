/**
 * Main JavaScript file for Fantasy Football League application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuthenticationStatus();
    
    // Initialize navigation
    initializeNavigation();
    
    // Handle home page specific functionality
    if (isHomePage()) {
        initializeHomePage();
    }
});

/**
 * Check if the user is authenticated
 */
function checkAuthenticationStatus() {
    // Check localStorage first for quick UI update
    const isAuthenticated = localStorage.getItem('ffl_authenticated') === 'true';
    
    if (isAuthenticated) {
        // Update UI for authenticated users
        updateAuthenticatedUI(JSON.parse(localStorage.getItem('ffl_user') || '{}'));
    } else {
        // Update UI for non-authenticated users
        updateNonAuthenticatedUI();
    }
    
    // Verify with server
    fetch('server/check_auth.php', {
        method: 'POST',
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            // Update localStorage and UI
            localStorage.setItem('ffl_authenticated', 'true');
            localStorage.setItem('ffl_user', JSON.stringify(data.user));
            updateAuthenticatedUI(data.user);
        } else {
            // Clear localStorage and update UI
            localStorage.removeItem('ffl_authenticated');
            localStorage.removeItem('ffl_user');
            updateNonAuthenticatedUI();
        }
    })
    .catch(error => {
        console.error('Authentication check error:', error);
    });
}

/**
 * Update UI for authenticated users
 */
function updateAuthenticatedUI(user) {
    const userStatusContainer = document.querySelector('.user-status');
    
    if (userStatusContainer) {
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
    
    // Update welcome buttons if on home page
    if (isHomePage()) {
        const loginWelcomeBtn = document.getElementById('login-welcome-btn');
        const registerWelcomeBtn = document.getElementById('register-welcome-btn');
        
        if (loginWelcomeBtn && registerWelcomeBtn) {
            // Replace login/register buttons with my leagues and create league buttons
            const welcomeActions = loginWelcomeBtn.parentElement;
            
            welcomeActions.innerHTML = `
                <a href="pages/my-teams.html" class="welcome-btn">
                    <i class="fas fa-trophy"></i>
                    <span>My Teams</span>
                </a>
                <a href="pages/create-league.html" class="welcome-btn">
                    <i class="fas fa-plus-circle"></i>
                    <span>Create League</span>
                </a>
            `;
        }
    }
    
    // Remove 'restricted' class from nav items
    document.querySelectorAll('.nav-item.restricted').forEach(item => {
        item.classList.remove('restricted');
    });
}

/**
 * Update UI for non-authenticated users
 */
function updateNonAuthenticatedUI() {
    const userStatusContainer = document.querySelector('.user-status');
    
    if (userStatusContainer) {
        // Clear existing content
        userStatusContainer.innerHTML = '';
        
        // Show login button
        const loginBtn = document.createElement('a');
        loginBtn.href = isHomePage() ? 'pages/login.html' : '../pages/login.html';
        loginBtn.className = 'login-btn';
        loginBtn.textContent = 'Login';
        
        userStatusContainer.appendChild(loginBtn);
    }
    
    // No longer add 'restricted' class to nav items
    // All pages are accessible without authentication
}

/**
 * Initialize navigation
 */
function initializeNavigation() {
    // Set active nav item based on current page
    const currentPath = window.location.pathname;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        
        if (currentPath.endsWith(href)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Remove any existing 'restricted' class
    document.querySelectorAll('.nav-item.restricted').forEach(item => {
        item.classList.remove('restricted');
    });
}

/**
 * Initialize home page functionality
 */
function initializeHomePage() {
    // Any home page specific functionality goes here
    console.log('Home page initialized');
}

/**
 * Logout user
 */
function logoutUser() {
    const fetchUrl = isHomePage() ? 'server/auth.php' : '../server/auth.php';
    
    fetch(fetchUrl, {
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
            window.location.href = isHomePage() ? 'index.html' : '../index.html';
        } else {
            console.error('Logout failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
    });
}

/**
 * Check if current page is the home page
 */
function isHomePage() {
    const path = window.location.pathname;
    return path.endsWith('index.html') || path.endsWith('/') || path.endsWith('/FFLSite/');
}
