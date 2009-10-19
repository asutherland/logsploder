let FormatHelp = {
  /**
   * Create/wrap into a clicky node that shows an object explorer for the given
   *  object when clicked.
   */
  makeDetailLink: function FormatHelp_makeDetailLink(textOrNodes, detailObj) {
    let node = document.createElement("span");
    $(node).addClass("clicky");
    if (typeof(textOrNodes) == "string") {
      node.textContent = textOrNodes;
    }
    else {
      for each (let [, childNode] in Iterator(textOrNodes)) {
        node.appendChild(childNode);
      }
    }

    node.onclick = function() {
      LogUI.showDetail(detailObj, node);
    };

    return node;
  }
};

let LogFormatters = {
  test: { // and subtest
    stringify: function format_test_stringify(obj) {
      return obj.type + ": " + obj.name + " " + obj.parameter;
    }
  },

  action: {
    stringify: function format_action_stringify(obj) {
      return obj.who + " " + obj.what + stringifyList(obj.args, ": ", true);
    },

    nodify: function format_action_nodify(obj) {
      return nodifyList([obj.who, obj.what, obj.args]);
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
    },
  },

  msgHdr: {
    stringify: function format_msgHdr_stringify(obj) {
      return "MsgHdr: " + obj.name;
    },
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

function stringifyTypedList(things, conditionalStr, delimit) {
  let s = "";
  for each (let [iThing, thing] in Iterator(things)) {
    s += stringifyThing(thing, iThing ? (delimit ? ", " : " ") : "");
  }
  if (conditionalStr && s)
    return conditionalStr + s;
  return s;
}

function nodifyTypedObj(obj) {
  if (!(obj.type in LogFormatters))
    return document.createTextNode("No formatter for type: " + obj.type);

  let formatter = LogFormatters[obj.type];
  // if there is no explicit nodifier, just stringify and link it.
  if ("nodify" in formatter)
    return formatter.nodify(obj);
  else
    return FormatHelp.makeDetailLink(formatter.stringify(obj), obj);
}

function nodifyThing(obj, genericObjHandler) {
  if (obj == null) {
    return document.createTextNode("null");
  }
  else if (typeof(obj) == "string") {
    return document.createTextNode(obj);
  }
  else if (typeof(obj) != "object") {
    return document.createTextNode(obj.toString());
  }
  else if ("type" in obj) {
    return nodifyTypedObj(obj);
  }
  else if ("length" in obj) {
    return nodifyList(obj, genericObjHandler, true);
  }
  else if (genericObjHandler) {
    return genericObjHandler(obj);
  }
  else if ("_stringRep" in obj) {
    return FormatHelp.makeDetailLink(obj._stringRep, obj);
  }
  else {
    return FormatHelp.makeDetailLink("OBJECT", obj);
  }
};

function nodifyList(things, genericObjHandler, delimit) {
  let span = document.createElement("span");
  for each (let [iThing, thing] in Iterator(things)) {
    if (iThing) {
      if (delimit)
        span.appendChild(document.createTextNode(", "));
      else
        span.appendChild(document.createTextNode(" "));
    }
    span.appendChild(nodifyThing(thing, genericObjHandler));
  }
  return span;
}
