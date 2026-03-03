/**
 * Elron Train, Tartu Bus & Ferry Timetable Web App
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
    },
    ferry: {
        name: 'Praam',
        namePlural: 'Praamid',
        icon: '⛴️',
        storageKey: 'ferryRecentSearches',
        themeKey: 'ferryTheme'
    }
};

// Ferry ports data (static - based on TS Laevad routes)
const FERRY_PORTS = [
    { stop_area_id: 'virtsu', stop_name: 'Virtsu', lat: 58.57, lon: 23.52, region: 'mandri' },
    { stop_area_id: 'kuivastu', stop_name: 'Kuivastu', lat: 58.57, lon: 23.38, region: 'saaremaa' },
    { stop_area_id: 'rohukula', stop_name: 'Rohuküla', lat: 58.90, lon: 23.43, region: 'mandri' },
    { stop_area_id: 'heltermaa', stop_name: 'Heltermaa', lat: 59.00, lon: 22.90, region: 'hiiumaa' },
    { stop_area_id: 'sare', stop_name: 'Sõru', lat: 58.68, lon: 22.60, region: 'hiiumaa' },
    { stop_area_id: 'triigi', stop_name: 'Triigi', lat: 58.72, lon: 22.72, region: 'saaremaa' }
];

// Ferry schedules (static data based on typical TS Laevad schedules)
// These are approximate schedules - in production, this could be fetched from an API
const FERRY_SCHEDULES = {
    'virtsu-kuivastu': {
        route: 'Virtsu → Kuivastu',
        reverse: 'kuivastu-virtsu',
        duration: 35, // minutes
        schedule: [
            { depart: '06:00', arrive: '06:35' },
            { depart: '07:00', arrive: '07:35' },
            { depart: '08:00', arrive: '08:35' },
            { depart: '09:00', arrive: '09:35' },
            { depart: '10:00', arrive: '10:35' },
            { depart: '11:00', arrive: '11:35' },
            { depart: '12:00', arrive: '12:35' },
            { depart: '13:00', arrive: '13:35' },
            { depart: '14:00', arrive: '14:35' },
            { depart: '15:00', arrive: '15:35' },
            { depart: '16:00', arrive: '16:35' },
            { depart: '17:00', arrive: '17:35' },
            { depart: '18:00', arrive: '18:35' },
            { depart: '19:00', arrive: '19:35' },
            { depart: '20:00', arrive: '20:35' },
            { depart: '21:00', arrive: '21:35' },
            { depart: '22:00', arrive: '22:35' }
        ]
    },
    'kuivastu-virtsu': {
        route: 'Kuivastu → Virtsu',
        reverse: 'virtsu-kuivastu',
        duration: 35, // minutes
        schedule: [
            { depart: '06:30', arrive: '07:05' },
            { depart: '07:30', arrive: '08:05' },
            { depart: '08:30', arrive: '09:05' },
            { depart: '09:30', arrive: '10:05' },
            { depart: '10:30', arrive: '11:05' },
            { depart: '11:30', arrive: '12:05' },
            { depart: '12:30', arrive: '13:05' },
            { depart: '13:30', arrive: '14:05' },
            { depart: '14:30', arrive: '15:05' },
            { depart: '15:30', arrive: '16:05' },
            { depart: '16:30', arrive: '17:05' },
            { depart: '17:30', arrive: '18:05' },
            { depart: '18:30', arrive: '19:05' },
            { depart: '19:30', arrive: '20:05' },
            { depart: '20:30', arrive: '21:05' },
            { depart: '21:30', arrive: '22:05' },
            { depart: '22:30', arrive: '23:05' }
        ]
    },
    'rohukula-heltermaa': {
        route: 'Rohuküla → Heltermaa',
        reverse: 'heltermaa-rohukula',
        duration: 75, // minutes
        schedule: [
            { depart: '06:00', arrive: '07:15' },
            { depart: '08:00', arrive: '09:15' },
            { depart: '10:00', arrive: '11:15' },
            { depart: '12:00', arrive: '13:15' },
            { depart: '14:00', arrive: '15:15' },
            { depart: '16:00', arrive: '17:15' },
            { depart: '18:00', arrive: '19:15' },
            { depart: '20:00', arrive: '21:15' }
        ]
    },
    'heltermaa-rohukula': {
        route: 'Heltermaa → Rohuküla',
        reverse: 'rohukula-heltermaa',
        duration: 75, // minutes
        schedule: [
            { depart: '07:30', arrive: '08:45' },
            { depart: '09:30', arrive: '10:45' },
            { depart: '11:30', arrive: '12:45' },
            { depart: '13:30', arrive: '14:45' },
            { depart: '15:30', arrive: '16:45' },
            { depart: '17:30', arrive: '18:45' },
            { depart: '19:30', arrive: '20:45' },
            { depart: '21:30', arrive: '22:45' }
        ]
    },
    'soru-triigi': {
        route: 'Sõru → Triigi',
        reverse: 'triigi-soru',
        duration: 60, // minutes
        schedule: [
            { depart: '06:00', arrive: '07:00' },
            { depart: '09:00', arrive: '10:00' },
            { depart: '11:00', arrive: '12:00' },
            { depart: '13:00', arrive: '14:00' },
            { depart: '15:00', arrive: '16:00' },
            { depart: '17:00', arrive: '18:00' },
            { depart: '19:00', arrive: '20:00' },
            { depart: '21:00', arrive: '22:00' }
        ]
    },
    'triigi-soru': {
        route: 'Triigi → Sõru',
        reverse: 'soru-triigi',
        duration: 60, // minutes
        schedule: [
            { depart: '07:00', arrive: '08:00' },
            { depart: '10:00', arrive: '11:00' },
            { depart: '12:00', arrive: '13:00' },
            { depart: '14:00', arrive: '15:00' },
            { depart: '16:00', arrive: '17:00' },
            { depart: '18:00', arrive: '19:00' },
            { depart: '20:00', arrive: '21:00' },
            { depart: '22:00', arrive: '23:00' }
        ]
    }
};

// Valid ferry route combinations (only direct routes)
const VALID_FERRY_ROUTES = {
    'virtsu': ['kuivastu'],
    'kuivastu': ['virtsu'],
    'rohukula': ['heltermaa'],
    'heltermaa': ['rohukula'],
    'soru': ['triigi'],
    'triigi': ['soru']
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
    modeBus: null,
    modeFerry: null
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
    transportMode: 'train', // 'train', 'bus', or 'ferry'
    busStops: [] // For caching bus stops with coordinates
};

// Cache for stops data to prevent redundant API calls when switching transport types
const stopsCache = {
    train: { data: null, timestamp: 0 },
    bus: { data: null, timestamp: 0 }
};

// Cache expiration time: 5 minutes
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

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
    DOM.modeFerry = document.getElementById('modeFerry');
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
    
    // Transport mode toggle listeners - use event delegation for Safari compatibility
    const modeToggle = document.querySelector('.mode-toggle');
    if (modeToggle) {
        modeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            console.log('Mode button clicked:', btn?.id);
            if (btn) {
                const mode = btn.id === 'modeTrain' ? 'train' :
                            btn.id === 'modeBus' ? 'bus' : 'ferry';
                console.log('Switching to mode:', mode);
                switchTransportMode(mode);
            }
        });
    }

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
 * Switch between train, bus, and ferry modes
 */
