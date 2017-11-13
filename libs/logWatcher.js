const EventEmitter = require('events').EventEmitter;
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const extend = require('extend');

let defaultOptions = {
  endOfLineChar: os.EOL
};

const debug = require('debug');

// Define some debug logging functions for easy and readable debug messages.
let log = {
  main: debug('HLW'),
  gameStart: debug('HLW:game-start'),
  zoneChange: debug('HLW:zone-change'),
  gameOver: debug('HLW:game-over')
};

// Determine the default location of the config and log files.
if (/^win/.test(os.platform())) {
  log.main('Windows platform detected.');
  var programFiles = 'Program Files';
  if (/64/.test(os.arch())) {
    programFiles += ' (x86)';
  }
  defaultOptions.logFile = path.join('C:', programFiles, 'Hearthstone', 'Hearthstone_Data', 'output_log.txt');
  defaultOptions.configFile = path.join(process.env.LOCALAPPDATA, 'Blizzard', 'Hearthstone', 'log.config');
} else {
  log.main('OS X platform detected.');
  defaultOptions.logFile = path.join(process.env.HOME, 'Library', 'Logs', 'Unity', 'Player.log');
  defaultOptions.configFile = path.join(process.env.HOME, 'Library', 'Preferences', 'Blizzard', 'Hearthstone', 'log.config');
}

// The watcher is an event emitter so we can emit events based on what we parse in the log.
function LogWatcher(options) {
    this.options = extend({}, defaultOptions, options);

    log.main('config file path: %s', this.options.configFile);
    log.main('log file path: %s', this.options.logFile);

    // Copy local config file to the correct location.
    // We're just gonna do this every time.
    var localConfigFile = path.join(__dirname, 'log.config');
    fs.createReadStream(localConfigFile).pipe(fs.createWriteStream(this.options.configFile));
    log.main('Copied log.config file to force Hearthstone to write to its log file.');
}
util.inherits(LogWatcher, EventEmitter);


LogWatcher.prototype.start = function () {
  var self = this;

  var parserState = new ParserState;

  log.main('Log watcher started.');
  // Begin watching the Hearthstone log file.
  var fileSize = fs.statSync(self.options.logFile).size;
  fs.watchFile(self.options.logFile, function (current, previous) {
    if (current.mtime <= previous.mtime) { return; }

    // We're only going to read the portion of the file that we have not read so far.
    var newFileSize = fs.statSync(self.options.logFile).size;
    var sizeDiff = newFileSize - fileSize;
    if (sizeDiff < 0) {
      fileSize = 0;
      sizeDiff = newFileSize;
    }
    var buffer = new Buffer(sizeDiff);
    var fileDescriptor = fs.openSync(self.options.logFile, 'r');
    
    fs.readSync(fileDescriptor, buffer, 0, sizeDiff, fileSize);
    fs.closeSync(fileDescriptor);
    fileSize = newFileSize;

    self.parseBuffer(buffer, parserState);
  });

  self.stop = function () {
    fs.unwatchFile(self.options.logFile);
    delete self.stop;
  };
};


LogWatcher.prototype.stop = function () {};


LogWatcher.prototype.parseBuffer = function (buffer, parserState) {
  let self = this;

  if (!parserState) {
    parserState = new ParserState;
  }

  // Iterate over each line in the buffer.
  buffer.toString().split(this.options.endOfLineChar).forEach(function (line) {

    // Check for pack opening
    const packOpening = /\[Bob\]\sNetwork\.OpenBooster$/;
    if (packOpening.test(line)) {
        self.emit('open-booster');
    }

    // Check card gaining (events are the same for pack opening, 
    // arena reward or rank chest)
    const cardGained = /\[Achievements\]\sNotifyOfCardGained:\s\[name=(.*)\scardId=(.*)\stype=(.*)\]\s(NORMAL|GOLDEN)\s\d$/;

    if (cardGained.test(line)) {
        let parts = cardGained.exec(line);
        let data = {
          cardName: parts[1],
          cardId: parts[2],
          cardType: parts[3],
          isGolden: parts[4] == 'GOLDEN'
        };

        self.emit('card-gained', data);
    }

  });
};

function ParserState() {
  this.reset();
}

ParserState.prototype.reset = function () {
  this.players = [];
  this.playerCount = 0;
  this.gameOverCount = 0;
};

// Set the entire module to our emitter.
module.exports = LogWatcher;

//2017-09-07 00:55:38.660: [LoadingScreen] LoadingScreen.OnSceneUnloaded() - prevMode=HUB nextMode=PACKOPENING m_phase=INVALID

// 2017-09-07 00:55:49.162: [Asset] CachedAsset.UnloadAssetObject() - unloading name=tavern_wallah loop_medium family=Sound persistent=True


// 2017-09-07 00:56:44.974: [Bob] Network.OpenBooster
// 2017-09-07 00:56:45.094: FSM not Preprocessed: PackOpeningFX_Default(Clone) : FSM
// 2017-09-07 00:56:45.330: [Achievements] NotifyOfCardGained: [name=Топор бури cardId=EX1_247 type=WEAPON] NORMAL 3
// 2017-09-07 00:56:45.355: [Achievements] NotifyOfCardGained: [name=Вытягивание души cardId=EX1_309 type=SPELL] NORMAL 3
// 2017-09-07 00:56:45.384: [Achievements] NotifyOfCardGained: [name=Сквайр Авангарда cardId=EX1_008 type=MINION] NORMAL 3
// 2017-09-07 00:56:45.414: [Achievements] NotifyOfCardGained: [name=Пламя Тьмы cardId=EX1_303 type=SPELL] GOLDEN 1
// 2017-09-07 00:56:45.441: [Achievements] NotifyOfCardGained: [name=Смертельный выстрел cardId=EX1_617 type=SPELL] NORMAL 3
// 2017-09-07 00:56:45.466: [Bob] OnNetCacheObjReceived SAVE --> NetCacheBoosters
// 2017-09-07 00:56:45.478: Unable to find asset bundle for CardTexture Assets/Game/Cards/01 Expert/EX1_247/ruRU/W16_a246_D.psd

// 2017-09-07 00:56:45.501: FSM not Preprocessed: Common_Flip1 : FSM
// 2017-09-07 00:56:45.550: Unable to find asset bundle for CardTexture Assets/Game/Cards/01 Expert/EX1_309/ruRU/r5_a093_D.psd