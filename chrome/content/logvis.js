/*
 * Exciting logging visualization...
 */

/**
 *
 */
function makeTimeVis(aWidth, aHeight) {
  let vis = new pv.Panel()
    .width(aWidth)
    .height(aHeight);


}

let LoggerHierarchyVisier = {
  WIDTH: 360,
  HEIGHT: 360,
  _init: function LoggerHierarchyVisier_init() {
    LogManager.registerListener("onNewLogger", this.onNewLogger, this);
    LogManager.registerListener("onReset", this._onReset, this);

    LogUI.registerListener("onLogFileSelected", this._onLogFileSelected, this);
  },

  _onReset: function LoggerHierarchyVisier__onReset() {
    this.loggerTree = [];
    this._updateVis();
  },

  selectedLogFile: null,
  _onLogFileSelected: function LoggerHierarchyVisier__onLogFileSelected(
                                 logFile) {
    this.selectedLogFile = logFile;
    this.onNewLogger(logFile, null);
  },

  /**
   * Map loggers to their colors.  We do this as a side-effect of building and
   *  updating the treemap.
   */
  loggersToColors: {},

  _vis: null,

  _makeVis: function LoggerHierarchyVisier__makeVis() {
    let vis = this._vis = new pv.Panel()
      .canvas("logger-hierarchy-vis")
      .width(this.WIDTH)
      .height(this.HEIGHT);

    //let colorize = pv.Colors.category20().by(function(n) n.keys);
    let colorize = function(s, n) {
      let loggerName = n.keys.join(".");
      let hue = 360 * s.index / s.scene.length;
      let mapColor = new pv.Color.Hsl(hue, 1, 0.8, 1);
      let textColor = new pv.Color.Hsl(hue, 1, 0.3, 1);
      LoggerHierarchyVisier.loggersToColors[loggerName] = textColor.color;
      return mapColor;
    };

    this._treemap = pv.Layout.treemap(this.loggerTree)
      //.inset(17, 1, 1, 1)
      .round(true);

    this._mapvis = vis.add(pv.Bar)
        .extend(this._treemap)
        //.width(function(n) n.width - 1)
        //.height(function(n) n.height - 1)
        .title(function(n) n.keys.join("."))
        .fillStyle(function(n) colorize(this, n));
    this._mapvis.anchor("top").add(pv.Label)
        .text(function(n) n.keys[n.keys.length - 1]);
  },
  _updateVis: function LoggerHierarchyVisier__updateVis() {
    if (this._vis == null)
      this._makeVis();
    else {
      this._treemap = pv.Layout.treemap(this.loggerTree)
        //.inset(17, 1, 1, 1)
        .round(true);
      this._mapvis.extend(this._treemap);
    }

    this._vis.render();
  },

  onNewLogger: function LoggerHierarchyVisier_onNewLogger(logFile,
                                                          newLoggerName) {
    if (logFile != this.selectedLogFile)
      return;

    let flatLoggers = [];
    for each (let [name, val] in Iterator(logFile.knownLoggers)) {
      flatLoggers.push([name, val]);
    }
    this.loggerTree = pv.tree(flatLoggers)
      .keys(function(d) d[0].split("."))
      .value(function(d) 1)
      .map();
    this._updateVis();
  },
};
LoggerHierarchyVisier._init();



let DateBucketVis = {
  _init: function DateBucketVis__init() {
    this._updateRequired = true;
    LogManager.registerListener("onReset", this._onReset, this);

    LogUI.registerListener("onLogFileSelected", this._onLogFileSelected, this);
  },

  selectedLogFile: null,
  logAggr: null,
  _onLogFileSelected: function LoggerHierarchyVisier__onLogFileSelected(
                                 logFile) {
    this.selectedLogFile = logFile;
    this.logAggr = new LogAggr(logFile);
    this.buckets = this.logAggr.bucketAggrs;
    if (this._cellVis)
      this._cellVis.data(this.buckets);
    this._updateRequired = true;
    this.updateVis();
  },

  _onReset: function DateBucketVis__onReset() {
    this._updateRequired = true;
    this.updateVis();
  },

  WIDTH: 615,
  HEIGHT: 369,
  CELL_WIDTH: 41,
  CELL_HEIGHT: 41,
  _vis: null,
  _makeVis: function DateBucketVis__makeVis() {
    let vis = this._vis = new pv.Panel()
      .canvas("date-bucket-vis")
      .width(this.WIDTH)
      .height(this.HEIGHT);

    this._treemap = pv.Layout.treemap(LoggerHierarchyVisier.loggerTree)
      .round(true);

    let WIDTH = this.WIDTH, HEIGHT = this.HEIGHT;
    let CELL_WIDTH = this.CELL_WIDTH, CELL_HEIGHT = this.CELL_HEIGHT;
    let xCount = Math.floor(WIDTH / CELL_WIDTH);
    let yCount = Math.floor(HEIGHT / CELL_HEIGHT);

    //let raw_colorize =
    //  pv.Colors.category20().by(function(n) n.keys);

    function colorize(s, n) {
      let loggerName = n.keys.join(".");
      let p = s.parent;
      let bucketAggr = p.scene[p.index].data;
      let count = 0;
      if (loggerName in bucketAggr.loggerCounts)
        count = bucketAggr.loggerCounts[loggerName];
      return new pv.Color.Hsl(360 * s.index / s.scene.length,
                              Math.min(1.0, count / 10),
                              0.8, 1);
    };

    let cell = this._cellVis = vis.add(pv.Panel)
      .data(this.buckets)
      .top(function() Math.floor(this.index / xCount) * CELL_HEIGHT)
      .left(function() (this.index % xCount) * CELL_WIDTH)
      .height(CELL_HEIGHT - 1)
      .width(CELL_WIDTH - 1)
      .event("click", function(d) LogUI.selectBucket(d));
    this._mapvis = cell.add(pv.Bar)
      .extend(this._treemap)
      .fillStyle(function(n) colorize(this, n));

  },
  updateVis: function DateBucketVis__updateVis() {
    if (!this.logAggr)
      return;

    // don't do anything if nothing changed.
    if (!this.logAggr.chew() && !this._updateRequired)
      return;

    if ((this.buckets.length == 0) && !this._updateRequired)
      return;
    this._updateRequired = false;

    if (this._vis == null)
      this._makeVis();
    else {
      this._treemap = pv.Layout.treemap(LoggerHierarchyVisier.loggerTree)
        .round(true);
      this._mapvis.extend(this._treemap);
    }

    this._vis.render();
  }
};
DateBucketVis._init();

setInterval(function() {
  try {
    DateBucketVis.updateVis();
  }
  catch (ex) {
    dump("!!! exception updating DateBucketVis\n");
    dump(ex + "\n");
    dump(ex.stack + "\n\n");
  }
}, 1000);
