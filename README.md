# Rongi, Bussi ja Praami Sõiduplaan

A clean, modern web application for viewing Elron train schedules, Tartu city bus schedules, and TS Laevad ferry schedules.

**Live Demo:** [https://rong.maido.io](https://rong.maido.io)

## Features

- **Triple Mode** - Switch between Elron trains, Tartu city buses, and TS Laevad ferries
- **Simple Interface** - Just select From, To, Date and Search
- **Autocomplete** - Type station/stop/sadam names with smart autocomplete
- **Swap Button** - Quickly reverse your journey direction
- **Recent Searches** - Automatically saves your last 4 searches to localStorage (separate for each mode)
- **Auto-search** - Automatically searches your last route on page load
- **Departed Filter** - Hide departed trips by default, toggle to show all
- **Dark/Light Theme** - Toggle between dark and light themes
- **Fully Static** - Ready to deploy to GitHub Pages or any static host
- **Responsive** - Works on desktop and mobile devices

## Transport Modes

### 🚂 Trains (Elron)
View train schedules across Estonia including routes between:
- Tallinn ↔ Tartu
- Tallinn ↔ Narva
- Tallinn ↔ Pärnu
- And more...

### 🚌 Buses (Tartu)
View city bus schedules within Tartu including all local bus lines.

### ⛴️ Ferries (TS Laevad)
View ferry schedules to Estonia's largest islands:
- **Saaremaa routes:**
  - Virtsu ↔ Kuivastu (Muhu island, gateway to Saaremaa)
  - Rohuküla ↔ Heltermaa (Hiiumaa)
  - Sõru ↔ Triigi (Hiiumaa ↔ Saaremaa)

## APIs

### Train Data (Elron)
Uses the Ridango API for Elron train data:
- `https://api.ridango.com/v2/64/intercity/originstops` - Station list
- `https://api.ridango.com/v2/64/intercity/stopareas/trips/direct` - Train schedules

### Bus Data (Tartu)
Uses the peatus.ee GraphQL API for Tartu city bus data:
- `https://api.peatus.ee/routing/v1/routers/estonia/index/graphql` - Bus stops and schedules

### Ferry Data (TS Laevad)
Uses static schedule data based on TS Laevad timetables for:
- Virtsu-Kuivastu route (hourly service, 35 min crossing)
- Rohuküla-Heltermaa route (8 daily departures, 75 min crossing)
- Sõru-Triigi route (8 daily departures, 60 min crossing)

## Local Storage

The app uses localStorage to persist:
- Recent searches (4 per mode)
- Theme preference (separate for each mode)
- Selected transport mode

## Technologies

- Pure HTML5, CSS3, and JavaScript (no frameworks)
- Ridango REST API for trains
- GraphQL API for buses
- Static data for ferries (based on official TS Laevad schedules)
- JetBrains Mono font for terminal aesthetic
- CSS Custom Properties for theming
