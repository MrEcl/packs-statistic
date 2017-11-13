const electron = require('electron');
const {app, BrowserWindow} = electron;
const LogWatcher = require('./libs/logWatcher.js');


app.on('ready', () => {
    let win = new BrowserWindow({width: 800, height: 600});
    win.loadURL(`file://${__dirname}/index.html`);
});

// Cards gaining
let lw = new LogWatcher();
let openingPack = false;
let cardCounter = 0;

// LogWatcher events
lw.on('card-gained', (data) => {
    console.log('card-gained:', data);

    console.log()

    // Increase card counter
    if (openingPack) cardCounter++;
    else console.log('Rhis is gift card. I wont count this one');

    // Close boster opening and set counter back to zero;
    if (cardCounter == 5) {
        openingPack = false;
        cardCounter = 0;
    }
});

lw.on('open-booster',  () => {
    console.log('Opens a pack');
    openingPack = true;
});

// Start watching logs
lw.start();