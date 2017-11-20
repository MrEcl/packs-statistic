/**
 * @description controller for pack managing
 */


const Datastore = require('nedb');
const Q = require('q');

let db = new Datastore({ filename: 'db/hsCard.db', autoload: true });

exports.hsCard = {
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

        db.find(query, function (err, card) {
            if (err) return deferred.reject(err);
            return deferred.resolve(card);
        });

        return deferred.promise;
    },
    
    destroy: function () {

    }
}