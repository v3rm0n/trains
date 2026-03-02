# Elron Train Timetable

A clean, modern web application for viewing Elron train schedules.

**Live Demo:** [https://rong.maido.io](https://rong.maido.io)

## Features

- **Simple Interface** - Just select From, To, Date and Search
- **Autocomplete** - Type station names with smart autocomplete
- **Swap Button** - Quickly reverse your journey direction
- **Recent Searches** - Automatically saves your last 3 searches to localStorage
- **Auto-search** - Automatically searches your last route on page load
- **Departed Filter** - Hide departed trains by default, toggle to show all
- **Fully Static** - Ready to deploy to GitHub Pages or any static host
- **Responsive** - Works on desktop and mobile devices

## Demo

![Screenshot](screenshot.png)

## API

This app uses the Ridango API for Elron train data:
- `https://api.ridango.com/v2/64/intercity/originstops` - Station list
- `https://api.ridango.com/v2/64/intercity/stopareas/trips/direct` - Train schedules
