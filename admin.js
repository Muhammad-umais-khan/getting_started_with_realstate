// Admin Panel JavaScript

// ==================== Authentication ====================
const AUTH_CONFIG = {
    // SHA-256 hash of your password. To generate a new hash:
    // 1. Open browser console on any page
    // 2. Run: crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD' + 'gettingstarted_salt_2024')).then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')))
    // 3. Copy the hash and paste it here
    PASSWORD_HASH: '55a3345b959f5e176c74102b0163a25264db702c50e1fea5100f137edbca92b2', // Default: 'admin123'
    
    SESSION_KEY: 'adminSession',
    LOCKOUT_KEY: 'adminLockout',
    SESSION_DURATION: 2 * 60 * 60 * 1000, // 2 hours
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes lockout
};

// Generate SHA-256 hash
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'gettingstarted_salt_2024'); // Add salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate secure session token
function generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Check lockout status
function checkLockout() {
    const lockoutData = localStorage.getItem(AUTH_CONFIG.LOCKOUT_KEY);
    if (!lockoutData) return { locked: false, attempts: 0 };
    
    try {
        const { attempts, timestamp } = JSON.parse(lockoutData);
        const now = Date.now();
        
        // Check if lockout period has passed
        if (attempts >= AUTH_CONFIG.MAX_ATTEMPTS) {
            const timeLeft = AUTH_CONFIG.LOCKOUT_DURATION - (now - timestamp);
            if (timeLeft > 0) {
                return { locked: true, timeLeft, attempts };
            }
            // Lockout expired, reset attempts
            localStorage.removeItem(AUTH_CONFIG.LOCKOUT_KEY);
            return { locked: false, attempts: 0 };
        }
        
        // Reset attempts after 1 hour of no activity
        if (now - timestamp > 60 * 60 * 1000) {
            localStorage.removeItem(AUTH_CONFIG.LOCKOUT_KEY);
            return { locked: false, attempts: 0 };
        }
        
        return { locked: false, attempts };
    } catch (e) {
        return { locked: false, attempts: 0 };
    }
}

// Record failed attempt
function recordFailedAttempt() {
    const lockoutData = localStorage.getItem(AUTH_CONFIG.LOCKOUT_KEY);
    let attempts = 1;
    
    if (lockoutData) {
        try {
            const data = JSON.parse(lockoutData);
            attempts = (data.attempts || 0) + 1;
        } catch (e) {}
    }
    
    localStorage.setItem(AUTH_CONFIG.LOCKOUT_KEY, JSON.stringify({
        attempts,
        timestamp: Date.now()
    }));
    
    return attempts;
}

// Clear failed attempts on successful login
function clearFailedAttempts() {
    localStorage.removeItem(AUTH_CONFIG.LOCKOUT_KEY);
}

// Check if already authenticated
function checkAuth() {
    const session = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (session) {
        try {
            const { token, timestamp, fingerprint } = JSON.parse(session);
            const now = Date.now();
            
            // Validate session
            if (token && 
                now - timestamp < AUTH_CONFIG.SESSION_DURATION &&
                fingerprint === getBrowserFingerprint()) {
                showAdminPanel();
                return true;
            }
        } catch (e) {
            sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
        }
    }
    
    // Check lockout before showing login
    const lockout = checkLockout();
    if (lockout.locked) {
        showLockoutMessage(lockout.timeLeft);
    }
    
    showLoginForm();
    return false;
}

