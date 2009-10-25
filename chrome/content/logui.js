/*
 * UI servicing of things...
 */

/**
 * In charge of the various concepts of selection and such.
 */
let LogUI = {
  _init: function LogUI__init() {
    LogManager.registerListener("onNewLogFile", this.onNewLogFile, this);
  },
  _uiInit: function LogUI__uiInit() {
    $("#data-tabs").tabs();
  },

  selectedLogFile: null,

  onNewLogFile: function LogUI_onNewLogFile(logFile) {
    this.selectLogFile(logFile);
  },

  selectLogFile: function LogUI_selectLogFile(logFile) {
    this.selectedLogFile = logFile;
    this._notifyListeners("onLogFileSelected", arguments);
  },

  /**
   * Select a bucket and make it current.
   *
   * @param bucketAggr A bucket aggregation as provided by LogAggr.
   */
  selectBucket: function LogUI_selectBucket(bucketAggr) {
    this._notifyListeners("onBucketSelected",
                          [this.selectedLogFile, bucketAggr]);
    $("#data-tabs").tabs("select", "bucket-contents");
  },

  showDetail: function LogUI_showDetail(obj, clickOrigin) {
    this._notifyListeners("onShowDetail", arguments);
    $("#data-tabs").tabs("select", "detail-view");
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
LogUI._init();
$(LogUI._uiInit);

/**
 * In charge of the log listing UI which is slaved to the currently selected
 *  bucket.
 */
let LogList = {
  _init: function LogList__init() {
    LogUI.registerListener("onBucketSelected", this.onBucketSelected, this);
  },

  onBucketSelected: function LogList_onBucketSelected(logFile, bucketAggr) {
    let bucket = logFile.getBucket(bucketAggr.name);

    let bucketNode = document.getElementById("bucket-contents");
    while (bucketNode.lastChild)
      bucketNode.removeChild(bucketNode.lastChild);

    let listRoot = document.createElement("ul");

    for each (let [, msg] in Iterator(bucket)) {
      // filter out contexts for now
      let realThings = [];
      for each (let [, msgObj] in Iterator(msg.messageObjects)) {
        if (msgObj && (typeof(msgObj) == "object") &&
            ("_isContext" in msgObj))
          // in the future we would do something having seen this
          continue;
        realThings.push(msgObj);
      }

      let listNode = document.createElement("li");
      listNode.appendChild(nodifyList(realThings, null, 1));

      let textColor = LoggerHierarchyVisier.loggersToColors[msg.loggerName];
      if (textColor)
        listNode.setAttribute("style", "color: " + textColor + ";");

      listRoot.appendChild(listNode);
    }

    bucketNode.appendChild(listRoot);
  },
};
LogList._init();

/**
 * Implements a primitive detail view that just builds a hierarchical definition
 *  list.
 */
let DetailView = {
  _init: function DetailView__init() {
    LogUI.registerListener("onShowDetail", this.onShowDetail, this);
  },

  _buildDefTree: function DetailView__buildDefTree(obj) {
    let listRoot = document.createElement("dl");
    for each (let [key, val] in Iterator(obj)) {
      let topic = document.createElement("dt");
      topic.textContent = key;

      let data = document.createElement("dd");
      data.appendChild(nodifyThing(val), DetailView._buildDefTree);

      listRoot.appendChild(topic);
      listRoot.appendChild(data);
    }
    return listRoot;
  },

  onShowDetail: function DetailView_onShowDetail(obj) {
    let detailNode = document.getElementById("detail-view");

    while (detailNode.lastChild)
      detailNode.removeChild(detailNode.lastChild);

    detailNode.appendChild(this._buildDefTree(obj));
  },
};
DetailView._init();

/**
 * Implements the "Test Files" tab that shows us the various tests we have heard
 *  about.
 */
let TestFilesList = {
  _init: function TestFilesList__init() {
    LogManager.registerListener("onReset", this.onReset, this);
    LogManager.registerListener("onNewLogFile", this.onNewLogFile, this);
  },

  onReset: function TestFilesList_onReset() {
    let root = document.getElementById("test-files");
    while (root.lastChild)
      root.removeChild(root.lastChild);
  },

  onNewLogFile: function TestFilesList_onNewLogFile(logFile) {
    let root = document.getElementById("test-files");
    let listRoot;
    if (root.lastChild) {
      listRoot = root.lastChild;
    }
    else {
      listRoot = document.createElement("ul");
      root.appendChild(listRoot);
    }

    let fileNode = document.createElement("li");
    fileNode.textContent = logFile.name;
    fileNode.setAttribute("class", "clicky");
    fileNode.onclick = function() {
      LogUI.selectLogFile(logFile);
    };
    listRoot.appendChild(fileNode);
  }
};
TestFilesList._init();
