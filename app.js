/**
 * Elron Train Timetable Web App
 * TUI-style terminal interface
 */

// API endpoints
const STOPS_URL = 'https://api.ridango.com/v2/64/intercity/originstops';
const TRIPS_URL = 'https://api.ridango.com/v2/64/intercity/stopareas/trips/direct';

// DOM elements
const fromInput = document.getElementById('fromStation');
const toInput = document.getElementById('toStation');
const fromAutocomplete = document.getElementById('fromAutocomplete');
const toAutocomplete = document.getElementById('toAutocomplete');
const datePicker = document.getElementById('datePicker');
const searchBtn = document.getElementById('searchBtn');
const swapBtn = document.getElementById('swapBtn');
const showDepartedCheckbox = document.getElementById('showDeparted');
const recentSearchesSection = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');
const routeDisplay = document.getElementById('routeDisplay');
const fromDisplay = document.getElementById('fromDisplay');
const toDisplay = document.getElementById('toDisplay');
const routeDate = document.getElementById('routeDate');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const resultsBody = document.getElementById('resultsBody');
const error = document.getElementById('error');
const errorText = document.getElementById('errorText');

// State
let stations = [];
let currentDate = new Date();
let selectedFromId = null;
let selectedToId = null;
let activeAutocomplete = null;
let selectedAutocompleteIndex = -1;
let currentTrips = [];
let isToday = false;
let currentTime = 0;

// Constants
const MAX_RECENT_SEARCHES = 3;
const STORAGE_KEY = 'elronRecentSearches';

/**
 * Initialize the application
 */
async function init() {
    // Set default date to today
    datePicker.value = formatDateForInput(currentDate);
    datePicker.min = formatDateForInput(new Date());
    
    // Load stations
    await loadStations();
    
    // Set default stations
    setDefaultStations();
    
    // Setup autocomplete
    setupAutocomplete(fromInput, fromAutocomplete, 'from');
    setupAutocomplete(toInput, toAutocomplete, 'to');
    
    // Add event listeners
    searchBtn.addEventListener('click', searchTrains);
    swapBtn.addEventListener('click', swapStations);
    datePicker.addEventListener('change', () => {
        currentDate = new Date(datePicker.value);
    });
    
    // Show departed trains toggle
    showDepartedCheckbox.addEventListener('change', () => {
        if (currentTrips.length > 0) {
            renderTrips();
        }
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            closeAllAutocomplete();
        }
    });
    
    // Load recent searches
    loadRecentSearches();
    
    // Auto-trigger search if there's a recent search
    const recentSearches = getRecentSearches();
    if (recentSearches.length > 0 && selectedFromId && selectedToId) {
        searchTrains();
    }
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Load stations from API
 */
async function loadStations() {
    try {
        const response = await fetch(STOPS_URL);
        if (!response.ok) {
            throw new Error(`Failed to load stations: ${response.status}`);
        }
        
        stations = await response.json();
        
        // Sort stations alphabetically
        stations.sort((a, b) => a.stop_name.localeCompare(b.stop_name, 'et'));
        
    } catch (err) {
        console.error('Error loading stations:', err);
        showError('Failed to load stations. Please try again later.');
    }
}

/**
 * Set default stations
 */
function setDefaultStations() {
    // Try to load from localStorage first
    const recentSearches = getRecentSearches();
    
    if (recentSearches.length > 0) {
        // Use the most recent search
        const lastSearch = recentSearches[0];
        const fromStation = stations.find(s => s.stop_name === lastSearch.from);
        const toStation = stations.find(s => s.stop_name === lastSearch.to);
        
        if (fromStation && toStation) {
            fromInput.value = fromStation.stop_name;
            selectedFromId = fromStation.stop_area_id;
            toInput.value = toStation.stop_name;
            selectedToId = toStation.stop_area_id;
            return;
        }
    }
    
    // Fallback to Tallinn-Tartu if no recent searches
    const tallinn = stations.find(s => s.stop_name.toLowerCase().includes('tallinn'));
    const tartu = stations.find(s => s.stop_name.toLowerCase().includes('tartu'));
    
    if (tallinn) {
        fromInput.value = tallinn.stop_name;
        selectedFromId = tallinn.stop_area_id;
    }
    if (tartu) {
        toInput.value = tartu.stop_name;
        selectedToId = tartu.stop_area_id;
    }
}

/**
 * Swap from and to stations
 */
function swapStations() {
    const tempValue = fromInput.value;
    const tempId = selectedFromId;
    
    fromInput.value = toInput.value;
    selectedFromId = selectedToId;
    
    toInput.value = tempValue;
    selectedToId = tempId;
    
    // Add animation class
    swapBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        swapBtn.style.transform = '';
    }, 300);
}

