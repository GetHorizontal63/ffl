// League Creation Form Handler

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkAuthenticationStatus();
    
    // Initialize tab navigation
    initializeTabNavigation();
    
    // Set up form submission handler
    setupFormSubmission();
    
    // Setup conditional display fields
    setupConditionalFields();
    
    // Set min date for draft date to today
    setMinDraftDate();
});

// Check if user is authenticated
function checkAuthenticationStatus() {
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

// Initialize tab navigation
function initializeTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('previous-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    let currentTabIndex = 0;
    
    // Initial setup - show first tab, hide others
    tabContents.forEach((content, index) => {
        if (index === 0) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
    
    // Add click handlers to tab buttons
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', function() {
            // Hide all tab contents
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // Remove active class from all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
            });
            
            // Show selected tab content and add active class
            tabContents[index].style.display = 'block';
            tab.classList.add('active');
            
            // Update current tab index
            currentTabIndex = index;
            
            // Update navigation buttons
            updateNavigationButtons();
        });
    });
    
    // Next button handler
    nextBtn.addEventListener('click', function() {
        if (currentTabIndex < tabs.length - 1) {
            if (validateCurrentTab(currentTabIndex)) {
                currentTabIndex++;
                tabs[currentTabIndex].click();
            }
        }
    });
    
    // Previous button handler
    prevBtn.addEventListener('click', function() {
        if (currentTabIndex > 0) {
            currentTabIndex--;
            tabs[currentTabIndex].click();
        }
    });
    
    // Update navigation button visibility based on current tab
    function updateNavigationButtons() {
        if (currentTabIndex === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
        
        if (currentTabIndex === tabs.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
    }
    
    // Initial button state
    updateNavigationButtons();
}

// Validate the current tab before proceeding
function validateCurrentTab(tabIndex) {
    const tabContents = document.querySelectorAll('.tab-content');
    const currentTab = tabContents[tabIndex];
    
    // Validate basic settings tab
    if (tabIndex === 0) {
        const leagueName = document.getElementById('league-name').value;
        if (!leagueName.trim()) {
            showError('League name is required');
            return false;
        }
    }

    // Validate roster settings tab
    if (tabIndex === 1) {
        // Check that at least one starter position is selected
        const qb = parseInt(document.getElementById('pos-qb').value) || 0;
        const tqb = parseInt(document.getElementById('pos-tqb').value) || 0;
        const rb = parseInt(document.getElementById('pos-rb').value) || 0;
        const wr = parseInt(document.getElementById('pos-wr').value) || 0;
        const te = parseInt(document.getElementById('pos-te').value) || 0;
        const flex = parseInt(document.getElementById('pos-flex').value) || 0;
        const rbwr = parseInt(document.getElementById('pos-rbwr').value) || 0;
        const wrte = parseInt(document.getElementById('pos-wrte').value) || 0;
        const op = parseInt(document.getElementById('pos-op').value) || 0;
        const superflex = parseInt(document.getElementById('pos-superflex').value) || 0;
        const k = parseInt(document.getElementById('pos-k').value) || 0;
        const p = parseInt(document.getElementById('pos-p').value) || 0;
        const dst = parseInt(document.getElementById('pos-def').value) || 0;
        const hc = parseInt(document.getElementById('pos-hc').value) || 0;
        
        // Add IDP positions as well
        const dt = parseInt(document.getElementById('pos-dt').value) || 0;
        const de = parseInt(document.getElementById('pos-de').value) || 0;
        const lb = parseInt(document.getElementById('pos-lb').value) || 0;
        const cb = parseInt(document.getElementById('pos-cb').value) || 0;
        const s = parseInt(document.getElementById('pos-s').value) || 0;
        const dl = parseInt(document.getElementById('pos-dl').value) || 0;
        const db = parseInt(document.getElementById('pos-db').value) || 0;
        const dp = parseInt(document.getElementById('pos-dp').value) || 0;
        
        const totalStarters = qb + tqb + rb + wr + te + flex + rbwr + wrte + op + superflex + k + p + 
                             dst + hc + dt + de + lb + cb + s + dl + db + dp;
        
        if (totalStarters < 1) {
            showError('You must have at least one starter position');
            return false;
        }
        
        // Check bench spots
        const bench = parseInt(document.getElementById('pos-bench').value) || 0;
        if (bench < 1) {
            showError('You must have at least one bench spot');
            return false;
        }
    }
    
    // Additional validation for other tabs can be added here
    
    return true;
}

// Set up conditional fields based on selections
function setupConditionalFields() {
    // Show/hide FAAB options based on waiver type
    const waiverTypeSelect = document.getElementById('waiver-type');
    const faabOptions = document.querySelectorAll('.faab-option');
    
    if (waiverTypeSelect) {
        waiverTypeSelect.addEventListener('change', function() {
            const showFaab = this.value === 'faab';
            
            faabOptions.forEach(option => {
                option.style.display = showFaab ? 'block' : 'none';
            });
        });
    }
    
    // Show/hide keeper settings based on league type
    const leagueTypeSelect = document.getElementById('league-type');
    const keeperOptions = document.querySelectorAll('.keeper-option');
    
    if (leagueTypeSelect) {
        leagueTypeSelect.addEventListener('change', function() {
            const isKeeper = this.value === 'keeper' || this.value === 'dynasty';
            
            keeperOptions.forEach(option => {
                option.style.display = isKeeper ? 'block' : 'none';
            });
        });
    }
}

// Set minimum draft date to today
function setMinDraftDate() {
    const draftDateInput = document.getElementById('draft-date');
    
    if (draftDateInput) {
        // Create current date in local time zone, formatted for datetime-local input
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        draftDateInput.min = minDateTime;
        
        // Set a default value to a day from now
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowYear = tomorrow.getFullYear();
        const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
        
        const defaultDateTime = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}T20:00`;
        draftDateInput.value = defaultDateTime;
    }
}

// Set up form submission
function setupFormSubmission() {
    const createLeagueForm = document.getElementById('create-league-form');
    
    if (createLeagueForm) {
        createLeagueForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all tabs before submission
            if (!validateForm()) {
                return;
            }
            
            // Get all form data and convert to league settings object
            const leagueData = collectFormData();
            
            // Submit to server
            submitLeagueData(leagueData);
        });
    }
}

// Validate the entire form before submission
function validateForm() {
    // Validate basic league info
    const leagueName = document.getElementById('league-name').value;
    if (!leagueName.trim()) {
        showError('League name is required');
        return false;
    }
    
    // Validate roster settings
    const posQB = parseInt(document.getElementById('pos-qb').value) || 0;
    const posRB = parseInt(document.getElementById('pos-rb').value) || 0;
    const posWR = parseInt(document.getElementById('pos-wr').value) || 0;
    const posTE = parseInt(document.getElementById('pos-te').value) || 0;
    const posFlex = parseInt(document.getElementById('pos-flex').value) || 0;
    const posSuperFlex = parseInt(document.getElementById('pos-superflex').value) || 0;
    const posK = parseInt(document.getElementById('pos-k').value) || 0;
    const posDEF = parseInt(document.getElementById('pos-def').value) || 0;
    
    if ((posQB + posRB + posWR + posTE + posFlex + posSuperFlex + posK + posDEF) < 1) {
        showError('You must have at least one starter position');
        return false;
    }
    
    // Additional validation can be added here
    
    return true;
}

// Collect all form data
function collectFormData() {
    // League basic info
    const leagueName = document.getElementById('league-name').value;
    const description = document.getElementById('league-description').value;
    const maxTeams = document.getElementById('max-teams').value;
    const leagueType = document.getElementById('league-type').value;
    const scoringType = document.getElementById('scoring-type').value;
    const draftDate = document.getElementById('draft-date').value;
    
    // Roster settings
    const rosterPositions = {
        // Standard offensive positions
        'QB': parseInt(document.getElementById('pos-qb').value) || 0,
        'TQB': parseInt(document.getElementById('pos-tqb').value) || 0,
        'RB': parseInt(document.getElementById('pos-rb').value) || 0,
        'WR': parseInt(document.getElementById('pos-wr').value) || 0,
        'TE': parseInt(document.getElementById('pos-te').value) || 0,
        'FLEX': parseInt(document.getElementById('pos-flex').value) || 0,
        'RB/WR': parseInt(document.getElementById('pos-rbwr').value) || 0,
        'WR/TE': parseInt(document.getElementById('pos-wrte').value) || 0,
        'OP': parseInt(document.getElementById('pos-op').value) || 0,
        'SUPERFLEX': parseInt(document.getElementById('pos-superflex').value) || 0,
        'K': parseInt(document.getElementById('pos-k').value) || 0,
        'P': parseInt(document.getElementById('pos-p').value) || 0,
        
        // Team defense and coaches
        'D/ST': parseInt(document.getElementById('pos-def').value) || 0,
        'HC': parseInt(document.getElementById('pos-hc').value) || 0,
        
        // IDP positions
        'DT': parseInt(document.getElementById('pos-dt').value) || 0,
        'DE': parseInt(document.getElementById('pos-de').value) || 0,
        'LB': parseInt(document.getElementById('pos-lb').value) || 0,
        'CB': parseInt(document.getElementById('pos-cb').value) || 0,
        'S': parseInt(document.getElementById('pos-s').value) || 0,
        'DL': parseInt(document.getElementById('pos-dl').value) || 0,
        'DB': parseInt(document.getElementById('pos-db').value) || 0,
        'DP': parseInt(document.getElementById('pos-dp').value) || 0,
        
        // Bench and IR
        'BE': parseInt(document.getElementById('pos-bench').value) || 0,
        'IR': parseInt(document.getElementById('pos-ir').value) || 0
    };
    
    // League rules
    const waiverType = document.getElementById('waiver-type').value;
    const faabBudget = document.getElementById('faab-budget').value;
    const waiverPeriod = document.getElementById('waiver-period').value;
    const tradeDeadline = document.getElementById('trade-deadline').value;
    const tradeReview = document.getElementById('trade-review').value;
    const vetoVotes = document.getElementById('veto-votes').value;
    const playoffTeams = document.getElementById('playoff-teams').value;
    const playoffStart = document.getElementById('playoff-start').value;
    const injurySub = document.getElementById('injury-sub').checked;
    const benchLock = document.getElementById('bench-lock').checked;
    
    // Scoring settings
    const scoringSettings = collectScoringSettings();
    
    // Compile all data
    return {
        name: leagueName,
        description: description,
        max_teams: maxTeams,
        league_type: leagueType,
        scoring_type: scoringType,
        draft_date: draftDate,
        roster_positions: JSON.stringify(rosterPositions),
        
        // League settings
        waiver_type: waiverType,
        faab_budget: faabBudget,
        waiver_period: waiverPeriod,
        trade_deadline: tradeDeadline,
        trade_review: tradeReview,
        veto_votes: vetoVotes,
        playoff_teams: playoffTeams,
        playoff_start: playoffStart,
        injury_sub: injurySub ? 1 : 0,
        bench_lock: benchLock ? 1 : 0,
        
        // Scoring settings
        scoring_settings: JSON.stringify(scoringSettings)
    };
}

// Collect scoring settings from form
function collectScoringSettings() {
    const scoringSettings = {
        // Passing
        passing_yards: parseFloat(document.getElementById('score-pass-yards').value) || 0,
        passing_td: parseFloat(document.getElementById('score-pass-td').value) || 0,
        passing_int: parseFloat(document.getElementById('score-pass-int').value) || 0,
        passing_300_bonus: parseFloat(document.getElementById('score-pass-300').value) || 0,
        
        // Rushing
        rushing_yards: parseFloat(document.getElementById('score-rush-yards').value) || 0,
        rushing_td: parseFloat(document.getElementById('score-rush-td').value) || 0,
        rushing_100_bonus: parseFloat(document.getElementById('score-rush-100').value) || 0,
        
        // Receiving
        reception: parseFloat(document.getElementById('score-rec').value) || 0,
        receiving_yards: parseFloat(document.getElementById('score-rec-yards').value) || 0,
        receiving_td: parseFloat(document.getElementById('score-rec-td').value) || 0,
        receiving_100_bonus: parseFloat(document.getElementById('score-rec-100').value) || 0,
        
        // Kicking
        fg_0_39: parseFloat(document.getElementById('score-fg-0-39').value) || 0,
        fg_40_49: parseFloat(document.getElementById('score-fg-40-49').value) || 0,
        fg_50_plus: parseFloat(document.getElementById('score-fg-50-plus').value) || 0,
        pat: parseFloat(document.getElementById('score-pat').value) || 0,
        
        // Defense/Special Teams
        defense_sack: parseFloat(document.getElementById('score-def-sack').value) || 0,
        defense_int: parseFloat(document.getElementById('score-def-int').value) || 0,
        defense_fr: parseFloat(document.getElementById('score-def-fr').value) || 0,
        defense_td: parseFloat(document.getElementById('score-def-td').value) || 0,
        defense_safety: parseFloat(document.getElementById('score-def-safety').value) || 0
    };
    
    return scoringSettings;
}

// Submit league data to server
function submitLeagueData(leagueData) {
    const formData = new FormData();
    formData.append('action', 'create_league');
    
    // Add all league data to form data
    for (const key in leagueData) {
        formData.append(key, leagueData[key]);
    }
    
    // Add current season year
    formData.append('season_year', new Date().getFullYear());
    
    // Show loading state
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating League...';
    
    // Submit to server
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
            showError(data.message);
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    })
    .catch(error => {
        console.error('League creation error:', error);
        showError('An error occurred. Please try again.');
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Scroll to error message
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    } else {
        alert(message);
    }
}
