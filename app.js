/**
 * Elron Train & Tartu Bus Timetable Web App
 * TUI-style terminal interface
 */

// API Configuration for different transport modes
const API_CONFIG = {
    train: {
        base: 'https://api.ridango.com/v2/64/intercity',
        endpoints: {
            STOPS: '/originstops',
            TRIPS: '/stopareas/trips/direct'
        },
        name: 'Rong',
        namePlural: 'Rongid',
        icon: '🚂',
        storageKey: 'elronRecentSearches',
        themeKey: 'elronTheme'
    },
    bus: {
        base: 'https://api.peatus.ee/routing/v1/routers/estonia/index/graphql',
        name: 'Buss',
        namePlural: 'Bussid',
        icon: '🚌',
        storageKey: 'tartuBusRecentSearches',
        themeKey: 'tartuBusTheme'
    }
};

// Constants
const MAX_RECENT_SEARCHES = 4;
const AUTOCOMPLETE_LIMIT = 10;
const ERROR_TIMEOUT = 5000;
const ANIMATION_DURATION = 300;
const MODE_STORAGE_KEY = 'transportMode';

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
    searchForm: null,
    modeTrain: null,
    modeBus: null
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
    currentTime: 0,
    transportMode: 'train', // 'train' or 'bus'
    busStops: [] // For caching bus stops with coordinates
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
    
    // Cache mode toggle buttons
    DOM.modeTrain = document.getElementById('modeTrain');
    DOM.modeBus = document.getElementById('modeBus');
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

    // Load saved transport mode
    loadTransportMode();

    // Set default date
    DOM.datePicker.value = formatDateForInput(state.currentDate);
    DOM.datePicker.min = formatDateForInput(new Date());

    // Load stations for current mode
    const stationsLoaded = await loadStations();
    if (!stationsLoaded) {
        const config = API_CONFIG[state.transportMode];
        showError(`${config.namePlural}e peatuste laadimine ebaõnnestus. Mõned funktsioonid ei pruugi olla saadaval.`);
    }

    // Set default stations
    setDefaultStations();

    // Setup autocomplete
    setupAutocomplete(DOM.fromInput, DOM.fromAutocomplete, 'from');
    setupAutocomplete(DOM.toInput, DOM.toAutocomplete, 'to');

    // Add event listeners
    DOM.searchBtn?.addEventListener('click', searchTrips);
    DOM.swapBtn?.addEventListener('click', swapStations);
    DOM.datePicker?.addEventListener('change', handleDateChange);
    DOM.showDepartedCheckbox?.addEventListener('change', handleShowDepartedToggle);
    DOM.themeToggle?.addEventListener('click', toggleTheme);
    
    // Transport mode toggle listeners
    DOM.modeTrain?.addEventListener('click', () => switchTransportMode('train'));
    DOM.modeBus?.addEventListener('click', () => switchTransportMode('bus'));

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
    
    // Update UI for current mode
    updateModeUI();

    // Load recent searches
    loadRecentSearches();

    // Auto-trigger search if there's a recent search
    const recentSearches = getRecentSearches();
    if (recentSearches.length > 0 && state.selectedFromId && state.selectedToId) {
        searchTrips();
    }
}

/**
 * Load saved transport mode from localStorage
 */
function loadTransportMode() {
    try {
        const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
        if (savedMode && API_CONFIG[savedMode]) {
            state.transportMode = savedMode;
        }
    } catch (e) {
        console.error('Error loading transport mode:', e);
    }
}

/**
 * Save transport mode to localStorage
 */
function saveTransportMode(mode) {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch (e) {
        console.error('Error saving transport mode:', e);
    }
}

/**
 * Switch between train and bus modes
 */