// Simple browser fingerprint for session validation
function getBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    return btoa(
        navigator.userAgent + 
        navigator.language + 
        screen.width + 'x' + screen.height +
        new Date().getTimezoneOffset() +
        canvas.toDataURL()
    ).slice(0, 32);
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('adminPassword');
    const errorElement = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Check lockout
    const lockout = checkLockout();
    if (lockout.locked) {
        showLockoutMessage(lockout.timeLeft);
        return false;
    }
    
    // Disable button during check
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    
    const password = passwordInput.value;
    const hashedInput = await hashPassword(password);
    
    // Add small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    if (hashedInput === AUTH_CONFIG.PASSWORD_HASH) {
        // Successful login
        clearFailedAttempts();
        
        const sessionData = {
            token: generateSessionToken(),
            timestamp: Date.now(),
            fingerprint: getBrowserFingerprint()
        };
        
        // Use sessionStorage (clears on browser close) for better security
        sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
        
        showAdminPanel();
        initializeProperties();
        renderProperties();
        showToast('Welcome to Admin Panel!');
    } else {
        // Failed login
        const attempts = recordFailedAttempt();
        const remaining = AUTH_CONFIG.MAX_ATTEMPTS - attempts;
        
        if (remaining <= 0) {
            showLockoutMessage(AUTH_CONFIG.LOCKOUT_DURATION);
        } else {
            errorElement.textContent = `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
            errorElement.classList.add('show');
        }
        
        passwordInput.value = '';
        passwordInput.focus();
        
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }
    
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
    
    return false;
}

// Show lockout message
function showLockoutMessage(timeLeft) {
    const errorElement = document.getElementById('loginError');
    const minutes = Math.ceil(timeLeft / 60000);
    errorElement.textContent = `Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
    errorElement.classList.add('show');
    
    // Disable form
    document.getElementById('adminPassword').disabled = true;
    document.querySelector('.btn-login').disabled = true;
    
    // Re-enable after lockout
    setTimeout(() => {
        document.getElementById('adminPassword').disabled = false;
        document.querySelector('.btn-login').disabled = false;
        errorElement.classList.remove('show');
    }, timeLeft);
}

// Handle logout
function handleLogout() {
    sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    showLoginForm();
    showToast('Logged out successfully');
}

// Show login form
function showLoginForm() {
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('adminWrapper').style.display = 'none';
    
    // Clear password field
    const passInput = document.getElementById('adminPassword');
    if (passInput) {
        passInput.value = '';
        passInput.disabled = false;
    }
}

// Show admin panel
function showAdminPanel() {
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('adminWrapper').style.display = 'block';
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('adminPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Auto-logout on inactivity (30 minutes)
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY)) {
            handleLogout();
            showToast('Session expired due to inactivity');
        }
    }, 30 * 60 * 1000); // 30 minutes
}

// Track user activity
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
});

// ==================== End Authentication ====================

// Property Data Storage Key
const STORAGE_KEY = 'realestateProperties';

// Default Property Data
const defaultProperties = [
    {
        id: 1,
        location: "Bristol BS7",
        address: "14 Amis Walk, Bristol BS7",
        beds: 4,
        baths: 2,
        rent: 2500,
        deposit: 2884,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "We are delighted to offer this four bedroom fully furnished property in Horfield, Bristol. Close to The University of the West of England, Bristol - UWE as well as major road links and plenty of local amenities this is a must see for any one! The property is over three levels and consists of four bedrooms one with En-suite, bathroom, W.C. and a nice sized open plan living room/kitchen. The property also comes with a parking bay and garage area if needed.",
        images: "BS7"
    },
    {
        id: 2,
        location: "London E7",
        address: "London E7",
        beds: 7,
        baths: 3,
        rent: 6249,
        deposit: 7500,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Stunning 7 bedroom property in East London, perfect for HMO investment. Close to transport links and local amenities.",
        images: "E7(1)"
    },
    {
        id: 3,
        location: "London E1",
        address: "London E1",
        beds: 5,
        baths: 2,
        rent: 6000,
        deposit: 7000,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Beautiful 5 bedroom property in the heart of East London. Ideal for professionals or HMO.",
        images: "E1"
    },
    {
        id: 4,
        location: "Birmingham, B18",
        address: "Birmingham B18",
        beds: 5,
        baths: 3,
        rent: 1800,
        deposit: 2100,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Spacious 5 bedroom property in Birmingham. Great rental yield potential.",
        images: "B18"
    },
    {
        id: 5,
        location: "High Wycombe HP12",
        address: "High Wycombe HP12",
        beds: 4,
        baths: 1,
        rent: 2400,
        deposit: 2800,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "4 bedroom property in High Wycombe with excellent transport links to London.",
        images: "HP12"
    },
    {
        id: 6,
        location: "Leicester LE2",
        address: "Leicester LE2",
        beds: 5,
        baths: 2,
        rent: 1400,
        deposit: 1600,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Affordable 5 bedroom property in Leicester. Perfect for student lets.",
        images: "LE2"
    },
    {
        id: 7,
        location: "Birmingham B14",
        address: "Birmingham B14",
        beds: 3,
        baths: 1,
        rent: 1500,
        deposit: 1750,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Cozy 3 bedroom property in Birmingham B14 area.",
        images: "B14)"
    },
    {
        id: 8,
        location: "Berkshire SL2",
        address: "Berkshire SL2",
        beds: 6,
        baths: 3,
        rent: 6500,
        deposit: 7500,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Luxurious 6 bedroom property in Berkshire. High-end finish throughout.",
        images: "SL2"
    },
    {
        id: 9,
        location: "Berkshire SL1",
        address: "Berkshire SL1",
        beds: 6,
        baths: 6,
        rent: 7000,
        deposit: 8000,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Premium 6 bedroom, 6 bathroom property in Berkshire SL1.",
        images: "SL1"
    },
    {
        id: 10,
        location: "Luton LU2",
        address: "Luton LU2",
        beds: 5,
        baths: 4,
        rent: 3100,
        deposit: 3600,
        contract: "3 to 5 Years",
        availability: "Available Now!",
        description: "Modern 5 bedroom property in Luton with 4 bathrooms. Great for HMO.",
        images: "LU2"
    }
];

