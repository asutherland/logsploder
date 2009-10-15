/**
 * Aggregation logic and such.
 */
let LogAggr = {
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
  },

  chew: function() {
    if (this.curBucket && this.curBucket.length != this.curBucketCount)
      this._chewBucket(this.curBucket, this.curBucketAggr);

    let newBuckets = LogManager.getAndClearNewBuckets();
    for each (let [iBucket, [bucketName, bucket]] in Iterator(newBuckets)) {
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
  }
};