async function switchTransportMode(mode) {
    console.log('switchTransportMode called with:', mode, 'current mode:', state.transportMode);
    if (mode === state.transportMode) {
        console.log('Mode already active, returning');
        return;
    }
    
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
    const isBus = state.transportMode === 'bus';
    
    // Update mode toggle buttons
    if (DOM.modeTrain) {
        DOM.modeTrain.classList.toggle('active', isTrain);
    }
    if (DOM.modeBus) {
        DOM.modeBus.classList.toggle('active', isBus);
    }
    if (DOM.modeFerry) {
        DOM.modeFerry.classList.toggle('active', state.transportMode === 'ferry');
    }
    
    // Update button text
    if (DOM.searchBtn) {
        DOM.searchBtn.textContent = `Otsi ${config.name.toLowerCase()}eid`;
    }
    
    // Update loading text
    let loadingText;
    if (isTrain) {
        loadingText = 'Laadin rongi sõiduplaane...';
    } else if (isBus) {
        loadingText = 'Laadin bussi sõiduplaane...';
    } else {
        loadingText = 'Laadin praami sõiduplaane...';
    }
    if (DOM.loading) {
        DOM.loading.childNodes[0].textContent = loadingText;
    }
    
    // Update input placeholders
    if (DOM.fromInput) {
        DOM.fromInput.placeholder = isTrain ? 'Sisesta jaam...' : (isBus ? 'Sisesta peatus...' : 'Sisesta sadam...');
    }
    if (DOM.toInput) {
        DOM.toInput.placeholder = isTrain ? 'Sisesta jaam...' : (isBus ? 'Sisesta peatus...' : 'Sisesta sadam...');
    }
    
    // Update checkbox label
    const checkboxLabel = DOM.showDepartedCheckbox?.parentElement?.querySelector('span');
    if (checkboxLabel) {
        let labelText;
        if (isTrain) {
            labelText = 'Näita väljunud ronge';
        } else if (isBus) {
            labelText = 'Näita väljunud busse';
        } else {
            labelText = 'Näita väljunud praame';
        }
        checkboxLabel.textContent = labelText;
    }
    
    // Update legend text
    const legend = document.querySelector('.legend');
    if (legend) {
        let upcomingText, pastText;
        if (isTrain) {
            upcomingText = '* tulevased rongid';
            pastText = '~ väljunud rongid';
        } else if (isBus) {
            upcomingText = '* tulevad bussid';
            pastText = '~ väljunud bussid';
        } else {
            upcomingText = '* tulevad praamid';
            pastText = '~ väljunud praamid';
        }
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
        } else if (state.transportMode === 'bus') {
            return await loadBusStops();
        } else {
            return await loadFerryPorts();
        }
    } finally {
        abortController = null;
    }
}

