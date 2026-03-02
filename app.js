/**
 * Elron Train Timetable Web App
 * TUI-style terminal interface
 */

// API Configuration
const API_BASE = 'https://api.ridango.com/v2/64/intercity';
const ENDPOINTS = {
    STOPS: '/originstops',
    TRIPS: '/stopareas/trips/direct'
};

// Constants
const MAX_RECENT_SEARCHES = 3;
const STORAGE_KEY = 'elronRecentSearches';
const AUTOCOMPLETE_LIMIT = 10;
const ERROR_TIMEOUT = 5000;
const ANIMATION_DURATION = 300;

// Date/Time Formatting
const LOCALE = {
    DATE: 'et-EE',
    TIME: 'et-EE'
};

// DOM Elements Cache
const DOM = {
    fromInput: null,
    toInput: null,
    fromAutocomplete: null,
    toAutocomplete: null,
    datePicker: null,
    searchBtn: null,
    swapBtn: null,
    showDepartedCheckbox: null,
    recentSearchesSection: null,
    recentList: null,
    routeDisplay: null,
    fromDisplay: null,
    toDisplay: null,
    routeDate: null,
    loading: null,
    results: null,
    resultsBody: null,
    error: null,
    errorText: null,
    themeToggle: null,
    themeIcon: null,
    searchForm: null
};

// Application State
const state = {
    stations: [],
    currentDate: new Date(),
    selectedFromId: null,
    selectedToId: null,
    activeAutocomplete: null,
    selectedAutocompleteIndex: -1,
    currentTrips: [],
    isToday: false,
    currentTime: 0
};

// AbortController for pending requests
let abortController = null;

/**
 * Cache DOM elements
 */
function cacheDomElements() {
    const elements = {
        fromInput: 'fromStation',
        toInput: 'toStation',
        fromAutocomplete: 'fromAutocomplete',
        toAutocomplete: 'toAutocomplete',
        datePicker: 'datePicker',
        searchBtn: 'searchBtn',
        swapBtn: 'swapBtn',
        showDepartedCheckbox: 'showDeparted',
        recentSearchesSection: 'recentSearches',
        recentList: 'recentList',
        routeDisplay: 'routeDisplay',
        fromDisplay: 'fromDisplay',
        toDisplay: 'toDisplay',
        routeDate: 'routeDate',
        loading: 'loading',
        results: 'results',
        resultsBody: 'resultsBody',
        error: 'error',
        errorText: 'errorText',
        themeToggle: 'themeToggle',
        themeIcon: 'themeIcon',
        searchForm: 'searchForm'
    };

    for (const [key, id] of Object.entries(elements)) {
        DOM[key] = document.getElementById(id);
        if (!DOM[key]) {
            console.warn(`Element not found: #${id}`);
        }
    }
}

/**
 * Initialize the application
 */
async function init() {
    cacheDomElements();
    
    if (!DOM.fromInput || !DOM.toInput) {
        console.error('Critical DOM elements missing');
        return;
    }

    // Cancel any pending requests on page unload
    window.addEventListener('beforeunload', cancelPendingRequests);

    // Set default date
    DOM.datePicker.value = formatDateForInput(state.currentDate);
    DOM.datePicker.min = formatDateForInput(new Date());

    // Load stations
    const stationsLoaded = await loadStations();
    if (!stationsLoaded) {
        showError('Jaamade laadimine ebaõnnestus. Mõned funktsioonid ei pruugi olla saadaval.');
    }

    // Set default stations
    setDefaultStations();

    // Setup autocomplete
    setupAutocomplete(DOM.fromInput, DOM.fromAutocomplete, 'from');
    setupAutocomplete(DOM.toInput, DOM.toAutocomplete, 'to');

    // Add event listeners
    DOM.searchBtn?.addEventListener('click', searchTrains);
    DOM.swapBtn?.addEventListener('click', swapStations);
    DOM.datePicker?.addEventListener('change', handleDateChange);
    DOM.showDepartedCheckbox?.addEventListener('change', handleShowDepartedToggle);
    DOM.themeToggle?.addEventListener('click', toggleTheme);

    // Add Enter key handlers for inputs to trigger search
    DOM.fromInput?.addEventListener('keypress', handleInputKeypress);
    DOM.toInput?.addEventListener('keypress', handleInputKeypress);
    DOM.datePicker?.addEventListener('keypress', handleInputKeypress);

    // Handle form submit to trigger search
    DOM.searchForm?.addEventListener('submit', handleFormSubmit);

    // Close autocomplete when clicking outside
    document.addEventListener('click', handleDocumentClick);

    // Initialize theme
    initTheme();

    // Load recent searches
    loadRecentSearches();

    // Auto-trigger search if there's a recent search
    const recentSearches = getRecentSearches();
    if (recentSearches.length > 0 && state.selectedFromId && state.selectedToId) {
        searchTrains();
    }
}

