import { platform } from 'os';

import {card} from "./controller/card.js";
import {pack} from "./controller/pack.js";
import {hsCard} from './controller/hsCard.js'
import {settings} from './controller/settings.js'

const electron = require('electron');
const {app, BrowserWindow, Menu} = electron;
const nativeImage = require('electron').nativeImage;

const _ = require('lodash');
const Q = require('q');
const fs = require('fs');
const LogWatcher = require('./libs/logWatcher.js');


let icon = nativeImage.createFromPath(`${__dirname}/icon2.png`);
let menuTemplate = [
    {
        label: 'Packs',
        submenu: [
            {
                label: 'Update cards',
                click: () => {
                    updateCards();
                }
            }
        ]
    },
    {
        label: 'Set sets',
        submenu: [
            {
                label: 'Update packs',
                click: () => {
                    updatePacks();
                }
            }
        ]
    }
];

let menu = Menu.buildFromTemplate(menuTemplate);
let programSettings = {};

app.dock.setIcon(icon);
app.setName('Pack Statistics')


// Init program settings
// Q.fcall(function () {
//     return settings.find({});
// })
// .then(function (savedSettings) {
//     if (!savedSettings.length) return firstRun();

//     settings = savedSettings[0];
// })
// .catch(function (err) {
//     return console.log(err);
// });

// Program inited and ready to run
app.on('ready', () => {
    let win = new BrowserWindow({
        width: 1180, 
        height: 620,
        minHeight: 620,
        minWidth: 1000,
        backgroundColor: '#000',
    });

    win.loadURL(`file://${__dirname}/index.html`);

    // Menu.setApplicationMenu(menu);
});



function updateCards () {
    const unirest = require('unirest');

    unirest.get("https://omgvamp-hearthstone-v1.p.mashape.com/cards?locale=enUS")
    .header("X-Mashape-Key", "2Trvllmn29mshf9ObTI6V4WbDwaWp1oQtLHjsnDn5ZXx7AAtaR")
    .end(function (result) {
        if (result.status != 200) return false;

        console.log('Status: ok. Let`s create!');

        _.each(result.body, cards => {
            _.each(cards, card => {
                hsCard.create(card);
            });
        });
    });
}

function updatePacks () {
    pack.find()
    .then(function (packs) {
        _.each(packs, function (packeg) {
            let update =  {
                updatedAt: new Date(),
                cardSet: packeg.cards[0].card.cardSet
            }

            pack.update({_id: packeg._id}, update);
        })
    })
    .catch(function(err) {
        console.error(err);
    })
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
        card.create(card);
    }

    // Close boster opening and set counter back to zero;
    if (cardCounter == 5) {
        pack.create(newPack);

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