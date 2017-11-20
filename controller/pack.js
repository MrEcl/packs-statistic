/**
 * @description controller for pack managing
 */

import {hsCard} from './hsCard.js';

const Datastore = require('nedb');
const Q = require('q');
const _ = require('lodash');

let db = new Datastore({ filename: 'db/pack.db', autoload: true });

exports.pack = {
    create: function (model) {
        let now = new Date();
        
        model.createdAt = now;
        model.updatedAt = now;

        db.insert(model, function (err, newDoc) {
            if (err) console.log(err);
            console.log(newDoc)
        });
    },

    update: function () {

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
                return deferred.resolve(packs);
            })
            .catch(function (err) {
                deferred.reject(err);
            });
        });

        return deferred.promise;
    },

    destroy: function () {

    }
}