// League Leaders module for Season Overview

window.LeagueLeaders = (function() {
    // Private variables
    let leadersData = null;
    
    // Load function called by the main controller
    function load(data) {
        leadersData = data;
        render();
    }
    
    // Render the league leaders
    function render() {
        const container = document.getElementById('league-leaders');
        if (!container) return;
        
        try {
            if (!leadersData || Object.keys(leadersData).length === 0) {
                throw new Error('League leaders data not available');
            }
            
            let html = `<h2 class="section-title">League Leaders</h2>`;
            html += `<div class="leaders-container">`;
            
            // Points leaders
            if (leadersData.pointsScored) {
                html += renderLeadersSection('Points Scored (Total)', leadersData.pointsScored, 'points');
            }
            
            // Points Per Game leaders
            if (leadersData.ppg) {
                html += renderLeadersSection('Points Per Game', leadersData.ppg, 'points');
            }
            
            // Highest single-game leaders
            if (leadersData.highestGame) {
                html += renderLeadersSection('Highest Single Game', leadersData.highestGame, 'points');
            }
            
            // Efficiency leaders
            if (leadersData.efficiency) {
                html += renderLeadersSection('Efficiency (Points vs Projected)', leadersData.efficiency, 'percentage');
            }
            
            html += `</div>`;
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Error rendering league leaders:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Could not load league leaders: ${error.message}</p>
                </div>
            `;
        }
    }
    
    // Helper function to render a single leaders section
    function renderLeadersSection(title, leaders, type) {
        if (!leaders || !Array.isArray(leaders) || leaders.length === 0) {
            return `
                <div class="leaders-section">
                    <h3>${title}</h3>
                    <p class="no-data">No data available</p>
                </div>
            `;
        }
        
        let html = `
            <div class="leaders-section">
                <h3>${title}</h3>
                <div class="leaders-grid">
        `;
        
        leaders.forEach((leader, index) => {
            const rank = index + 1;
            const teamLogoAbbr = window.SeasonUtils.getTeamLogoAbbr(leader.team);
            
            let valueDisplay = '';
            if (type === 'points') {
                valueDisplay = window.SeasonUtils.formatNumber(leader.value, 1);
            } else if (type === 'percentage') {
                valueDisplay = `${window.SeasonUtils.formatNumber(leader.value * 100, 1)}%`;
            } else {
                valueDisplay = leader.value;
            }
            
            html += `
                <div class="leader-card">
                    <div class="leader-rank">${rank}</div>
                    <div class="leader-team">
                        <img src="../assets/ffl-logos/${teamLogoAbbr}.png" 
                            onerror="this.src='../assets/ffl-logos/default.png'"
                            alt="${leader.team}" class="team-logo">
                        <a href="franchise.html?team=${encodeURIComponent(leader.team)}" class="team-name">${leader.team}</a>
                    </div>
                    <div class="leader-value">${valueDisplay}</div>
                    ${leader.game ? `<div class="leader-game">Week ${leader.game.week} vs ${leader.game.opponent}</div>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    // Public API
    return {
        load: load
    };
})();
