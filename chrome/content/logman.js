/*
 * Logging domain logic.
 */

/**
 * The log manager is the data store for received log messages.
 *
 *
 */
let LogManager = {
  PORT: 9363,

  DATE_BUCKET_SIZE_IN_MS: 100,

  _init: function LogManager__init() {
    this.reset();
    this.gobbler = new LogGobbler(this);
    this.gobbler.start(this.PORT);
  },

  /**
   * Maps logger names to information about those loggers.
   *
   * Example keys would be "gloda.indexer", "gloda.ns", etc.
   */
  _knownLoggers: null,

  /**
   * Messages are organized into DATE_BUCKET_SIZE_IN_MS msec duration buckets.
   */
  _dateBuckets: null,
  _firstBucketName: null,
  _curBucket: null,
  _curBucketName: null,

  /**
   * The list of added buckets since the last time |getAndClearNewBuckets| was
   *  called.
   */
  _newBuckets: null,

  getAndClearNewBuckets: function LogManager_getAndClearNewBuckets() {
    let newBuckets = this._newBuckets;
    this._newBuckets = [];

    return newBuckets;
  },

  getBucket: function LogManager_getBucket(bucketName) {
    if (bucketName in this._dateBuckets)
      return this._dateBuckets[bucketName];
    return null;
  },

  /**
   * Reset all state
   */
  reset: function LogManager_reset() {
    this._knownLoggers = {};

    this._dateBuckets = {};
    this._curBucket = null;
    this._curBucketName = null;

    this._newBuckets = [];
  },

  /**
   * Handle the existence of a previously unknown named logged.
   */
  _noteNewLogger: function LogManager__noteNewLogger(loggerName) {
    this._knownLoggers[loggerName] = {};
    this._notifyListeners("onNewLogger", [this._knownLoggers, loggerName]);
  },

  /**
   * Process received messages.
   */
  onLogMessage: function LogManager_onLogMessage(msg) {
    if (!(msg.loggerName in this._knownLoggers))
      this._noteNewLogger(msg.loggerName);

    // Let us assume time is monotonically increasing.
    let bucketName = msg.time - msg.time % this.DATE_BUCKET_SIZE_IN_MS;
    let bucket;
    if (bucketName == this._curBucketName) {
      bucket = this._curBucket;
    }
    else {
      bucket = this._curBucket = this._dateBuckets[bucketName] = [];
      this._curBucketName = bucketName;
      if (this._firstBucketName == null)
        this._firstBucketName = bucketName;
      this._newBuckets.push([bucketName, bucket]);
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
      listener.apply(listenerThis, args);
    }
  },

  registerListener: function LogManager_registerListener(listenFor, listener,
                                                         listenerThis) {
    if (!(listenFor in this._listenersByListeningFor))
      this._listenersByListeningFor[listenFor] = [];

    this._listenersByListeningFor[listenFor].push([listener, listenerThis]);
  }
};
LogManager._init();