// Initialize properties - fetch from JSON file
async function initializeProperties() {
    try {
        const response = await fetch('data/properties.json');
        if (response.ok) {
            const properties = await response.json();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
        }
    } catch (e) {
        console.warn('Could not fetch properties.json, using localStorage');
    }
    
    // Fallback: if localStorage is empty, use defaults
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProperties));
    }
}

// Get all properties
function getProperties() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save properties
function saveProperties(properties) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
    showToast('Changes saved locally. Export JSON to update the deployed site.');
}

// Update home.js property data format
function updateHomeData(properties) {
    const homeData = properties.map(p => ({
        id: p.id,
        location: p.location,
        details: `${p.beds} beds · ${p.baths} bath${p.baths > 1 ? 's' : ''} · Rent: £${p.rent.toLocaleString()}`
    }));
    localStorage.setItem('homePropertyData', JSON.stringify(homeData));
}

// Get next available ID
function getNextId() {
    const properties = getProperties();
    if (properties.length === 0) return 1;
    return Math.max(...properties.map(p => p.id)) + 1;
}

// Add new property
function addProperty(property) {
    const properties = getProperties();
    property.id = getNextId();
    properties.push(property);
    saveProperties(properties);
    return property;
}

// Update property
function updateProperty(id, updatedData) {
    const properties = getProperties();
    const index = properties.findIndex(p => p.id === id);
    if (index !== -1) {
        properties[index] = { ...properties[index], ...updatedData };
        saveProperties(properties);
        return true;
    }
    return false;
}

// Delete property
function deleteProperty(id) {
    let properties = getProperties();
    properties = properties.filter(p => p.id !== id);
    saveProperties(properties);
}

