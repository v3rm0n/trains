# Rongi ja Bussi Sõiduplaan

A clean, modern web application for viewing Elron train schedules and Tartu city bus schedules.

**Live Demo:** [https://rong.maido.io](https://rong.maido.io)

## Features

- **Dual Mode** - Switch between Elron trains and Tartu city buses
- **Simple Interface** - Just select From, To, Date and Search
- **Autocomplete** - Type station/stop names with smart autocomplete
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

## Demo

![Screenshot](screenshot.png)

## APIs

### Train Data (Elron)
Uses the Ridango API for Elron train data:
- `https://api.ridango.com/v2/64/intercity/originstops` - Station list
- `https://api.ridango.com/v2/64/intercity/stopareas/trips/direct` - Train schedules

### Bus Data (Tartu)
Uses the peatus.ee GraphQL API for Tartu city bus data:
- `https://api.peatus.ee/routing/v1/routers/estonia/index/graphql` - Bus stops and schedules

## Local Storage

The app uses localStorage to persist:
- Recent searches (4 per mode)
- Theme preference (separate for each mode)
- Selected transport mode

## Technologies

- Pure HTML5, CSS3, and JavaScript (no frameworks)
- Ridango REST API for trains
- GraphQL API for buses
- JetBrains Mono font for terminal aesthetic
- CSS Custom Properties for theming
