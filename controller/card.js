/**
 * @description controller for pack managing
 */

import {hsCard} from './hsCard.js';

const Datastore = require('nedb');

let db = new Datastore({ filename: 'db/card.db', autoload: true });

exports.card = {
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
        db.find(query, function (err, card) {
            let findCard = {cardId: card.cardId}

            hsCard.find(findCard, cb);
        });
    },
    
    destroy: function () {

    }
}