async function switchTransportMode(mode) {
    if (mode === state.transportMode) return;
    
    // Cancel any pending requests
    cancelPendingRequests();
    
    // Update state
    state.transportMode = mode;
    saveTransportMode(mode);
    
    // Reset selections
    state.selectedFromId = null;
    state.selectedToId = null;
    DOM.fromInput.value = '';
    DOM.toInput.value = '';
    
    // Hide results
    DOM.results.style.display = 'none';
    DOM.routeDisplay.style.display = 'none';
    
    // Update UI
    updateModeUI();
    
    // Reload stations for new mode
    const stationsLoaded = await loadStations();
    if (!stationsLoaded) {
        const config = API_CONFIG[state.transportMode];
        showError(`${config.namePlural}e peatuste laadimine ebaõnnestus.`);
    }
    
    // Load recent searches for new mode
    loadRecentSearches();
    
    // Update theme (different storage keys per mode)
    initTheme();
}

/**
 * Update UI elements based on current transport mode
 */
function updateModeUI() {
    const config = API_CONFIG[state.transportMode];
    const isTrain = state.transportMode === 'train';
    
    // Update mode toggle buttons
    if (DOM.modeTrain) {
        DOM.modeTrain.classList.toggle('active', isTrain);
    }
    if (DOM.modeBus) {
        DOM.modeBus.classList.toggle('active', !isTrain);
    }
    
    // Update button text
    if (DOM.searchBtn) {
        DOM.searchBtn.textContent = `Otsi ${config.name.toLowerCase()}eid`;
    }
    
    // Update loading text
    const loadingText = isTrain ? 'Laadin rongi sõiduplaane...' : 'Laadin bussi sõiduplaane...';
    if (DOM.loading) {
        DOM.loading.childNodes[0].textContent = loadingText;
    }
    
    // Update input placeholders
    if (DOM.fromInput) {
        DOM.fromInput.placeholder = isTrain ? 'Sisesta jaam...' : 'Sisesta peatus...';
    }
    if (DOM.toInput) {
        DOM.toInput.placeholder = isTrain ? 'Sisesta jaam...' : 'Sisesta peatus...';
    }
    
    // Update checkbox label
    const checkboxLabel = DOM.showDepartedCheckbox?.parentElement?.querySelector('span');
    if (checkboxLabel) {
        checkboxLabel.textContent = isTrain ? 'Näita väljunud ronge' : 'Näita väljunud busse';
    }
    
    // Update legend text
    const legend = document.querySelector('.legend');
    if (legend) {
        const upcomingText = isTrain ? '* tulevased rongid' : '* tulevad bussid';
        const pastText = isTrain ? '~ väljunud rongid' : '~ väljunud bussid';
        legend.innerHTML = `<span>${upcomingText}</span><span>${pastText}</span>`;
    }
    
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
        favicon.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${config.icon}</text></svg>`;
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
 * Load stations from API based on transport mode
 */
async function loadStations() {
    cancelPendingRequests();
    abortController = new AbortController();

    try {
        if (state.transportMode === 'train') {
            return await loadTrainStations();
        } else {
            return await loadBusStops();
        }
    } finally {
        abortController = null;
    }
}

/**
 * Load train stations from Ridango API
 */
async function loadTrainStations() {
    const config = API_CONFIG.train;
    
    try {
        const response = await fetch(`${config.base}${config.endpoints.STOPS}`, {
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Failed to load stations: ${response.status} ${response.statusText}`);
        }

        const stations = await response.json();
        
        // Transform to consistent format
        state.stations = stations.map(s => ({
            stop_area_id: s.stop_area_id,
            stop_name: s.stop_name,
            lat: null,
            lon: null
        }));

        // Sort stations alphabetically with Estonian locale
        state.stations.sort((a, b) => 
            a.stop_name.localeCompare(b.stop_name, 'et')
        );

        return true;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error loading train stations:', err);
        }
        state.stations = [];
        return false;
    }
}

/**
 * Load bus stops from peatus.ee GraphQL API
 */
