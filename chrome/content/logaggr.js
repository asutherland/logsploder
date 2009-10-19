/**
 * Aggregation logic and such.
 */
let LogAggr = {
  _init: function LogAggr__init() {
    LogManager.registerListener("onReset", this.reset, this);
  },

  curBucket: null,
  curBucketAggr: null,
  curBucketCount: 0,

  _chewBucket: function(bucket, bucketAggr) {
    let counts = bucketAggr.loggerCounts;

    for each (let [, msg] in Iterator(bucket)) {
      if (msg.loggerName in counts)
        counts[msg.loggerName]++;
      else
        counts[msg.loggerName] = 1;
    }
  },

  bucketAggrs: [],
  reset: function() {
    this.bucketAggrs = [];

    this.curBucket = null;
    this.curBucketAggr = null;
    this.curBucketCount = 0;
  },

  chew: function() {
    let didSomething = false;

    if (this.curBucket && this.curBucket.length != this.curBucketCount) {
      didSomething = true;
      this._chewBucket(this.curBucket, this.curBucketAggr);
    }

    let newBuckets = LogManager.getAndClearNewBuckets();
    for each (let [iBucket, [bucketName, bucket]] in Iterator(newBuckets)) {
      didSomething = true;
      let bucketAggr = {
        name: bucketName,
        loggerCounts: {}
      };

      this.bucketAggrs.push(bucketAggr);

      this._chewBucket(bucket, bucketAggr);

      if (iBucket == newBuckets.length - 1) {
        this.curBucket = bucket;
        this.curBucketAggr = bucketAggr;
        this.curBucketCount = bucket.length;
      }
    }

    return didSomething;
  }
};
LogAggr._init();
