/**
 * Aggregation logic and such.
 */
function LogAggr(logFile) {
  this.logFile = logFile;
  logFile.resetNewState();

  this.bucketAggrs = [];

  this.curBucket = null;
  this.curBucketAggr = null;
  this.curBucketCount = 0;
}

LogAggr.prototype = {
  bucketAggrs: null,
  curBucket: null,
  curBucketAggr: null,
  curBucketCount: null,

  _chewBucket: function(bucket, bucketAggr) {
    let counts = bucketAggr.loggerCounts;

    for each (let [, msg] in Iterator(bucket)) {
      if (msg.loggerName in counts)
        counts[msg.loggerName]++;
      else
        counts[msg.loggerName] = 1;
    }
  },

  reset: function() {
  },

  chew: function() {
    let didSomething = false;

    if (this.curBucket && this.curBucket.length != this.curBucketCount) {
      didSomething = true;
      this._chewBucket(this.curBucket, this.curBucketAggr);
    }

    let newBuckets = this.logFile.getAndClearNewBuckets();
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
