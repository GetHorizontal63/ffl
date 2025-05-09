// Authentication Module

document.addEventListener('DOMContentLoaded', function() {
    // Handle Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            
            // Validate inputs
            if (!username || !password) {
                showError(errorMessage, 'All fields are required');
                return;
            }
            
            // Send login request
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('username', username);
            formData.append('password', password);
            
            fetch('../server/auth.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store auth data in localStorage
                    localStorage.setItem('ffl_authenticated', 'true');
                    localStorage.setItem('ffl_user', JSON.stringify(data.user));
                    
                    // Check if there's a redirect URL in the query string
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirectUrl = urlParams.get('redirect');
                    
                    // Redirect to specified URL or home page
                    window.location.href = redirectUrl || '../index.html';
                } else {
                    showError(errorMessage, data.message);
                }
            })
            .catch(error => {
                showError(errorMessage, 'An error occurred. Please try again.');
                console.error('Login error:', error);
            });
        });
    }
    
    // Handle Registration Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorMessage = document.getElementById('error-message');
            
            // Validate inputs
            if (!username || !email || !password || !confirmPassword) {
                showError(errorMessage, 'All fields are required');
                return;
            }
            
            if (password !== confirmPassword) {
                showError(errorMessage, 'Passwords do not match');
                return;
            }
            
            if (password.length < 8) {
                showError(errorMessage, 'Password must be at least 8 characters');
                return;
            }
            
            // Email validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                showError(errorMessage, 'Please enter a valid email address');
                return;
            }
            
            // Send registration request
            const formData = new FormData();
            formData.append('action', 'register');
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            
            fetch('../server/auth.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Redirect to login page after successful registration
                    window.location.href = 'login.html?registered=true';
                } else {
                    showError(errorMessage, data.message || 'Registration failed');
                    console.error('Registration error details:', data);
                }
            })
            .catch(error => {
                showError(errorMessage, 'An error occurred. Please try again.');
                console.error('Registration error:', error.message || error);
            });
        });
    }
    
    // Show registration success message if coming from registration
    if (window.location.search.includes('registered=true') && document.getElementById('error-message')) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'Registration successful! Please login.';
        errorMessage.classList.add('success-message', 'show');
        errorMessage.style.backgroundColor = 'rgba(46, 204, 113, 0.2)';
        errorMessage.style.borderColor = 'rgba(46, 204, 113, 0.3)';
    }
    
    // Helper functions
    function showError(element, message) {
        element.textContent = message;
        element.classList.add('show');
        
        // Hide the error after 5 seconds
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
});
