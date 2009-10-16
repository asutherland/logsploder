/*
 * UI servicing of things...
 */

/**
 * In charge of the various concepts of selection and such.
 */
let LogUI = {
  _init: function LogUI__init() {

  },

  selectBucket: function LogUI_showBucket(bucketAggr) {
    this._notifyListeners("onBucketSelected", [bucketAggr]);
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

/**
 * In charge of the log listing UI which is slaved to the currently selected
 *  bucket.
 */
let LogList = {
  _init: function LogList__init() {
    LogUI.registerListener("onBucketSelected", this.onBucketSelected, this);
  },

  onBucketSelected: function LogList_onBucketSelected(bucketAggr) {
    let bucket = LogManager.getBucket(bucketAggr.name);

    let bucketNode = document.getElementById("bucket-contents");
    while (bucketNode.lastChild)
      bucketNode.removeChild(bucketNode.lastChild);

    let listRoot = document.createElement("ul");

    for each (let [, msg] in Iterator(bucket)) {
      let text = "";
      for each (let [, msgObj] in Iterator(msg.messageObjects)) {
        // ignore contexts for this purpose
        if (typeof(msgObj) != "object")
          text += (text ? " " : "") + msgObj;
        else if ("_isContext" in msgObj)
          continue;
        else if ("type" in msgObj)
          text += stringifyTypedObj(msgObj, " ");

        let listNode = document.createElement("li");
        listNode.textContent = text;
        listRoot.appendChild(listNode);
      }
    }

    bucketNode.appendChild(listRoot);
  },


};
LogList._init();