// Render properties grid
function renderProperties(searchTerm = '') {
    const container = document.getElementById('propertiesGrid');
    let properties = getProperties();
    
    // Filter by search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        properties = properties.filter(p => 
            p.location.toLowerCase().includes(term) ||
            p.address.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
        );
    }
    
    if (properties.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-building-circle-xmark"></i>
                <h3>${searchTerm ? 'No properties found' : 'No properties yet'}</h3>
                <p>${searchTerm ? 'Try a different search term' : 'Click "Add New" to add your first property'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = properties.map(property => `
        <div class="property-card" data-id="${property.id}">
            <div class="property-card-header">
                <span class="property-id">#${property.id}</span>
                <div class="property-location">${property.location}</div>
            </div>
            <div class="property-card-body">
                <div class="property-price">£${property.rent.toLocaleString()} pcm</div>
                <div class="property-details">
                    <div class="detail-item">
                        <i class="fa-solid fa-bed"></i>
                        <span>${property.beds} Bedrooms</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-bath"></i>
                        <span>${property.baths} Bathrooms</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">£</span>
                        <span>£${property.deposit.toLocaleString()} Deposit</span>
                    </div>
                    <div class="detail-item">
                        <i class="fa-solid fa-calendar-days"></i>
                        <span>${property.contract || 'Flexible'}</span>
                    </div>
                </div>
                <div class="property-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editProperty(${property.id})">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete(${property.id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Show section
function showSection(sectionId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Navigation click handlers
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        showSection(item.dataset.section);
    });
});

// Search functionality
document.getElementById('searchProperty').addEventListener('input', (e) => {
    renderProperties(e.target.value);
});

// Form submission - Add property
document.getElementById('propertyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const property = {
        location: document.getElementById('propertyLocation').value,
        address: document.getElementById('propertyAddress').value,
        beds: parseInt(document.getElementById('propertyBeds').value),
        baths: parseInt(document.getElementById('propertyBaths').value),
        rent: parseInt(document.getElementById('propertyRent').value),
        deposit: parseInt(document.getElementById('propertyDeposit').value),
        contract: document.getElementById('propertyContract').value || '3 to 5 Years',
        availability: document.getElementById('propertyAvailability').value,
        description: document.getElementById('propertyDescription').value,
        images: document.getElementById('propertyImages').value
    };
    
    addProperty(property);
    showToast('Property added successfully!');
    resetForm();
    showSection('properties');
    renderProperties();
});

// Reset form
function resetForm() {
    document.getElementById('propertyForm').reset();
}

// Edit property - Open modal
function editProperty(id) {
    const properties = getProperties();
    const property = properties.find(p => p.id === id);
    
    if (property) {
        document.getElementById('editPropertyId').value = property.id;
        document.getElementById('editPropertyLocation').value = property.location;
        document.getElementById('editPropertyAddress').value = property.address;
        document.getElementById('editPropertyBeds').value = property.beds;
        document.getElementById('editPropertyBaths').value = property.baths;
        document.getElementById('editPropertyRent').value = property.rent;
        document.getElementById('editPropertyDeposit').value = property.deposit;
        document.getElementById('editPropertyContract').value = property.contract || '';
        document.getElementById('editPropertyAvailability').value = property.availability;
        document.getElementById('editPropertyDescription').value = property.description;
        document.getElementById('editPropertyImages').value = property.images || '';
        
        document.getElementById('editModal').classList.add('show');
    }
}

// Close modal
function closeModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Edit form submission
document.getElementById('editPropertyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('editPropertyId').value);
    const updatedData = {
        location: document.getElementById('editPropertyLocation').value,
        address: document.getElementById('editPropertyAddress').value,
        beds: parseInt(document.getElementById('editPropertyBeds').value),
        baths: parseInt(document.getElementById('editPropertyBaths').value),
        rent: parseInt(document.getElementById('editPropertyRent').value),
        deposit: parseInt(document.getElementById('editPropertyDeposit').value),
        contract: document.getElementById('editPropertyContract').value,
        availability: document.getElementById('editPropertyAvailability').value,
        description: document.getElementById('editPropertyDescription').value,
        images: document.getElementById('editPropertyImages').value
    };
    
    updateProperty(id, updatedData);
    closeModal();
    showToast('Property updated successfully!');
    renderProperties();
});

// Confirm delete
function confirmDelete(id) {
    if (confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
        deleteProperty(id);
        showToast('Property deleted successfully!');
        renderProperties();
    }
}

// Export data for deployment
function exportData() {
    const properties = getProperties();
    const dataStr = JSON.stringify(properties, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'properties.json'; // Named to directly replace data/properties.json
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Exported! Replace data/properties.json with this file and redeploy.');
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const properties = JSON.parse(e.target.result);
            if (Array.isArray(properties)) {
                saveProperties(properties);
                showToast('Data imported successfully!');
                renderProperties();
            } else {
                showToast('Invalid file format', 'error');
            }
        } catch (error) {
            showToast('Error reading file', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to delete ALL properties? This action cannot be undone!')) {
        if (confirm('This will permanently delete all property data. Continue?')) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('homePropertyData');
            initializeProperties();
            showToast('All data has been cleared');
            renderProperties();
        }
    }
}

// Generate property HTML files (shows template)
function generateAllPropertyFiles() {
    const properties = getProperties();
    
    let template = properties.map(p => generatePropertyTemplate(p)).join('\n\n---\n\n');
    
    // Create a downloadable file with all templates
    const blob = new Blob([template], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property_templates.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Generated templates for ${properties.length} properties!`);
}

// Generate property HTML template
function generatePropertyTemplate(property) {
    return `<!-- Property ${property.id}: ${property.location} -->
<!DOCTYPE html>
<html lang="en">
<head>
    <title>GET STARTED IN PROPERTIES - ${property.location}</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="property.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <link rel="icon" type="image/ico" href="assets/GETSTARTEDLOGO.ico" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />
</head>
<body>
    <header class="header open-link" data-link-type="invest">
        <img src="assets/GETSTARTEDLOGO.ico" alt="SCLARE logo" />
        <p>ettingstartedinproperty</p>
    </header>
    <main class="container">
        <section class="swiper mySwiper">
            <div class="swiper-wrapper">
                <!-- Add images from assets/${property.images}/ folder -->
                <div class="swiper-slide"><img src="assets/${property.images}/pic1.jpg" /></div>
            </div>
            <div class="swiper-button-next"></div>
            <div class="swiper-button-prev"></div>
            <div class="swiper-pagination"></div>
        </section>
        <section class="about">
            <div class="price"><p>£${property.rent.toLocaleString()} pcm</p></div>
            <div class="location">${property.address}</div>
            <div class="icons">
                <div><img src="https://img.icons8.com/ios-filled/24/000000/bed.png" alt="bed icon" /><span>${property.beds} beds</span></div>
                <div><i class="fa-solid fa-bath" style="color: #000000"></i><span>${property.baths} baths</span></div>
            </div>
            <div class="availability">${property.availability}</div>
            <div class="abt"><div>Deposit:</div><div>£${property.deposit.toLocaleString()}</div></div>
            <div class="abt"><div>Contract Length:</div><div>${property.contract}</div></div>
            <div class="description">${property.description}</div>
            <div class="details">
                <a href="mailto:info@gettingstartedinproperty.co.uk"><button class="blue"><i class="fa fa-envelope" aria-hidden="true"></i><span>Send Email</span></button></a>
                <a href="tel:0203 828 9295"><button class="white"><i class="fa fa-phone" aria-hidden="true"></i><span>Contact Us</span></button></a>
                <button class="white" onclick="reserveDeal()"><i class="fas fa-handshake" aria-hidden="true"></i><span>Reserve Deal</span></button>
                <button class="green" onclick="requestCallback()"><i class="fas fa-headset" aria-hidden="true"></i><span>Request a call-back</span></button>
            </div>
        </section>
    </main>
    <footer>
        <div class="socials">
            <i class="fa-brands fa-facebook open-link" data-link-type="fb" style="color: #537bbe"></i>
            <i id="insta" class="fa-brands fa-instagram open-link" data-link-type="insta" style="color: #e54867"></i>
            <i id="whatsapp" class="fa-brands fa-whatsapp open-link" data-link-type="whatsapp" style="color: #5abe93"></i>
        </div>
        <div class="text">
            <p>* Viewings being held by appointment Management can be provided - Contract Set Up can provided Set up and staging can be provided - 2 hours free property mentoring provided</p>
        </div>
    </footer>
</body>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
<script src="property.js"></script>
</html>`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    toast.classList.remove('error');
    
    if (type === 'error') {
        toast.classList.add('error');
        toastIcon.className = 'fa-solid fa-times-circle';
    } else {
        toastIcon.className = 'fa-solid fa-check-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modal on outside click
document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Start inactivity timer
    resetInactivityTimer();
    
    // Check authentication first
    if (checkAuth()) {
        await initializeProperties();
        renderProperties();
    }
});
