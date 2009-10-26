let SpecialContextProcessors = {
  lifecycle: {
    process: function scp_lifecycle_process(logFile, aggr, bucketAggr,
                                            msg, msgObj) {
      if (msgObj._id == "start") {
        aggr.state = "running";
      }
      else if (msgObj._id == "finish") {
        aggr.state = "finished";
        LogProcessor.notify("lifecycle", "finished", [logFile]);
      }
    }
  }
};

let TypedContextProcessors = {
  test: {
    makeContext: function tcp_test_makeContext(logFile, parentContext,
                                               aggr, bucketAggr, msg, msgObj) {
      if (!("tests" in aggr))
        aggr.tests = [];

      let test = {
        id: msgObj._id,
        name: msgObj.name,
        parameter: msgObj.parameter,
        firstSeenInBucket: bucketAggr,
        subtests: [],
      };

      if (parentContext) {
        parentContext.subtests.push(test);
        LogProcessor.notify("subtest", "new", [logFile, parentContext, test]);
      }
      else {
        aggr.tests.push(test);
        LogProcessor.notify("test", "new", [logFile, null, test]);
      }

      return test;
    }
  }
};
TypedContextProcessors.subtest = TypedContextProcessors.test;

let TypedObjectProcessors = {
  failure: {
    process: function top_failure_process(context, aggr, bucketAggr, msg, msgObj) {
      if (aggr.failures)
        aggr.failures++;
      else
        aggr.failures = 1;
      if (bucketAggr.failures)
        bucketAggr.failures++;
      else
        bucketAggr.failures = 1;
    }
  }
};
