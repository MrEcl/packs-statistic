import { platform } from 'os';

import {pack, packController} from "./controller/pack.js";
import {userController} from './controller/settings.js';

const electron = require('electron');
const {app, BrowserWindow, Menu, dialog} = electron;
const nativeImage = require('electron').nativeImage;

const _ = require('lodash');
const Q = require('q');
const fs = require('fs');
const path = require('path');
const LogWatcher = require('./libs/logWatcher.js');

let iconPath = path.join(__dirname, '/..', 'icon2.png');
let icon = nativeImage.createFromPath(iconPath);
let menuTemplate = [
    {
        label: 'Packs Statistics',
        submenu: [
            {
                label: 'Refresh statistic',
                click: () => {
                    rebuildPacks();
                }
            },
            {
                label: 'Update cards data',
                click: () => {
                    updateCards();
                }
            },
            {type: 'separator'},
            {
                label: 'Information'
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {role: 'reload'},
            {role: 'forcereload'},
            {role: 'toggledevtools'},
            {type: 'separator'},
            {role: 'resetzoom'},
            {role: 'zoomin'},
            {role: 'zoomout'},
            {type: 'separator'},
            {role: 'togglefullscreen'}
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
            },
            // {
            //     label: 'Sendbox create new pack',
            //     click: () => {
            //         pack.create({
            //             cards: [
            //                 {
            //                     card: 'BOT_067',
            //                     isGolden: false
            //                 },
            //                 {
            //                     card: 'BOT_251',
            //                     isGolden: false
            //                 },
            //                 {
            //                     card: 'BOT_309',
            //                     isGolden: false
            //                 },
            //                 {
            //                     card: 'BOT_413',
            //                     isGolden: false
            //                 },
            //                 {
            //                     card: 'BOT_402',
            //                     isGolden: false
            //                 }
            //             ]
            //         });
            //     }
            // }
        ]
    }
];

let menu = Menu.buildFromTemplate(menuTemplate);
let programSettings = {};

// Main window
let win;

if (process.platform === 'darwin') {
    app.dock.setIcon(icon);
}

app.setName('Pack Statistics')

// Program inited and ready to run
app.on('ready', () => {
    // Check for saved game path
    let hsPath   = false;
    let savePath = path.join(`${__dirname}`, '../', 'save');
    let hasSave  = fs.existsSync(savePath);
    if (hasSave) hsPath = fs.readFileSync(savePath);

    checkHSPath(hsPath);
});

function checkHSPath (HSPath) {
    let hsExists = HSPath ? false : true;

    // Check for correct game location
    if (/^win/.test(process.platform) && !HSPath) {

        let programFiles = 'Program Files';

        if (process.arch === 'x64') programFiles += ' (x86)';

        let HSPath = path.join('C:', programFiles, 'Hearthstone');
        hsExists = fs.existsSync(HSPath);
    }

    if (HSPath) hsExists = fs.existsSync(HSPath);

    if (hsExists) {
        runLogWatcher(HSPath);
        showMainWindow();
    } else {
        dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Choose Hearthstone directory'
        }, 
        function (newPath) {
            let savePath = path.join(`${__dirname}`, '../', 'save');
            fs.writeFileSync(savePath, newPath);
            checkHSPath(newPath);
        });
    }
}

function showMainWindow () {
    win = new BrowserWindow({
        width: 1180, 
        height: 620,
        minHeight: 620,
        minWidth: 1000,
        backgroundColor: '#000',
        icon: iconPath,
        webPreferences: { 
            experimentalFeatures: true 
        }
    });

    win.loadURL(`file://${__dirname + '/..'}/view/index.html`);
    Menu.setApplicationMenu(menu);
}


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

function rebuildPacks () {
    pack.rebuild();
}

function globalPlay () {
    global.settings.sets.Classic.quantity++;
}


/****************************************************************************
 * Card gaining logic
 */
function runLogWatcher (hsPath) {
    // Cards gaining
    let params = {};
    if (hsPath) params = {logFile: path.join(hsPath, 'Hearthstone_Data', 'output_log.txt')};

    let lw = new LogWatcher(params);
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
}


//Load controllers
packController();
userController(global);