async function loadBusStops() {
    const config = API_CONFIG.bus;
    
    try {
        const query = `{
            stops {
                gtfsId
                name
                lat
                lon
            }
        }`;

        const response = await fetch(config.base, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
            signal: abortController.signal
        });

        if (!response.ok) {
            throw new Error(`Failed to load bus stops: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(`GraphQL error: ${data.errors[0].message}`);
        }

        // Transform to consistent format and filter for Tartu area (approximate coordinates)
        // Tartu is around lat: 58.37, lon: 26.72
        const tartuStops = data.data.stops.filter(stop => {
            const lat = parseFloat(stop.lat);
            const lon = parseFloat(stop.lon);
            // Filter stops within roughly 15km of Tartu center
            return lat >= 58.25 && lat <= 58.50 && lon >= 26.55 && lon <= 26.90;
        });

        state.stations = tartuStops.map(s => ({
            stop_area_id: s.gtfsId,
            stop_name: s.name,
            lat: s.lat,
            lon: s.lon
        }));

        // Sort stops alphabetically with Estonian locale
        state.stations.sort((a, b) => 
            a.stop_name.localeCompare(b.stop_name, 'et')
        );

        // Store bus stops with coordinates for trip planning
        state.busStops = state.stations;

        return true;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error loading bus stops:', err);
        }
        state.stations = [];
        state.busStops = [];
        return false;
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
 * Get storage key for current transport mode
 */
function getStorageKey() {
    return API_CONFIG[state.transportMode].storageKey;
}

/**
 * Get recent searches from localStorage
 */
function getRecentSearches() {
    try {
        const stored = localStorage.getItem(getStorageKey());
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

        localStorage.setItem(getStorageKey(), JSON.stringify(searches));
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
            searchTrips();
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
 * Search for trips (trains or buses)
 */
async function searchTrips() {
    const from = resolveStation(DOM.fromInput, state.selectedFromId, true);
    const to = resolveStation(DOM.toInput, state.selectedToId, false);
    const config = API_CONFIG[state.transportMode];

    if (!from) {
        showError(state.transportMode === 'train' ? 'Palun vali kehtiv väljumisjaam' : 'Palun vali kehtiv väljumispeatus');
        return;
    }

    if (!to) {
        showError(state.transportMode === 'train' ? 'Palun vali kehtiv sihtjaam' : 'Palun vali kehtiv sihtpeatus');
        return;
    }

    if (from.id === to.id) {
        showError(state.transportMode === 'train' ? 'Väljumis- ja sihtjaam ei saa olla samad' : 'Väljumis- ja sihtpeatus ei saa olla samad');
        return;
    }

    // Show loading
    hideError();
    DOM.results.style.display = 'none';
    DOM.loading.style.display = 'block';

    cancelPendingRequests();
    abortController = new AbortController();

    try {
        let data;
        if (state.transportMode === 'train') {
            data = await searchTrainTrips(from.id, to.id);
        } else {
            data = await searchBusTrips(from, to);
        }

        // Update route display
        updateRouteDisplay(from.name, to.name);

        // Display results
        displayResults(data);

        // Save to recent searches
        saveRecentSearch(from.name, to.name, from.id, to.id);

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(`Error searching ${config.namePlural.toLowerCase()}:`, err);
            showError(`${config.namePlural}e otsimine ebaõnnestus. Palun proovi hiljem uuesti.`);
        }
    } finally {
        DOM.loading.style.display = 'none';
        abortController = null;
    }
}

/**
 * Search for train trips
 */
async function searchTrainTrips(fromId, toId) {
    const config = API_CONFIG.train;
    const dateStr = formatDateForInput(state.currentDate);

    const response = await fetch(`${config.base}${config.endpoints.TRIPS}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            channel: 'web',
            origin_stop_area_id: fromId,
            destination_stop_area_id: toId,
            date: dateStr
        }),
        signal: abortController.signal
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Search for bus trips using GraphQL
 */
async function searchBusTrips(from, to) {
    const config = API_CONFIG.bus;
    const fromStop = state.busStops.find(s => s.stop_area_id === from.id);
    const toStop = state.busStops.find(s => s.stop_area_id === to.id);

    if (!fromStop || !fromStop.lat || !fromStop.lon) {
        throw new Error('From stop coordinates not found');
    }
    if (!toStop || !toStop.lat || !toStop.lon) {
        throw new Error('To stop coordinates not found');
    }

    const dateStr = formatDateForInput(state.currentDate);
    const timeStr = '12:00'; // Default time, could be made configurable

    const query = `
        query {
            plan(
                from: {lat: ${fromStop.lat}, lon: ${fromStop.lon}}
                to: {lat: ${toStop.lat}, lon: ${toStop.lon}}
                date: "${dateStr}"
                time: "${timeStr}"
                numItineraries: 10
            ) {
                itineraries {
                    legs {
                        mode
                        startTime
                        endTime
                        duration
                        route {
                            shortName
                        }
                        from {
                            name
                            stop {
                                gtfsId
                            }
                        }
                        to {
                            name
                            stop {
                                gtfsId
                            }
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch(config.base, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: abortController.signal
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    // Transform bus results to match train format
    return transformBusResults(result.data.plan, from.stop_name, to.stop_name);
}

/**
 * Transform bus API results to match train format
 */
function transformBusResults(plan, fromName, toName) {
    const journeys = [];

    if (!plan || !plan.itineraries) {
        return { journeys: [] };
    }

    plan.itineraries.forEach(itinerary => {
        const busLegs = itinerary.legs.filter(leg => leg.mode === 'BUS');

        busLegs.forEach(leg => {
            const startTime = new Date(parseInt(leg.startTime));
            const endTime = new Date(parseInt(leg.endTime));

            journeys.push({
                trips: [{
                    trip_short_name: leg.route?.shortName || 'Buss',
                    departure_time: startTime.toISOString(),
                    arrival_time: endTime.toISOString(),
                    from_stop_name: leg.from?.name || fromName,
                    to_stop_name: leg.to?.name || toName
                }]
            });
        });
    });

    return { journeys };
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
    const config = API_CONFIG[state.transportMode];

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
    const config = API_CONFIG[state.transportMode];
    const row = document.createElement('tr');
    row.innerHTML = `
        <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
            Sellel liinil ${config.namePlural.toLowerCase()}e ei leitud
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
    const config = API_CONFIG[state.transportMode];
    const transportType = config.name.toLowerCase();

    let visibleCount = 0;

    state.currentTrips.forEach(trip => {
        const departureDate = parseDate(trip.departure_time);
        const arrivalDate = parseDate(trip.arrival_time);

        const departureTime = formatTime(departureDate);
        const arrivalTime = formatTime(arrivalDate);
        const duration = calculateDuration(departureDate, arrivalDate);

        // Determine if trip has departed
        const departureMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();
        const isPast = state.isToday && departureMinutes < state.currentTime;

        // Skip departed trips if checkbox is not checked
        if (isPast && !showDeparted) {
            return;
        }

        visibleCount++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="${isPast ? 'trip-past' : 'trip-upcoming'}">${escapeHtml(trip.trip_short_name)}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${departureTime}</td>
            <td class="${isPast ? 'time-past' : 'time-upcoming'}">${arrivalTime}</td>
            <td class="${isPast ? 'time-past' : 'duration'}">${duration}</td>
        `;

        DOM.resultsBody.appendChild(row);
    });

    // Show message if all trips are departed and hidden
    if (visibleCount === 0 && state.currentTrips.length > 0) {
        const pastText = state.transportMode === 'train' ? 'rongid' : 'bussid';
        const actionText = state.transportMode === 'train' ? 'Näita väljunud ronge' : 'Näita väljunud busse';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; color: var(--muted); padding: 20px 0;">
                Kõik tänased ${pastText} on väljunud. Märgi "${actionText}", et neid näha.
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
        searchTrips();
    }
}

/**
 * Handle form submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    searchTrips();
}

/**
 * Theme toggle functionality
 */
function getThemeKey() {
    return API_CONFIG[state.transportMode].themeKey;
}

function initTheme() {
    const savedTheme = localStorage.getItem(getThemeKey());
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
    localStorage.setItem(getThemeKey(), theme);
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
