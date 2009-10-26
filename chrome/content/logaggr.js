

/**
 * Processes log messages from log files extracting per-file and per-bucket
 *  information.  Extensible for the purposes of keeping logic bite-size,
 *  performance is not a major concern at this time.
 *
 * I'm a bit feverish right now, so this might be a bad idea, but the
 *  LogProcessor registers itself as interested in new log files.  It then
 *  decorates the log files with a "aggr" object.
 */
let LogProcessor = {
  _init: function LogProcessor__init() {
    LogManager.registerListener("onNewLogFile", this.onNewLogFile, this);
    LogManager.registerListener("onLogFileDone", this.onLogFileDone, this);

    LogManager.registerListener("onTick", this._periodicChew, this);
  },

  _activeLogFiles: [],

  onNewLogFile: function LogProcessor_onNewLogFile(logFile) {
    logFile.aggr = {
      all: {
      },
      buckets: [],
      generation: 0,
      procMeta: {
        curBucket: null,
        curBucketAggr: null,
        curBucketCount: null,
        seenContexts: {},
      },
    };
    this._activeLogFiles.push(logFile);
  },

  onLogFileDone: function LogProcess_onLogFileDone(logFile) {
    this._activeLogFiles.splice(this._activeLogFiles.indexOf(logFile), 1);
    this._chew([logFile]);
  },

  _chewBucket: function LogProcess__chewBucket(logFile, aggr,
                                               bucket, bucketAggr,
                                               startFrom) {
    if (startFrom == null)
      startFrom = 0;
    let counts = bucketAggr.loggerCounts;
    let seenContexts = aggr.procMeta.seenContexts;

    for (let iMsg = startFrom; iMsg < bucket.length; iMsg++) {
      let msg = bucket[iMsg];
      let context = null;

      if (msg.loggerName in counts)
        counts[msg.loggerName]++;
      else
        counts[msg.loggerName] = 1;

      for each (let [, msgObj] in Iterator(msg.messageObjects)) {
        if ((msgObj == null) || (typeof(msgObj) != "object"))
          continue;

        // --- Contexts!
        if ("_isContext" in msgObj) {
          // -- Just reuse the context meta we already built if we've already
          //  processed the context.
          if (msgObj._id in seenContexts) {
            context = seenContexts[msgObj._id];
          }
          // -- special contexts
          else if ("_specialContext" in msgObj) {
            // don't mark this as a seen context since it's special
            let sc = msgObj._specialContext;
            if (sc in SpecialContextProcessors)
              SpecialContextProcessors[sc].process(logFile, aggr, bucketAggr,
                                                   msg, msgObj);
          }
          // -- typed contexts
          else if ("type" in msgObj) {
            let parentContext;
            if ("_contextParentId" in msgObj)
              parentContext = seenContexts[msgObj._contextParentId];

            let typ = msgObj.type;
            if (typ in TypedContextProcessors)
              seenContexts[msgObj._id] =
                TypedContextProcessors[typ].makeContext(
                  logFile, parentContext, aggr, bucketAggr, msg, msgObj);
          }
        }
        // --- Typed objects
        else if ("type" in msgObj) {
          let typ = msgObj.type;
          if (typ in TypedObjectProcessors)
            TypedObjectProcessors[typ].process(context, aggr, bucketAggr, msg,
                                               msgObj);
        }
      }
    }
  },

  _chew: function LogProcessor__chew(logFiles) {
    for each (let [, logFile] in Iterator(logFiles)) {
      let aggr = logFile.aggr;
      let procMeta = aggr.procMeta;
      let didSomething = false;

      if (procMeta.curBucket &&
          procMeta.curBucket.length != procMeta.curBucketCount) {
        didSomething = true;
        this._chewBucket(logFile, aggr,
                         procMeta.curBucket, procMeta.curBucketAggr,
                         procMeta.curBucketCount);
      }

      let newBuckets = logFile.getAndClearNewBuckets();
      for each (let [iBucket, [bucketName, bucket]] in Iterator(newBuckets)) {
        didSomething = true;
        let bucketAggr = {
          name: bucketName,
          loggerCounts: {}
        };

        aggr.buckets.push(bucketAggr);

        this._chewBucket(logFile, aggr, bucket, bucketAggr);

        if (iBucket == newBuckets.length - 1) {
          procMeta.curBucket = bucket;
          procMeta.curBucketAggr = bucketAggr;
          procMeta.curBucketCount = bucket.length;
        }
      }

      if (didSomething)
        aggr.generation++;
    }
  },

  _periodicChew: function() {
    this._chew(this._activeLogFiles);
  },

  /**
   * Maps a listeningFor identifier to a list of listeners.
   */
  _listenersByListeningFor: {},

  notify: function LogManager__notifyListeners(processorName, processorEvent,
                                               args) {
    let listeningFor = processorName + "-" + processorEvent;

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

  registerListener: function LogManager_registerListener(
                      processorName, processorEvent, listener, listenerThis) {
    let listenFor = processorName + "-" + processorEvent;
    if (!(listenFor in this._listenersByListeningFor))
      this._listenersByListeningFor[listenFor] = [];

    this._listenersByListeningFor[listenFor].push([listener, listenerThis]);
  },

};
LogProcessor._init();
