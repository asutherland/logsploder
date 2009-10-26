/*
 * Logging domain logic.
 */

/**
 * Holds all the log messages for a given source (log file, network connection,
 *  etc.).
 *
 * The |LogManager| crams data into us.
 */
function LogFile(id) {
  this.id = id;
  this.knownLoggers = {};
  this._dateBucketsByName = {};
  this._dateBuckets = [];
  this._newBuckets = [];
}
LogFile.prototype = {
  /**
   * Name identify the log file; probably the name of the unit test source file.
   */
  name: null,

  /**
   * Maps logger names to information about those loggers.
   *
   * Example keys would be "gloda.indexer", "gloda.ns", etc.
   */
  knownLoggers: null,

  /**
   * Messages are organized into DATE_BUCKET_SIZE_IN_MS msec duration buckets.
   */
  _dateBucketsByName: null,
  _dateBuckets: null,
  _firstBucketName: null,
  _curBucket: null,
  _curBucketName: null,

  /**
   * The list of added buckets since the last time |getAndClearNewBuckets| was
   *  called.
   */
  _newBuckets: null,

  getAndClearNewBuckets: function LogFile_getAndClearNewBuckets() {
    let newBuckets = this._newBuckets;
    this._newBuckets = [];

    return newBuckets;
  },

  getBucket: function LogFile_getBucket(bucketName) {
    if (bucketName in this._dateBucketsByName)
      return this._dateBucketsByName[bucketName];
    return null;
  },
};

/**
 * The log manager is the clearing house for log data.  Log entries are
 *  organized into LogFile instances.
 *
 * Only the LogManager is aware of the realities of
 */
let LogManager = {
  _nextId: 1,

  PORT: 9363,

  DATE_BUCKET_SIZE_IN_MS: 100,

  _init: function LogManager__init() {
    this.reset();
    this.gobbler = new LogGobbler(this);
    this.gobbler.start(this.PORT);
  },

  /**
   * Reset all state
   */
  reset: function LogManager_reset() {
    dump("LogManager resetting...\n");

    this.logFiles = [];

    this._notifyListeners("onReset", []);
  },

  /**
   * Handle the existence of a previously unknown named logged.
   */
  _noteNewLogger: function LogManager__noteNewLogger(logFile, loggerName) {
    logFile.knownLoggers[loggerName] = {};
    this._notifyListeners("onNewLogger", [logFile, loggerName]);
  },

  logFiles: null,

  onNewConnection: function LogManager_onNewConnection() {
    let logFile = new LogFile(this._nextId++);
    this.logFiles.push(logFile);

    this._notifyListeners("onNewLogFile", [logFile]);
    return logFile;
  },

  onClosedConnection: function LogManager_onClosedConnection(logFile) {
    // actually maybe nothing to do about this?
    this._notifyListeners("onLogFileDone", [logFile]);
  },

  /**
   * Process received messages.
   */
  onLogMessage: function LogManager_onLogMessage(logFile, msg) {
    // look for the name packet, it should be the first thing we see.
    if (logFile.name == null) {
      if (msg.messageObjects.length &&
          msg.messageObjects[0] != null &&
          (typeof(msg.messageObjects[0]) == "object") &&
          ("_specialContext" in msg.messageObjects[0])) {
        let testFile = msg.messageObjects[0].testFile[0];
        logFile.name = testFile.substring(testFile.lastIndexOf("/") + 1);
        this._notifyListeners("onLogFileNamed", [logFile]);
      }
    }

    if (!(msg.loggerName in logFile.knownLoggers))
      this._noteNewLogger(logFile, msg.loggerName);

    // Let us assume time is monotonically increasing.
    let bucketName = msg.time - msg.time % this.DATE_BUCKET_SIZE_IN_MS;
    let bucket;
    if (bucketName == logFile._curBucketName) {
      bucket = logFile._curBucket;
    }
    else {
      bucket = logFile._curBucket = logFile._dateBucketsByName[bucketName] = [];
      logFile._dateBuckets.push(bucket);
      logFile._curBucketName = bucketName;
      if (logFile._firstBucketName == null)
        logFile._firstBucketName = bucketName;
      logFile._newBuckets.push([bucketName, bucket]);
    }

    bucket.push(msg);
  },

  /**
   * Maps a listeningFor identifier to a list of listeners.
   */
  _listenersByListeningFor: {},

  _notifyListeners: function LogManager__notifyListeners(listeningFor, args) {
    if (!(listeningFor in this._listenersByListeningFor))
      return;

    for each (let [, [listener, listenerThis]] in
              Iterator(this._listenersByListeningFor[listeningFor])) {
      try {
        listener.apply(listenerThis, args);
      }
      catch (ex) {
        dump("!!! exception calling listener " + listener + "\n");
        dump(ex + "\n");
        dump(ex.stack + "\n\n");
      }
    }
  },

  registerListener: function LogManager_registerListener(listenFor, listener,
                                                         listenerThis) {
    if (!(listenFor in this._listenersByListeningFor))
      this._listenersByListeningFor[listenFor] = [];

    this._listenersByListeningFor[listenFor].push([listener, listenerThis]);
  },

  tick: function LogManager_tick() {
    this._notifyListeners("onTick", []);
  }
};
LogManager._init();

// ugly support for periodically processing logs and maybe updating the UI
setInterval(function() {
  try {
    LogManager.tick();
  }
  catch (ex) {
    dump("!!! exception during update tick\n");
    dump(ex + "\n");
    dump(ex.stack + "\n\n");
  }
}, 1000);

