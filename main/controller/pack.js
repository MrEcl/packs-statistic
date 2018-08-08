/**
 * @description controller for pack managing
 */

import {hsCard} from './hsCard.js';
import {updateData} from './settings.js';

const Datastore = require('nedb');
const Q = require('q');
const _ = require('lodash');
const {ipcMain} = require('electron');

// Event to notify on pack changes
let subscriber; 

let db = new Datastore({ filename: 'db/pack.db', autoload: true });

const pack = {
    // create: function (model) {
    //     let now = new Date();
    //     let cardId = model.cards[0].card;

    //     hsCard.find({cardId: cardId})
    //     .then(function (cards) {
    //         model.createdAt = now;
    //         model.updatedAt = now;
    //         model.cardSet = cards[0].cardSet;

    //         db.insert(model, function (err, newDoc) {
    //             if (err) return console.log(err);
    //             console.log(newDoc);

    //             if (subscriber) {
    //                 subscriber.sender.send('new-pack', newDoc)
    //             };

    //             return newDoc;
    //         });
    //     });
    // },

    create: function (model) {
        let now = new Date();
        let cardId = model.cards.map(o => o.card);

        // Copy sets from to prevent it changes;
        let sets = Object.assign({}, global.settings.sets);

        hsCard.find({cardId: { $in: _.uniq(cardId) }})
        .then(function (cards) {
            let packCards = [];

            // define new cards set
            model.cardSet = cards[0].cardSet;

            if (!sets[model.cardSet]) {
                sets[model.cardSet] = {
                    quantity: 0,
                    common: 0,
                    rare: 0,
                    epic: 0,
                    legendary: 0,
                    dust: 0,
                    pityTimer: 0
                };
            }

            model.hasLegendary = false;
            model.createdAt    = now;
            model.updatedAt    = now;
            model.dust         = 0;
            model.pityTimer    = ++sets[model.cardSet].pityTimer;
            // model.sandBox      = true;

            sets[model.cardSet].quantity++;

            _.each(model.cards, function (card) {
                let pCard = _.find(cards, o => o.cardId == card.card)
                let isGolden = card.isGolden;
                let rarity   = pCard.rarity;

                switch (rarity) {
                    case 'Common':
                        sets[model.cardSet].common++
                        if (isGolden) model.dust += 50;
                        else model.dust += 5;
                        break;
                    case 'Rare':
                        sets[model.cardSet].rare++
                        if (isGolden) model.dust += 100;
                        else model.dust += 20;
                        break;
                    case 'Epic':
                        sets[model.cardSet].epic++
                        if (isGolden) model.dust += 400;
                        else model.dust += 100;
                        break;
                    case 'Legendary':
                        sets[model.cardSet].legendary++
                        model.hasLegendary = true;
                        if (isGolden) model.dust += 1600;
                        else model.dust += 400;
                        break;
                }

                packCards.push({
                    card: pCard,
                    isGolden: card.isGolden
                });
            });

            sets[model.cardSet].dust += model.dust;

            if (model.hasLegendary) sets[model.cardSet].pityTimer = 0;

            Q.fcall(function () {
                const deferred = Q.defer();

                db.insert(model, function (err, newDoc) {
                    if (err) return deferred.reject(newDoc);
                    
                    // Notify about new created pack
                    if (subscriber) {
                        // Populate created pack 
                        newDoc.cards = packCards;

                        subscriber.sender.send('new-pack', newDoc)
                    };
    
                    return deferred.resolve(newDoc);
                });

                return deferred.promise;
            })
            .then(function (pack) {
                updateData({sets: sets})
            })
            .catch(function (err) {
                console.log(err);
            })
        })
        .catch(function (err) {
            console.log(err);
        })
    },

    update: function (identifier, update) {
        db.update(identifier, {$set: update}, { multi: true }, function (err, numReplaced) {
            if (err) console.log(err);
            console.log(numReplaced)
        });
    },

    find: function (query, cb) {
        const deferred = Q.defer();

        db.find(query)
        .sort({ createdAt: -1 })
        .exec(function (err, packs) {
            let populate = [];

            _.each(packs, pack => {
                _.each(pack.cards, card => {
                    populate.push(
                        hsCard.find({cardId: card.card})
                        .then(function (populatedCard) {
                            card.card = populatedCard[0];
                        })
                    )
                });
            });

            Q.all(populate)
            .spread(function (...cards) {
                return deferred.resolve(packs);
            })
            .catch(function (err) {
                deferred.reject(err);
            });
        });

        return deferred.promise;
    },

    rebuild: function () {
        const deferred = Q.defer();
        let counter = 1;
        let sets = {};

        console.log('Rebuilding...')

        db.find({})
        .sort({ createdAt: 1 })
        .exec(function (err, packs) {
            let populate = [];

            console.log(`Populating ${packs.length} packs...`);

            _.each(packs, pack => {
                _.each(pack.cards, card => {
                    populate.push(
                        hsCard.find({cardId: card.card})
                        .then(function (populatedCard) {
                            card.card = populatedCard[0];
                        })
                    )
                });
            });

            Q.all(populate)
            .spread(function (...cards) {
                let query = [];
                let pityTimer = {};

                console.log(`Begin getting new data...`);

                _.each(packs, function (pack) {
                    let dust = 0;
                    let hasLegendary = false;
                    let update = {}
                    
                    if (!pityTimer[pack.cardSet]) pityTimer[pack.cardSet] = 0;

                    // Init new set
                    if (!sets[pack.cardSet]) {
                        sets[pack.cardSet] = {
                            quantity: 0,
                            common: 0,
                            rare: 0,
                            epic: 0,
                            legendary: 0,
                            dust: 0,
                            pityTimer: 0
                        };
                    }
                    
                    pityTimer[pack.cardSet]++;

                    sets[pack.cardSet].quantity++;

                    // Use value of copy of the pity timer
                    update.pityTimer = Object.assign({}, pityTimer)[pack.cardSet];

                    _.each(pack.cards, function (card) {
                        let rarity = card.card.rarity;
                        switch (rarity) {
                            case 'Common':
                                sets[pack.cardSet].common++
                                if (card.isGolden) dust += 50;
                                else dust += 5;
                                break;
                            case 'Rare':
                                sets[pack.cardSet].rare++
                                if (card.isGolden) dust += 100;
                                else dust += 20;
                                break;
                            case 'Epic':
                                sets[pack.cardSet].epic++
                                if (card.isGolden) dust += 400;
                                else dust += 100;
                                break;
                            case 'Legendary':
                                sets[pack.cardSet].legendary++
                                hasLegendary = true;
                                if (card.isGolden) dust += 1600;
                                else dust += 400;
                                break;
                        }
                    })

                    if (hasLegendary) pityTimer[pack.cardSet] = 0;

                    sets[pack.cardSet].pityTimer = pityTimer[pack.cardSet];

                    update.hasLegendary = hasLegendary;
                    update.dust = dust;

                    sets[pack.cardSet].dust += dust;

                    query.push(
                        db.update({"_id": pack._id}, {$set: update}, { multi: false }, function (err, numReplaced) {
                            if (err) console.log(err);
                            console.log(`Pack ${counter++} updated`)
                        })
                    )
                });

                return Q.all(query);
            })
            .spread(function (...updated) {
                // to do
                console.log(sets)
                updateData({sets})
            })
            .catch(function (err) {
                deferred.reject(err);
            });
        });

        return deferred.promise;
    }
};

exports.pack = pack;

exports.packController = function () {
    ipcMain.on('get-set', (event, set) => {
        Q.fcall(function () {
            return pack.find({cardSet: set});
        })
        .then(function (packs) {
            event.sender.send('res-set', packs, set);
        })
        .catch(function (err) {
            console.log(err);
        });
    });

    ipcMain.on('pack-subscribe', (event, set) => {
        subscriber = event;
    });
};