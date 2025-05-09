document.addEventListener('DOMContentLoaded', function() {
    const minWidth = 1152;
    const minHeight = 942;
    
    function checkScreenSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (width < minWidth || height < minHeight) {
            if (!document.getElementById('device-warning')) {
                const warningDiv = document.createElement('div');
                warningDiv.id = 'device-warning';
                warningDiv.className = 'device-warning';
                warningDiv.innerHTML = `
                    <div class="device-warning-content">
                        <h2>Screen Size Too Small</h2>
                        <p>For the best experience, please view this site on a laptop or desktop computer with a screen resolution of at least ${minWidth}px × ${minHeight}px.</p>
                        <p>Your current resolution: ${width}px × ${height}px</p>
                        <button id="close-warning">Continue Anyway</button>
                    </div>
                `;
                document.body.appendChild(warningDiv);
                
                document.getElementById('close-warning').addEventListener('click', function() {
                    document.getElementById('device-warning').style.display = 'none';
                });
            } else {
                document.getElementById('device-warning').style.display = 'flex';
            }
        } else if (document.getElementById('device-warning')) {
            document.getElementById('device-warning').style.display = 'none';
        }
    }
    
    // Check on page load
    checkScreenSize();
    
    // Check when window is resized
    window.addEventListener('resize', checkScreenSize);
});