/**
 * Load train stations from Ridango API with caching
 */
async function loadTrainStations() {
    const config = API_CONFIG.train;
    const now = Date.now();

    // Check cache first
    if (stopsCache.train.data && (now - stopsCache.train.timestamp) < CACHE_EXPIRATION_MS) {
        // Use cached data
        state.stations = stopsCache.train.data;
        return true;
    }

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

        // Store in cache
        stopsCache.train.data = [...state.stations];
        stopsCache.train.timestamp = Date.now();

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
 * Load bus stops from peatus.ee GraphQL API with caching
 */
async function loadBusStops() {
    const config = API_CONFIG.bus;
    const now = Date.now();

    // Check cache first
    if (stopsCache.bus.data && (now - stopsCache.bus.timestamp) < CACHE_EXPIRATION_MS) {
        // Use cached data
        state.stations = stopsCache.bus.data;
        state.busStops = stopsCache.bus.data;
        return true;
    }

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
        state.busStops = [...state.stations];

        // Store in cache
        stopsCache.bus.data = [...state.stations];
        stopsCache.bus.timestamp = Date.now();

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
 * Load ferry ports (static data)
 */
async function loadFerryPorts() {
    // Use static data for ferry ports
    state.stations = [...FERRY_PORTS];
    
    // Sort ports alphabetically with Estonian locale
    state.stations.sort((a, b) => 
        a.stop_name.localeCompare(b.stop_name, 'et')
    );
    
    return true;
}

/**
 * Set default stations
 */
function setDefaultStations() {
    const isFerry = state.transportMode === 'ferry';
    
    if (isFerry) {
        // Set default ferry route: Virtsu -> Kuivastu
        const virtsu = state.stations.find(s => s.stop_area_id === 'virtsu');
        const kuivastu = state.stations.find(s => s.stop_area_id === 'kuivastu');
        
        if (virtsu && kuivastu) {
            state.selectedFromId = virtsu.stop_area_id;
            state.selectedToId = kuivastu.stop_area_id;
            DOM.fromInput.value = virtsu.stop_name;
            DOM.toInput.value = kuivastu.stop_name;
        }
    } else if (state.stations.length >= 2) {
        // Default for train/bus: first and second stations
        state.selectedFromId = state.stations[0].stop_area_id;
        state.selectedToId = state.stations[1].stop_area_id;
        DOM.fromInput.value = state.stations[0].stop_name;
        DOM.toInput.value = state.stations[1].stop_name;
    }
}

/**
 * Swap from and to stations
 */
function swapStations() {
    if (!state.selectedFromId || !state.selectedToId) {
        showError('Palun vali kõigepealt mõlemad peatused');
        return;
    }
    
    // Swap IDs
    const tempId = state.selectedFromId;
    state.selectedFromId = state.selectedToId;
    state.selectedToId = tempId;
    
    // Swap display values
    const tempValue = DOM.fromInput.value;
    DOM.fromInput.value = DOM.toInput.value;
    DOM.toInput.value = tempValue;
    
    // Close autocomplete
    closeAllAutocomplete();
    
    // Search if we already have results displayed
    if (DOM.results.style.display !== 'none') {
        searchTrips();
    }
}

/**
 * Setup autocomplete for an input
 */
function setupAutocomplete(input, list, type) {
    if (!input || !list) return;
    
    input.addEventListener('input', debounce(() => {
        handleAutocompleteInput(input, list, type);
    }, 150));
    
    input.addEventListener('focus', () => {
        if (input.value.length >= 1) {
            handleAutocompleteInput(input, list, type);
        }
    });
    
    input.addEventListener('keydown', (e) => {
        handleAutocompleteKeydown(e, list, input, type);
    });
}

/**
 * Handle autocomplete input
 */
function handleAutocompleteInput(input, list, type) {
    const value = input.value.trim().toLowerCase();
    
    if (value.length < 1) {
        closeAutocomplete(list);
        return;
    }
    
    const filtered = state.stations
        .filter(s => s.stop_name.toLowerCase().includes(value))
        .slice(0, AUTOCOMPLETE_LIMIT);
    
    if (filtered.length > 0) {
        renderAutocompleteList(list, filtered, input, type);
    } else {
        closeAutocomplete(list);
    }
}

/**
 * Render autocomplete list
 */
function renderAutocompleteList(list, items, input, type) {
    list.innerHTML = items.map((item, index) => `
        <div 
            class="autocomplete-item" 
            data-id="${item.stop_area_id}"
            data-index="${index}"
            role="option"
        >${item.stop_name}</div>
    `).join('');
    
    list.style.display = 'block';
    list.setAttribute('aria-expanded', 'true');
    state.activeAutocomplete = list;
    
    // Add click handlers
    list.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            selectStation(item.dataset.id, item.textContent, input, list, type);
        });
    });
}

