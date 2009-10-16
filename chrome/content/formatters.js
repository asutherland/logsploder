let FormatHelp = {

};

let LogFormatters = {
  test: { // and subtest
    stringify: function format_test_stringify(obj) {
      return obj.type + ": " + obj.name + " " + obj.parameter;
    }
  },

  action: {
    stringify: function format_action_stringify(obj) {
      return obj.who + " " + obj.what + stringifyTypedObj(obj.arg, ": ");
    }
  },

  check: {
    stringify: function format_check_stringify(obj) {
      return (obj.success ? "PASS " : "FAIL ") +
        stringifyThing(obj.left) + " ?= " +
        stringifyThing(obj.right) +
        stringifyTypedObj(obj.stack, " in ");
    }
  },

  failure: {
    stringify: function format_failure_stringify(obj) {
      return "EXPLOSION: " + obj.text +
        stringifyTypedObj(obj.stack, " in ");
    }
  },

  /* ************ _normalize_for_json stuff ************* */

  folder: {
    stringify: function format_folder_stringify(obj) {
      return "Folder: " + obj.name;
    }
  },

  msgHdr: {
    stringify: function format_msgHdr_stringify(obj) {
      return "MsgHdr: " + obj.name;
    }
  },

  // a single frame, not a whole stack
  stackFrame: {
    stringify: function format_stackFrame_stringify(obj) {
      return obj.name + " @ " + obj.filename + ":" + obj.lineNumber;
    }
  },
};
LogFormatters.subtest = LogFormatters.test;

function stringifyThing(obj, conditionalStr) {
  if (conditionalStr == null)
    conditionalStr = "";

  if (typeof(obj) == "object") {
    if ("type" in obj)
      return stringifyTypedObj(obj, conditionalStr);
  }

  return conditionalStr + obj;
}

function stringifyTypedObj(obj, conditionalStr) {
  if (conditionalStr == null)
    conditionalStr = "";

  if (!(obj.type in LogFormatters))
    return "";

  return conditionalStr + LogFormatters[obj.type].stringify(obj);
}
