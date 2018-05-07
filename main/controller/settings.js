/**
 * @description controller for main program settings managing
 * 
 * must contain:
 * 1. version
 * 2. packs statistic
 * 3. hs location
 * 4. battletag?
 * 
 * 
 * 
 * Events:
 * 1. On open pack update set statistic
 * 2. On update cars update version
 * 3. On start create if there is no settings 
 */
const {ipcMain} = require('electron');

const Datastore = require('nedb');
const Q = require('q');
const _ = require('lodash');

let db = new Datastore({ filename: 'db/settings.db', autoload: true });

// Event to notify on pack changes
let subscriber; 

const settings = {
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

    init: function () {
        const self = this;

        Q.fcall(function () {
            return self.find()
        })
        .then(function (settings) {
            if (!settings[0]) return self.create({});

            return settings[0];
        })
        .then(function (setting) {
            
        })
        .catch(function (err) {
            throw err;
        })
    }
}

exports.updateData = function (update) {
    Q.fcall(function () {
        return settings.find();
    })
    .then(function (settings) {
        let data = settings[0];

        console.log(data);
        update.updatedAt = new Date();

        db.update({"_id": data._id}, {$set: update}, { multi: false }, function (err, numReplaced) {
            if (err) console.log(err);

            if (subscriber) {
                subscriber.sender.send('data-updated', data);
            };
        });
    })
    .catch(function (err) {
        console.log(err);
    });
}

exports.userController = function () {
    settings.init();

    // Subs
    ipcMain.on('data-subscribe', (event) => {
        subscriber = event;
    });
}