/**
 * Handle autocomplete keyboard navigation
 */
function handleAutocompleteKeydown(e, list, input, type) {
    const items = list?.querySelectorAll('.autocomplete-item');
    if (!items || items.length === 0) return;
    
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
                0
            );
            updateAutocompleteSelection(items);
            break;
        case 'Enter':
            e.preventDefault();
            if (state.selectedAutocompleteIndex >= 0) {
                const selected = items[state.selectedAutocompleteIndex];
                selectStation(selected.dataset.id, selected.textContent, input, list, type);
            }
            break;
        case 'Escape':
            closeAutocomplete(list);
            break;
    }
}

/**
 * Update autocomplete selection highlighting
 */
function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === state.selectedAutocompleteIndex);
    });
}

/**
 * Select a station from autocomplete
 */
function selectStation(id, name, input, list, type) {
    if (type === 'from') {
        state.selectedFromId = id;
    } else {
        state.selectedToId = id;
    }
    input.value = name;
    closeAutocomplete(list);
    
    // For ferry mode, validate route and update available destinations
    if (state.transportMode === 'ferry' && type === 'from') {
        updateFerryDestinationOptions(id);
    }
}

/**
 * Update ferry destination options based on selected origin
 */
function updateFerryDestinationOptions(fromId) {
    const validDestinations = VALID_FERRY_ROUTES[fromId] || [];
    
    // Filter the "to" input to only show valid destinations
    if (state.selectedToId && !validDestinations.includes(state.selectedToId)) {
        // If current destination is not valid, clear it
        state.selectedToId = null;
        DOM.toInput.value = '';
    }
}

