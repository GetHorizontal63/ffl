document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const seasonSelect = document.getElementById('season');
    const teamSelect = document.getElementById('team');
    const metricSelect = document.getElementById('metric');
    const applyFiltersBtn = document.getElementById('applyFilters');
    
    // Canvas elements for charts
    const pointsChartCanvas = document.getElementById('pointsChart');
    const winPositionChartCanvas = document.getElementById('winPositionChart');
    const efficiencyChartCanvas = document.getElementById('efficiencyChart');
    const consistencyChartCanvas = document.getElementById('consistencyChart');
    const trendChartCanvas = document.getElementById('trendChart');
    
    // Chart objects
    let pointsChart, winPositionChart, efficiencyChart, consistencyChart, trendChart;
    
    // Sample data for team names
    const teams = [
        'Beer Bellies', 'Touchdown Terrors', 'Grid Iron Giants', 
        'Pigskin Warriors', 'Blitz Brigade', 'End Zone Enforcers', 
        'Field Goal Heroes', 'Quarterback Crushers', 'Fantasy Legends', 
        'Hail Mary Hustlers', 'Sideline Strategists', 'Playoff Punishers'
    ];
    
    // Populate team dropdown
    function populateTeamDropdown() {
        teamSelect.innerHTML = '<option value="all">All Teams</option>';
        
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.toLowerCase().replace(/\s+/g, '-');
            option.textContent = team;
            teamSelect.appendChild(option);
        });
    }
    
    // Generate random data for charts
    function generateRandomData(count, min, max) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }
    
    // Initialize all charts with default data
    function initializeCharts() {
        // Points Distribution Chart
        const pointsCtx = pointsChartCanvas.getContext('2d');
        pointsChart = new Chart(pointsCtx, {
            type: 'bar',
            data: {
                labels: teams,
                datasets: [{
                    label: 'Total Points',
                    data: generateRandomData(teams.length, 800, 1600),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
        
        // Win Percentage by Position Chart
        const winPositionCtx = winPositionChartCanvas.getContext('2d');
        winPositionChart = new Chart(winPositionCtx, {
            type: 'radar',
            data: {
                labels: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
                datasets: [{
                    label: 'Win %',
                    data: generateRandomData(6, 30, 80),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            backdropColor: 'transparent',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
        
        // Efficiency Chart
        const efficiencyCtx = efficiencyChartCanvas.getContext('2d');
        efficiencyChart = new Chart(efficiencyCtx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 17 }, (_, i) => `Week ${i + 1}`),
                datasets: [{
                    label: 'Bench Points',
                    data: generateRandomData(17, 40, 120),
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 2,
                    fill: true
                }, {
                    label: 'Starting Points',
                    data: generateRandomData(17, 80, 160),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
        
        // Consistency Chart
        const consistencyCtx = consistencyChartCanvas.getContext('2d');
        consistencyChart = new Chart(consistencyCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Player Performance',
                    data: Array.from({ length: 30 }, () => ({
                        x: Math.random() * 100,
                        y: Math.random() * 100
                    })),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Consistency (%)',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance (%)',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
        
        // Trend Analysis Chart
        const trendCtx = trendChartCanvas.getContext('2d');
        trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: Array.from({ length: 17 }, (_, i) => `Week ${i + 1}`),
                datasets: teams.map((team, index) => ({
                    label: team,
                    data: generateRandomData(17, 60, 160),
                    borderColor: getRandomColor(),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    hidden: index > 2 // Only show the first 3 teams by default
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }
    
    // Generate a random color for chart elements
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    // Update charts based on selected filters
    function updateCharts() {
        const season = seasonSelect.value;
        const team = teamSelect.value;
        const metric = metricSelect.value;
        
        // In a real application, we would fetch new data from an API
        // For demo purposes, we'll just generate new random data
        
        // Update Points Distribution Chart
        pointsChart.data.datasets[0].data = generateRandomData(teams.length, 800, 1600);
        pointsChart.update();
        
        // Update Win Percentage by Position Chart
        winPositionChart.data.datasets[0].data = generateRandomData(6, 30, 80);
        winPositionChart.update();
        
        // Update Efficiency Chart
        efficiencyChart.data.datasets[0].data = generateRandomData(17, 40, 120);
        efficiencyChart.data.datasets[1].data = generateRandomData(17, 80, 160);
        efficiencyChart.update();
        
        // Update Consistency Chart
        consistencyChart.data.datasets[0].data = Array.from({ length: 30 }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100
        }));
        consistencyChart.update();
        
        // Update Trend Analysis Chart
        trendChart.data.datasets.forEach(dataset => {
            dataset.data = generateRandomData(17, 60, 160);
        });
        trendChart.update();
    }
    
    // Initialize
    populateTeamDropdown();
    initializeCharts();
    
    // Event listeners
    applyFiltersBtn.addEventListener('click', updateCharts);
});