/**
 * Cancel pending fetch requests
 */
function cancelPendingRequests() {
    if (abortController) {
        abortController.abort();
    }
}

/**
 * Handle date picker change
 */
function handleDateChange() {
    if (DOM.datePicker.value) {
        state.currentDate = new Date(DOM.datePicker.value);
    }
}

/**
 * Handle show departed toggle
 */
function handleShowDepartedToggle() {
    if (state.currentTrips.length > 0) {
        renderTrips();
    }
}

/**
 * Handle document click for closing autocomplete
 */
function handleDocumentClick(e) {
    if (!e.target.closest('.autocomplete-wrapper')) {
        closeAllAutocomplete();
    }
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Load stations from API
 */
async function loadStations() {
    cancelPendingRequests();
    abortController = new AbortController();

    try {
        const response = await fetch(`${API_BASE}${ENDPOINTS.STOPS}`, {
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Failed to load stations: ${response.status} ${response.statusText}`);
        }

        state.stations = await response.json();

        // Sort stations alphabetically with Estonian locale
        state.stations.sort((a, b) => 
            a.stop_name.localeCompare(b.stop_name, 'et')
        );

        return true;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error loading stations:', err);
        }
        state.stations = [];
        return false;
    } finally {
        abortController = null;
    }
}

/**
 * Set default stations
 */
function setDefaultStations() {
    const recentSearches = getRecentSearches();

    if (recentSearches.length > 0) {
        const lastSearch = recentSearches[0];
        const fromStation = state.stations.find(s => s.stop_name === lastSearch.from);
        const toStation = state.stations.find(s => s.stop_name === lastSearch.to);

        if (fromStation && toStation) {
            DOM.fromInput.value = fromStation.stop_name;
            state.selectedFromId = fromStation.stop_area_id;
            DOM.toInput.value = toStation.stop_name;
            state.selectedToId = toStation.stop_area_id;
            return;
        }
    }

    // Fallback to Tallinn-Tartu
    const tallinn = state.stations.find(s => 
        s.stop_name.toLowerCase().includes('tallinn')
    );
    const tartu = state.stations.find(s => 
        s.stop_name.toLowerCase().includes('tartu')
    );

    if (tallinn) {
        DOM.fromInput.value = tallinn.stop_name;
        state.selectedFromId = tallinn.stop_area_id;
    }
    if (tartu) {
        DOM.toInput.value = tartu.stop_name;
        state.selectedToId = tartu.stop_area_id;
    }
}

/**
 * Swap from and to stations
 */
function swapStations() {
    const tempValue = DOM.fromInput.value;
    const tempId = state.selectedFromId;

    DOM.fromInput.value = DOM.toInput.value;
    state.selectedFromId = state.selectedToId;

    DOM.toInput.value = tempValue;
    state.selectedToId = tempId;

    // Add animation
    DOM.swapBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        DOM.swapBtn.style.transform = '';
    }, ANIMATION_DURATION);
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
    if (!fromName || !toName) return;

    try {
        let searches = getRecentSearches();

        // Remove duplicates
        searches = searches.filter(s => 
            !(s.from === fromName && s.to === toName)
        );

        // Add new search at the beginning
        searches.unshift({
            from: fromName,
            to: toName,
            fromId: fromId,
            toId: toId,
            timestamp: Date.now()
        });

        // Keep only the last N searches
        searches = searches.slice(0, MAX_RECENT_SEARCHES);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
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
    if (!DOM.recentSearchesSection || searches.length === 0) {
        if (DOM.recentSearchesSection) {
            DOM.recentSearchesSection.style.display = 'none';
        }
        return;
    }

    DOM.recentList.innerHTML = '';

    searches.forEach(search => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <span class="from">${escapeHtml(search.from)}</span>
            <span class="arrow">→</span>
            <span class="to">${escapeHtml(search.to)}</span>
        `;

        item.addEventListener('click', () => {
            DOM.fromInput.value = search.from;
            state.selectedFromId = search.fromId;
            DOM.toInput.value = search.to;
            state.selectedToId = search.toId;
            searchTrains();
        });

        DOM.recentList.appendChild(item);
    });

    DOM.recentSearchesSection.style.display = 'block';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Setup autocomplete for an input field
 */
function setupAutocomplete(input, list, type) {
    if (!input || !list) return;

    input.addEventListener('input', debounce(() => {
        handleAutocompleteInput(input, list, type);
    }, 150));

    input.addEventListener('keydown', (e) => handleAutocompleteKeydown(e, list));
    input.addEventListener('focus', () => handleAutocompleteFocus(input, list, type));
}

/**
 * Debounce function calls
 */
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Handle autocomplete input
 */
function handleAutocompleteInput(input, list, type) {
    const value = input.value.toLowerCase().trim();

    if (value.length < 1) {
        closeAutocomplete(list);
        if (type === 'from') state.selectedFromId = null;
        else state.selectedToId = null;
        return;
    }

    const matches = state.stations
        .filter(s => s.stop_name.toLowerCase().includes(value))
        .slice(0, AUTOCOMPLETE_LIMIT);

    if (matches.length > 0) {
        renderAutocomplete(list, matches, value, type);
        openAutocomplete(list);
    } else {
        closeAutocomplete(list);
    }
}

/**
 * Handle autocomplete keyboard navigation
 */
function handleAutocompleteKeydown(e, list) {
    if (!list.classList.contains('active')) return;

    const items = list.querySelectorAll('.autocomplete-item');

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            state.selectedAutocompleteIndex = Math.min(
                state.selectedAutocompleteIndex + 1,
                items.length - 1
            );
            updateAutocompleteSelection(items);
            break;
        case 'ArrowUp':
            e.preventDefault();
            state.selectedAutocompleteIndex = Math.max(
                state.selectedAutocompleteIndex - 1,
                -1
            );
            updateAutocompleteSelection(items);
            break;
        case 'Enter':
            e.preventDefault();
            if (state.selectedAutocompleteIndex >= 0 && items[state.selectedAutocompleteIndex]) {
                items[state.selectedAutocompleteIndex].click();
            }
            break;
        case 'Escape':
            closeAutocomplete(list);
            break;
    }
}

/**
 * Handle autocomplete focus
 */
function handleAutocompleteFocus(input, list, type) {
    if (input.value.length > 0) {
        const value = input.value.toLowerCase().trim();
        const matches = state.stations
            .filter(s => s.stop_name.toLowerCase().includes(value))
            .slice(0, AUTOCOMPLETE_LIMIT);

        if (matches.length > 0) {
            renderAutocomplete(list, matches, value, type);
            openAutocomplete(list);
        }
    }
}

/**
 * Render autocomplete list
 */
function renderAutocomplete(list, matches, query, type) {
    list.innerHTML = '';
    state.selectedAutocompleteIndex = -1;

    matches.forEach(station => {
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
                escapeHtml(name.substring(0, matchIndex)) +
                `<span class="autocomplete-item-highlight">${
                    escapeHtml(name.substring(matchIndex, matchIndex + query.length))
                }</span>` +
                escapeHtml(name.substring(matchIndex + query.length));
        } else {
            item.textContent = name;
        }

        item.addEventListener('click', () => {
            if (type === 'from') {
                DOM.fromInput.value = station.stop_name;
                state.selectedFromId = station.stop_area_id;
            } else {
                DOM.toInput.value = station.stop_name;
                state.selectedToId = station.stop_area_id;
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
        item.classList.toggle('selected', index === state.selectedAutocompleteIndex);
        if (index === state.selectedAutocompleteIndex) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

/**
 * Open autocomplete list
 */
function openAutocomplete(list) {
    if (!list) return;
    list.classList.add('active');
    state.activeAutocomplete = list;
}

/**
 * Close autocomplete list
 */
function closeAutocomplete(list) {
    if (!list) return;
    list.classList.remove('active');
    state.selectedAutocompleteIndex = -1;
    if (state.activeAutocomplete === list) {
        state.activeAutocomplete = null;
    }
}

/**
 * Close all autocomplete lists
 */
function closeAllAutocomplete() {
    closeAutocomplete(DOM.fromAutocomplete);
    closeAutocomplete(DOM.toAutocomplete);
}

/**
 * Validate and resolve station selection
 */
function resolveStation(input, selectedId, isFrom) {
    if (selectedId && input.value) {
        return { id: selectedId, name: input.value };
    }

    // Try to find exact match
    const exactMatch = state.stations.find(s =>
        s.stop_name.toLowerCase() === input.value.toLowerCase().trim()
    );

    if (exactMatch) {
        if (isFrom) state.selectedFromId = exactMatch.stop_area_id;
        else state.selectedToId = exactMatch.stop_area_id;
        return { id: exactMatch.stop_area_id, name: exactMatch.stop_name };
    }

    return null;
}

/**
 * Search for trains
 */
async function searchTrains() {
    const from = resolveStation(DOM.fromInput, state.selectedFromId, true);
    const to = resolveStation(DOM.toInput, state.selectedToId, false);

    if (!from) {
        showError('Palun vali kehtiv väljumisjaam');
        return;
    }

    if (!to) {
        showError('Palun vali kehtiv sihtjaam');
        return;
    }

    if (from.id === to.id) {
        showError('Väljumis- ja sihtjaam ei saa olla samad');
        return;
    }

    // Show loading
    hideError();
    DOM.results.style.display = 'none';
    DOM.loading.style.display = 'block';

    cancelPendingRequests();
    abortController = new AbortController();

    try {
        const dateStr = formatDateForInput(state.currentDate);

        const response = await fetch(`${API_BASE}${ENDPOINTS.TRIPS}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: 'web',
                origin_stop_area_id: from.id,
                destination_stop_area_id: to.id,
                date: dateStr
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Update route display
        updateRouteDisplay(from.name, to.name);

        // Display results
        displayResults(data);

        // Save to recent searches
        saveRecentSearch(from.name, to.name, from.id, to.id);

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error searching trains:', err);
            showError('Rongide otsimine ebaõnnestus. Palun proovi hiljem uuesti.');
        }
    } finally {
        DOM.loading.style.display = 'none';
        abortController = null;
    }
}

/**
 * Update route display
 */
function updateRouteDisplay(fromName, toName) {
    DOM.fromDisplay.textContent = fromName;
    DOM.toDisplay.textContent = toName;

    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    DOM.routeDate.textContent = state.currentDate.toLocaleDateString(LOCALE.DATE, options);
    DOM.routeDisplay.style.display = 'block';
}

/**
 * Display search results
 */
function displayResults(data) {
    DOM.resultsBody.innerHTML = '';
    state.currentTrips = [];

    if (!data.journeys || data.journeys.length === 0) {
        renderEmptyState();
        return;
    }

    // Extract all trips from journeys
    data.journeys.forEach(journey => {
        if (journey.trips) {
            state.currentTrips.push(...journey.trips);
        }
    });

    // Sort by departure time
    state.currentTrips.sort((a, b) => 
        new Date(a.departure_time) - new Date(b.departure_time)
    );

    // Get current time for comparison
    const now = new Date();
    state.isToday = state.currentDate.toDateString() === now.toDateString();
    state.currentTime = now.getHours() * 60 + now.getMinutes();

    // Render trips
    renderTrips();
}

/**
 * Render empty state
 */
function renderEmptyState() {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
            Sellel liinil ronge ei leitud
        </td>
    `;
    DOM.resultsBody.appendChild(row);
    DOM.results.style.display = 'block';
}

/**
 * Render trips based on filter settings
 */
function renderTrips() {
    DOM.resultsBody.innerHTML = '';
    const showDeparted = DOM.showDepartedCheckbox?.checked ?? false;

    let visibleCount = 0;

    state.currentTrips.forEach(trip => {
        const departureDate = parseDate(trip.departure_time);
        const arrivalDate = parseDate(trip.arrival_time);

        const departureTime = formatTime(departureDate);
        const arrivalTime = formatTime(arrivalDate);
        const duration = calculateDuration(departureDate, arrivalDate);

        // Determine if train has departed
        const departureMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();
        const isPast = state.isToday && departureMinutes < state.currentTime;

        // Skip departed trains if checkbox is not checked
        if (isPast && !showDeparted) {
            return;
        }

        visibleCount++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="${isPast ? 'train-past' : 'train-upcoming'}">${escapeHtml(trip.trip_short_name)}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${departureTime}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${arrivalTime}</td>
            <td class="${isPast ? 'time-past' : 'duration'}">${duration}</td>
        `;

        DOM.resultsBody.appendChild(row);
    });

    // Show message if all trains are departed and hidden
    if (visibleCount === 0 && state.currentTrips.length > 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
                Kõik tänased rongid on väljunud. Märgi "Näita väljunud ronge", et neid näha.
            </td>
        `;
        DOM.resultsBody.appendChild(row);
    }

    DOM.results.style.display = 'block';
}

/**
 * Parse date string from API (ISO 8601 format)
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date();

    // Handle various ISO 8601 formats
    // Remove timezone offset if present (e.g., +02:00) and parse
    const cleanStr = dateStr.replace(/\.\d{3}[+-]\d{2}:\d{2}$/, '');
    const date = new Date(cleanStr);

    // Check if valid
    if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateStr);
        return new Date();
    }

    return date;
}

/**
 * Format time (HH:MM)
 */
function formatTime(date) {
    return date.toLocaleTimeString(LOCALE.TIME, {
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

    if (diffMins < 0) {
        return '0m';
    }

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
    DOM.errorText.textContent = message;
    DOM.error.style.display = 'block';

    // Auto-hide after timeout
    setTimeout(() => {
        hideError();
    }, ERROR_TIMEOUT);
}

/**
 * Hide error message
 */
function hideError() {
    DOM.error.style.display = 'none';
}

/**
 * Handle Enter key press on inputs
 */
function handleInputKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchTrains();
    }
}

/**
 * Handle form submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    searchTrains();
}

/**
 * Theme toggle functionality
 */
const THEME_KEY = 'elronTheme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function updateThemeIcon(theme) {
    if (DOM.themeIcon) {
        DOM.themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
