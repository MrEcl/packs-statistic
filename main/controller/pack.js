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
    create: function (model) {
        let now = new Date();
        let cardId = model.cards[0].card;

        hsCard.find({cardId: cardId})
        .then(function (cards) {
            model.createdAt = now;
            model.updatedAt = now;
            model.cardSet = cards[0].cardSet;

            db.insert(model, function (err, newDoc) {
                if (err) return console.log(err);

                // when pack created:
                // check for set existance
                // if no set - create it
                // update settings

                console.log(newDoc);

                if (subscriber) {
                    subscriber.sender.send('new-pack', newDoc)
                };

                return newDoc;
            });
        });
    },

    update: function (identifier, update) {
        db.update(identifier, {$set: update}, { multi: true }, function (err, numReplaced) {
            if (err) console.log(err);
            console.log(numReplaced)
        });
    },

    find: function (query, cb) {
        const deferred = Q.defer();

        db.find(query).sort({ createdAt: 1 })
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
                if (subscriber) {
                    subscriber.sender.send('new-pack', 'pong')
                };

                return deferred.resolve(packs);
            })
            .catch(function (err) {
                deferred.reject(err);
            });
        });

        return deferred.promise;
    },
};

exports.pack = pack;

exports.packController = function () {
    ipcMain.on('get-set', (event, set) => {
        Q.fcall(function () {
            return pack.find({cardSet: set});
        })
        .then(function (packs) {
            let dataToUpdate = {
                sets: {}
            };

            dataToUpdate.sets[set] = {};
            dataToUpdate.sets[set].count = packs.length;
            updateData(dataToUpdate);

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