/**
 * Close autocomplete list
 */
function closeAutocomplete(list) {
    if (list) {
        list.style.display = 'none';
        list.setAttribute('aria-expanded', 'false');
        list.innerHTML = '';
    }
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
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Handle form submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    searchTrips();
}

/**
 * Handle input keypress
 */
function handleInputKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Only search if autocomplete is not active
        if (!state.activeAutocomplete) {
            searchTrips();
        }
    }
}

/**
 * Search for trips
 */
async function searchTrips() {
    if (!state.selectedFromId || !state.selectedToId) {
        showError('Palun vali väljumis- ja sihtkoht');
        return;
    }
    
    if (state.selectedFromId === state.selectedToId) {
        showError('Väljumis- ja sihtkoht ei saa olla samad');
        return;
    }
    
    // For ferry mode, validate that this is a valid route
    if (state.transportMode === 'ferry') {
        const validDestinations = VALID_FERRY_ROUTES[state.selectedFromId] || [];
        if (!validDestinations.includes(state.selectedToId)) {
            showError('Valitud sadamate vahel ei ole otseühendust. Vali teine marsruut.');
            return;
        }
    }
    
    // Cancel any existing request
    cancelPendingRequests();
    abortController = new AbortController();
    
    // Show loading
    DOM.loading.style.display = 'block';
    DOM.results.style.display = 'none';
    DOM.error.style.display = 'none';
    
    // Update current time check
    const now = new Date();
    const selectedDate = new Date(DOM.datePicker.value);
    state.isToday = selectedDate.toDateString() === now.toDateString();
    state.currentTime = now.getHours() * 60 + now.getMinutes();
    
    try {
        let trips;
        if (state.transportMode === 'train') {
            trips = await searchTrainTrips();
        } else if (state.transportMode === 'bus') {
            trips = await searchBusTrips();
        } else {
            trips = await searchFerryTrips();
        }
        
        state.currentTrips = trips;
        
        // Save to recent searches
        saveRecentSearch();
        loadRecentSearches();
        
        // Update route display
        updateRouteDisplay();
        
        // Render results
        renderTrips();
        
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Search error:', err);
            showError('Sõiduplaani otsimine ebaõnnestus. Palun proovi uuesti.');
        }
    } finally {
        DOM.loading.style.display = 'none';
        abortController = null;
    }
}

/**
 * Search for train trips using Ridango API
 */
async function searchTrainTrips() {
    const config = API_CONFIG.train;
    const date = DOM.datePicker.value;
    
    const params = new URLSearchParams({
        from_stop_area_id: state.selectedFromId,
        to_stop_area_id: state.selectedToId,
        date: date
    });
    
    const response = await fetch(
        `${config.base}${config.endpoints.TRIPS}?${params}`,
        { signal: abortController.signal }
    );
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.trips.map(trip => ({
        line: trip.route_short_name || trip.route_long_name,
        departure: trip.departure_time,
        arrival: trip.arrival_time,
        duration: calculateDuration(trip.departure_time, trip.arrival_time),
        rawDeparture: parseTime(trip.departure_time),
        rawArrival: parseTime(trip.arrival_time)
    }));
}

/**
 * Search for bus trips using peatus.ee GraphQL API
 */
