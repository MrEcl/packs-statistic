import { platform } from 'os';

import {pack, packController} from "./controller/pack.js";
import {userController} from './controller/settings.js';

const electron = require('electron');
const {app, BrowserWindow, Menu} = electron;
const nativeImage = require('electron').nativeImage;

const _ = require('lodash');
const Q = require('q');
const fs = require('fs');
const LogWatcher = require('./libs/logWatcher.js');

let icon = nativeImage.createFromPath(`${__dirname + '/..'}/icon2.png`);
let menuTemplate = [
    {
        label: 'Packs Statistics',
        submenu: [
            {
                label: 'Update cards',
                click: () => {
                    updateCards();
                }
            },
            {
                label: 'Information'
            }
        ]
    },
    {
        label: 'Settings',
        submenu: [
            {
                label: 'Change game location',
                click: () => {
                    getLocation();
                }
            }
        ]
    }
];

let menu = Menu.buildFromTemplate(menuTemplate);
let programSettings = {};

// Main window
let win;


app.dock.setIcon(icon);
app.setName('Pack Statistics')

// Program inited and ready to run
app.on('ready', () => {
    win = new BrowserWindow({
        width: 1180, 
        height: 620,
        minHeight: 620,
        minWidth: 1000,
        backgroundColor: '#000',
        webPreferences: { 
            experimentalFeatures: true 
        }
    });

    win.loadURL(`file://${__dirname + '/..'}/view/index.html`);

    Menu.setApplicationMenu(menu);
});

function updateCards () {
    const unirest = require('unirest');
    const path = require('path')

    let child = new BrowserWindow({
        parent: win, 

        alwaysOnTop: true,
        closable: false,
        minimizable: false,
        resizable: false,

        title: 'Updating cards',
        show: true,
        width: 300, 
        height: 100,
        backgroundColor: '#121a27'
    });

    child.loadURL(`file://${__dirname + '/..'}/view/uploadcards.html`);

    child.once('ready-to-show', () => {
        win.child()
    });
};

function getLocation () {
    console.log('hello windows');
}


/****************************************************************************
 * Card gaining logic
 */

// Cards gaining
let lw = new LogWatcher();
let openingPack = false;
let cardCounter = 0;
let newPack = {cards: []};

// LogWatcher events
lw.on('card-gained', (data) => {
    let card = {
        card: data.cardId,
        isGolden: data.isGolden
    };

    console.log('card-gained:', data);

    if (openingPack) {
        newPack.cards.push(card);

        cardCounter++;
    } else {
        console.log('This is gift card. I wont count this one');
        //card.create(card);
    }

    // Close boster opening and set counter back to zero;
    if (cardCounter == 5) {
        pack.create(newPack)
        
        openingPack = false;
        cardCounter = 0;
        newPack = {cards: []};
    }
});

lw.on('open-booster',  () => {
    console.log('Opens a pack');
    openingPack = true;
});

// Start watching logs
lw.start();


//Load controllers
packController();
userController();