/**
 * Get recent searches from localStorage
 */
function getRecentSearches() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return [];
    }
}

/**
 * Save a search to recent searches
 */
function saveRecentSearch(fromName, toName, fromId, toId) {
    try {
        let searches = getRecentSearches();
        
        // Remove duplicates
        searches = searches.filter(s => !(s.from === fromName && s.to === toName));
        
        // Add new search at the beginning
        searches.unshift({
            from: fromName,
            to: toName,
            fromId: fromId,
            toId: toId,
            timestamp: Date.now()
        });
        
        // Keep only the last 3
        searches = searches.slice(0, MAX_RECENT_SEARCHES);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
        
        // Update the UI
        renderRecentSearches(searches);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

/**
 * Load and render recent searches
 */
function loadRecentSearches() {
    const searches = getRecentSearches();
    renderRecentSearches(searches);
}

/**
 * Render recent searches UI
 */
function renderRecentSearches(searches) {
    if (searches.length === 0) {
        recentSearchesSection.style.display = 'none';
        return;
    }
    
    recentList.innerHTML = '';
    
    searches.forEach((search, index) => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <span class="from">${escapeHtml(search.from)}</span>
            <span class="arrow">→</span>
            <span class="to">${escapeHtml(search.to)}</span>
        `;
        
        item.addEventListener('click', () => {
            // Set the values
            fromInput.value = search.from;
            selectedFromId = search.fromId;
            toInput.value = search.to;
            selectedToId = search.toId;
            
            // Automatically search
            searchTrains();
        });
        
        recentList.appendChild(item);
    });
    
    recentSearchesSection.style.display = 'block';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Setup autocomplete for an input field
 */
function setupAutocomplete(input, list, type) {
    input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        
        if (value.length < 1) {
            closeAutocomplete(list);
            if (type === 'from') selectedFromId = null;
            else selectedToId = null;
            return;
        }
        
        // Filter stations
        const matches = stations.filter(s => 
            s.stop_name.toLowerCase().includes(value)
        ).slice(0, 10); // Limit to 10 results
        
        if (matches.length > 0) {
            renderAutocomplete(list, matches, value, type);
            openAutocomplete(list);
        } else {
            closeAutocomplete(list);
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (!list.classList.contains('active')) return;
        
        const items = list.querySelectorAll('.autocomplete-item');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
                updateAutocompleteSelection(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
                updateAutocompleteSelection(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedAutocompleteIndex >= 0 && items[selectedAutocompleteIndex]) {
                    items[selectedAutocompleteIndex].click();
                }
                break;
            case 'Escape':
                closeAutocomplete(list);
                break;
        }
    });
    
    input.addEventListener('focus', () => {
        if (input.value.length > 0) {
            const value = input.value.toLowerCase();
            const matches = stations.filter(s => 
                s.stop_name.toLowerCase().includes(value)
            ).slice(0, 10);
            
            if (matches.length > 0) {
                renderAutocomplete(list, matches, value, type);
                openAutocomplete(list);
            }
        }
    });
}

/**
 * Render autocomplete list
 */
function renderAutocomplete(list, matches, query, type) {
    list.innerHTML = '';
    selectedAutocompleteIndex = -1;
    
    matches.forEach((station, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.dataset.id = station.stop_area_id;
        item.dataset.name = station.stop_name;
        
        // Highlight matching text
        const name = station.stop_name;
        const lowerName = name.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const matchIndex = lowerName.indexOf(lowerQuery);
        
        if (matchIndex >= 0) {
            item.innerHTML = 
                name.substring(0, matchIndex) +
                '<span class="autocomplete-item-highlight">' +
                name.substring(matchIndex, matchIndex + query.length) +
                '</span>' +
                name.substring(matchIndex + query.length);
        } else {
            item.textContent = name;
        }
        
        item.addEventListener('click', () => {
            if (type === 'from') {
                fromInput.value = station.stop_name;
                selectedFromId = station.stop_area_id;
            } else {
                toInput.value = station.stop_name;
                selectedToId = station.stop_area_id;
            }
            closeAutocomplete(list);
        });
        
        list.appendChild(item);
    });
}

/**
 * Update autocomplete selection highlighting
 */
function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedAutocompleteIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * Open autocomplete list
 */
function openAutocomplete(list) {
    list.classList.add('active');
    activeAutocomplete = list;
}

/**
 * Close autocomplete list
 */
function closeAutocomplete(list) {
    list.classList.remove('active');
    selectedAutocompleteIndex = -1;
    if (activeAutocomplete === list) {
        activeAutocomplete = null;
    }
}

/**
 * Close all autocomplete lists
 */
function closeAllAutocomplete() {
    closeAutocomplete(fromAutocomplete);
    closeAutocomplete(toAutocomplete);
}

/**
 * Search for trains
 */
async function searchTrains() {
    // Validate selections
    if (!selectedFromId || !fromInput.value) {
        // Try to find exact match for from
        const fromMatch = stations.find(s => 
            s.stop_name.toLowerCase() === fromInput.value.toLowerCase()
        );
        if (fromMatch) {
            selectedFromId = fromMatch.stop_area_id;
        } else {
            showError('Please select a valid origin station');
            return;
        }
    }
    
    if (!selectedToId || !toInput.value) {
        // Try to find exact match for to
        const toMatch = stations.find(s => 
            s.stop_name.toLowerCase() === toInput.value.toLowerCase()
        );
        if (toMatch) {
            selectedToId = toMatch.stop_area_id;
        } else {
            showError('Please select a valid destination station');
            return;
        }
    }
    
    if (selectedFromId === selectedToId) {
        showError('Origin and destination cannot be the same');
        return;
    }
    
    // Show loading
    hideError();
    results.style.display = 'none';
    loading.style.display = 'block';
    
    try {
        const dateStr = formatDateForInput(currentDate);
        
        const response = await fetch(TRIPS_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: 'web',
                origin_stop_area_id: selectedFromId,
                destination_stop_area_id: selectedToId,
                date: dateStr
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update route display
        updateRouteDisplay();
        
        // Display results
        displayResults(data);
        
        // Save to recent searches
        saveRecentSearch(fromInput.value, toInput.value, selectedFromId, selectedToId);
        
    } catch (err) {
        console.error('Error searching trains:', err);
        showError('Failed to search trains. Please try again later.');
    } finally {
        loading.style.display = 'none';
    }
}

/**
 * Update route display
 */
function updateRouteDisplay() {
    fromDisplay.textContent = fromInput.value;
    toDisplay.textContent = toInput.value;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    routeDate.textContent = currentDate.toLocaleDateString('en-US', options);
    
    routeDisplay.style.display = 'block';
}

/**
 * Display search results
 */
function displayResults(data) {
    resultsBody.innerHTML = '';
    currentTrips = [];
    
    if (!data.journeys || data.journeys.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
                No trains found for this route
            </td>
        `;
        resultsBody.appendChild(row);
        results.style.display = 'block';
        return;
    }
    
    // Extract all trips from journeys
    data.journeys.forEach(journey => {
        if (journey.trips) {
            journey.trips.forEach(trip => {
                currentTrips.push(trip);
            });
        }
    });
    
    // Sort by departure time
    currentTrips.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
    
    // Get current time for comparison
    const now = new Date();
    isToday = currentDate.toDateString() === now.toDateString();
    currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Render trips (with or without departed trains)
    renderTrips();
}

/**
 * Render trips based on filter settings
 */
function renderTrips() {
    resultsBody.innerHTML = '';
    const showDeparted = showDepartedCheckbox.checked;
    
    let visibleCount = 0;
    
    currentTrips.forEach(trip => {
        // Parse times
        const departureDate = parseDate(trip.departure_time);
        const arrivalDate = parseDate(trip.arrival_time);
        
        const departureTime = formatTime(departureDate);
        const arrivalTime = formatTime(arrivalDate);
        const duration = calculateDuration(departureDate, arrivalDate);
        
        // Determine if train has departed
        const departureMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();
        const isPast = isToday && departureMinutes < currentTime;
        
        // Skip departed trains if checkbox is not checked
        if (isPast && !showDeparted) {
            return;
        }
        
        visibleCount++;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="${isPast ? 'train-past' : 'train-upcoming'}">${trip.trip_short_name}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${departureTime}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${arrivalTime}</td>
            <td class="${isPast ? 'time-past' : 'duration'}">${duration}</td>
        `;
        
        resultsBody.appendChild(row);
    });
    
    // Show message if all trains are departed and hidden
    if (visibleCount === 0 && currentTrips.length > 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
                All trains for today have departed. Check "Show departed trains" to see them.
            </td>
        `;
        resultsBody.appendChild(row);
    }
    
    results.style.display = 'block';
}

/**
 * Parse date string from API
 */
function parseDate(dateStr) {
    // Remove timezone info for consistent parsing
    const cleanStr = dateStr.replace(/\.\d{3}[+-]\d{2}:\d{2}/, '');
    return new Date(cleanStr);
}

/**
 * Format time (HH:MM)
 */
function formatTime(date) {
    return date.toLocaleTimeString('et-EE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(start, end) {
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours === 0) {
        return `${mins}m`;
    }
    return `${hours}h ${mins}m`;
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    error.style.display = 'block';
    setTimeout(() => {
        error.style.display = 'none';
    }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
    error.style.display = 'none';
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
