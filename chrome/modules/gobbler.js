/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Logsploder.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

EXPORTED_SYMBOLS = ["LogGobbler"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

/**
 * Primitive incoming server base class.
 */
function Gobbler() {
  this._mainThread = Cc["@mozilla.org/thread-manager;1"]
                       .getService(Ci.nsIThreadManager).mainThread;
  this.connections = [];
}
Gobbler.prototype = {
  start: function Gobbler_start(aPort) {
    this._socket = Cc["@mozilla.org/network/server-socket;1"]
                     .createInstance(Ci.nsIServerSocket);
    this._socket.init(aPort, /* local only */ true, /* default backlog */ -1);
    this._socket.asyncListen(this);
    dump("started!\n");
  },

  stop: function Gobbler_stop() {
    if (this._socket) {
      this._socket.close();
      this._socket = null;
    }
  },

  // ===== nsIServerSocketListener =====
  onSocketAccepted: function Gobbler_onSocketAccepted(aServer, aTransport) {
    dump("got connection!\n");
    let inputStream = aTransport.openInputStream(0, 0, 0)
                                .QueryInterface(Ci.nsIAsyncInputStream);
    let conn = new this.connectionClass(this, inputStream);
    this.connections.push(conn);
  },
  onStopListening: function Gobbler_onStopListening(aServer, aStatus) {
    dump("onStopListening\n");
  }
};

function GobblerConnection(aGobbler, aInputStream) {
  this._gobbler = aGobbler;
  this._inputStream = aInputStream;
  this._scriptableInputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                                  .createInstance(Ci.nsIScriptableInputStream);
  this._scriptableInputStream.init(this._inputStream);

  this._inputStream.asyncWait(this, 0, 0, this._gobbler._mainThread);

  this._data = "";
}
GobblerConnection.prototype = {
  onInputStreamReady: function (aInputStream) {
    try {
      this._data += this._scriptableInputStream.read(
          this._scriptableInputStream.available());
    }
    catch (ex) {
      this.close();
      return;
    }

    let idxNewLine;
    while ((idxNewline = this._data.indexOf("\r\n")) != -1) {
      let line = this._data.substring(0, idxNewline);
      this._data = this._data.substring(idxNewline+2);
      this.processLine(line);
    }

    this._inputStream.asyncWait(this, 0, 0, this._gobbler._mainThread);
  },

  close: function () {
    try {
      this._scriptableInputStream.close();
      this._inputStream.close();
    }
    catch (ex) {
    }
    this._scriptableInputStream = null;
    this._inputStream = null;
  }
};

/**
 * Specialized log processing server; which is to say, we know how to create
 *
 */
function LogGobbler(aLogEventListener) {
  Gobbler.call(this);
  this.logEventListener = aLogEventListener;
}
LogGobbler.prototype = {
  __proto__: Gobbler.prototype,
  connectionClass: LogGobblerConnection,
  _json: Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON),
};

function LogGobblerConnection() {
  GobblerConnection.apply(this, arguments);
}
LogGobblerConnection.prototype = {
  __proto__: GobblerConnection.prototype,
  processLine: function LogGobblerConnection_processLine(aLine) {
    let message = this._gobbler._json.decode(aLine);
    this._gobbler.logEventListener.onLogMessage(message);
  },
};
