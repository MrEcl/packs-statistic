/**
 * @description controller for main program settings managing
 */

const Datastore = require('nedb');
const Q = require('q');
const _ = require('lodash');

let db = new Datastore({ filename: 'db/settings.db', autoload: true });

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

    find: function (query, cb) {
        const deferred = Q.defer();

        db.find(query, function (err, settings) {
            if (err) return deferred.reject(err);
            return deferred.resolve(settings);
        });

        return deferred.promise;
    },
}