async function searchBusTrips() {
    const config = API_CONFIG.bus;
    const date = DOM.datePicker.value;
    const [year, month, day] = date.split('-').map(Number);
    
    // Get from and to stops with coordinates
    const fromStop = state.stations.find(s => s.stop_area_id === state.selectedFromId);
    const toStop = state.stations.find(s => s.stop_area_id === state.selectedToId);
    
    if (!fromStop || !toStop) {
        throw new Error('Stops not found');
    }
    
    // Use the plan query to get itineraries
    const query = `{
        plan(
            from: { lat: ${fromStop.lat}, lon: ${fromStop.lon} },
            to: { lat: ${toStop.lat}, lon: ${toStop.lon} },
            date: "${date}",
            time: "00:00",
            arriveBy: false
        ) {
            itineraries {
                legs {
                    route {
                        shortName
                        longName
                    }
                    startTime
                    endTime
                    from {
                        name
                    }
                    to {
                        name
                    }
                }
            }
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
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    
    // Transform itineraries to trips format
    const trips = [];
    if (data.data?.plan?.itineraries) {
        data.data.plan.itineraries.forEach((itinerary, index) => {
            if (itinerary.legs && itinerary.legs.length > 0) {
                const leg = itinerary.legs[0];
                const startTime = new Date(leg.startTime);
                const endTime = new Date(leg.endTime);
                
                trips.push({
                    line: leg.route?.shortName || leg.route?.longName || 'Buss',
                    departure: formatTime(startTime),
                    arrival: formatTime(endTime),
                    duration: calculateDuration(formatTime(startTime), formatTime(endTime)),
                    rawDeparture: startTime.getHours() * 60 + startTime.getMinutes(),
                    rawArrival: endTime.getHours() * 60 + endTime.getMinutes()
                });
            }
        });
    }
    
    return trips;
}

/**
 * Search for ferry trips (static data)
 */
async function searchFerryTrips() {
    // Get the route key
    const routeKey = `${state.selectedFromId}-${state.selectedToId}`;
    const route = FERRY_SCHEDULES[routeKey];
    
    if (!route) {
        return [];
    }
    
    // Transform schedule to trips format
    return route.schedule.map((trip, index) => {
        const departMinutes = parseTime(trip.depart);
        const arriveMinutes = parseTime(trip.arrive);
        
        return {
            line: route.route,
            departure: trip.depart,
            arrival: trip.arrive,
            duration: `${route.duration} min`,
            rawDeparture: departMinutes,
            rawArrival: arriveMinutes
        };
    });
}

/**
 * Calculate duration between two times
 */
function calculateDuration(departure, arrival) {
    const depMinutes = parseTime(departure);
    const arrMinutes = parseTime(arrival);
    
    let durationMinutes = arrMinutes - depMinutes;
    if (durationMinutes < 0) {
        durationMinutes += 24 * 60; // Add a day if arrival is next day
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0) {
        return `${hours}t ${minutes}min`;
    }
    return `${minutes}min`;
}

/**
 * Parse time string to minutes
 */
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Format time from Date object
 */
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Update route display
 */
function updateRouteDisplay() {
    const fromStation = state.stations.find(s => s.stop_area_id === state.selectedFromId);
    const toStation = state.stations.find(s => s.stop_area_id === state.selectedToId);
    
    DOM.fromDisplay.textContent = fromStation?.stop_name || state.selectedFromId;
    DOM.toDisplay.textContent = toStation?.stop_name || state.selectedToId;
    
    const date = new Date(DOM.datePicker.value);
    const dateStr = date.toLocaleDateString('et-EE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    DOM.routeDate.textContent = `(${dateStr})`;
    
    DOM.routeDisplay.style.display = 'block';
}

/**
 * Render trips to the results table
 */
function renderTrips() {
    const showDeparted = DOM.showDepartedCheckbox.checked;
    
    let trips = state.currentTrips;
    
    // Filter departed trips if checkbox is not checked and it's today
    if (state.isToday && !showDeparted) {
        trips = trips.filter(trip => trip.rawDeparture >= state.currentTime);
    }
    
    if (trips.length === 0) {
        DOM.resultsBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-results">Ühtegi sõitu ei leitud</td>
            </tr>
        `;
    } else {
        DOM.resultsBody.innerHTML = trips.map(trip => {
            const isDeparted = state.isToday && trip.rawDeparture < state.currentTime;
            const rowClass = isDeparted ? 'departed' : '';
            const indicator = isDeparted ? '~' : '*';
            
            return `
                <tr class="${rowClass}">
                    <td><span class="indicator">${indicator}</span>${trip.line}</td>
                    <td>${trip.departure}</td>
                    <td>${trip.arrival}</td>
                    <td>${trip.duration}</td>
                </tr>
            `;
        }).join('');
    }
    
    DOM.results.style.display = 'block';
}

