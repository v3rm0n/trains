# Elron Train Timetable

A clean, modern web application for viewing Estonian Railways (Elron) train schedules.

**Live Demo:** [https://yourusername.github.io/elron-trains](https://yourusername.github.io/elron-trains)

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

## Usage

1. Open `index.html` in a browser or visit the live demo
2. Type in the "From" and "To" fields (autocomplete will help)
3. Select a date
4. Click "Search" or press Enter
5. View train times with upcoming trains marked with `*` and departed with `~`

### Keyboard Shortcuts

- **↑/↓** - Navigate autocomplete suggestions
- **Enter** - Select highlighted station
- **Esc** - Close autocomplete

## Deploy to GitHub Pages

1. Push these files to a GitHub repository
2. Go to repository **Settings → Pages**
3. Select **Deploy from a branch** and choose your main branch
4. Your site will be live at `https://yourusername.github.io/repo-name`

## API

This app uses the Ridango API for Elron train data:
- `https://api.ridango.com/v2/64/intercity/originstops` - Station list
- `https://api.ridango.com/v2/64/intercity/stopareas/trips/direct` - Train schedules

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT License - see [LICENSE](LICENSE) file

## Credits

Original bash script by [v3rm0n](https://gist.github.com/v3rm0n/81148c913dfe0adf725781fef75302d3)