/**
 * Save recent search to localStorage
 */
function saveRecentSearch() {
    try {
        const config = API_CONFIG[state.transportMode];
        const fromStation = state.stations.find(s => s.stop_area_id === state.selectedFromId);
        const toStation = state.stations.find(s => s.stop_area_id === state.selectedToId);
        
        const search = {
            fromId: state.selectedFromId,
            toId: state.selectedToId,
            fromName: fromStation?.stop_name || state.selectedFromId,
            toName: toStation?.stop_name || state.selectedToId,
            date: DOM.datePicker.value,
            timestamp: Date.now()
        };
        
        const key = config.storageKey;
        let recent = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Remove duplicates
        recent = recent.filter(r => !(r.fromId === search.fromId && r.toId === search.toId));
        
        // Add to beginning
        recent.unshift(search);
        
        // Keep only MAX_RECENT_SEARCHES
        recent = recent.slice(0, MAX_RECENT_SEARCHES);
        
        localStorage.setItem(key, JSON.stringify(recent));
    } catch (e) {
        console.error('Error saving recent search:', e);
    }
}

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches() {
    try {
        const config = API_CONFIG[state.transportMode];
        const key = config.storageKey;
        const recent = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (recent.length === 0) {
            DOM.recentSearchesSection.style.display = 'none';
            return;
        }
        
        DOM.recentList.innerHTML = recent.map(search => `
            <button class="recent-item" data-from="${search.fromId}" data-to="${search.toId}" data-date="${search.date}">
                ${search.fromName} → ${search.toName}
            </button>
        `).join('');
        
        // Add click handlers
        DOM.recentList.querySelectorAll('.recent-item').forEach(item => {
            item.addEventListener('click', () => {
                state.selectedFromId = item.dataset.from;
                state.selectedToId = item.dataset.to;
                DOM.datePicker.value = item.dataset.date;
                
                // Update input values
                const fromStation = state.stations.find(s => s.stop_area_id === state.selectedFromId);
                const toStation = state.stations.find(s => s.stop_area_id === state.selectedToId);
                DOM.fromInput.value = fromStation?.stop_name || state.selectedFromId;
                DOM.toInput.value = toStation?.stop_name || state.selectedToId;
                
                searchTrips();
            });
        });
        
        DOM.recentSearchesSection.style.display = 'block';
    } catch (e) {
        console.error('Error loading recent searches:', e);
        DOM.recentSearchesSection.style.display = 'none';
    }
}

/**
 * Get recent searches
 */
function getRecentSearches() {
    try {
        const config = API_CONFIG[state.transportMode];
        const key = config.storageKey;
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Show error message
 */
function showError(message) {
    DOM.errorText.textContent = message;
    DOM.error.style.display = 'block';
    
    setTimeout(() => {
        DOM.error.style.display = 'none';
    }, ERROR_TIMEOUT);
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', newTheme === 'light' ? '#ffffff' : '#0d1117');
    }
    
    // Save theme preference (per mode)
    const config = API_CONFIG[state.transportMode];
    localStorage.setItem(config.themeKey, newTheme);
    
    updateThemeIcon(newTheme);
}

/**
 * Initialize theme from localStorage or default
 */
function initTheme() {
    const config = API_CONFIG[state.transportMode];
    const savedTheme = localStorage.getItem(config.themeKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#0d1117');
    }
    
    updateThemeIcon(theme);
}

/**
 * Update theme icon
 */
function updateThemeIcon(theme) {
    if (DOM.themeIcon) {
        DOM.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    // Close autocomplete on resize
    closeAllAutocomplete();
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle resize
window.addEventListener('resize', debounce(handleResize, 100));
