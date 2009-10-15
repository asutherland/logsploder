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
  HEIGHT: 240,
  _init: function LoggerHierarchyVisier_init() {
    LogManager.registerListener("onNewLogger", this.onNewLogger, this);
  },

  _vis: null,
  _makeVis: function LoggerHierarchyVisier__makeVis() {
    let vis = this._vis = new pv.Panel()
      .width(this.WIDTH)
      .height(this.HEIGHT);

    let colorize = pv.Colors.category19().by(function(n) n.keys.slice(0, -1));

    this._treemap = pv.Layout.treemap(this.loggerTree)
      .round(true).inset(17, 1, 1, 1).root("");

    this._mapvis = vis.add(pv.Bar)
        .extend(this._treemap)
        //.width(function(n) n.width - 1)
        //.height(function(n) n.height - 1)
        .title(function(n) n.keys.join("."))
        .fillStyle(function(n) colorize(n).alpha(0.5));
    this._mapvis.anchor("top").add(pv.Label)
        .text(function(n) n.keys[n.keys.length - 1]);
  },
  _updateVis: function LoggerHierarchyVisier__updateVis() {
    if (this._vis == null)
      this._makeVis();
    else {
      this._treemap = pv.Layout.treemap(this.loggerTree)
        .round(true).inset(17, 1, 1, 1).root("");
      this._mapvis.extend(this._treemap);
    }

    this._vis.render();
  },

  onNewLogger: function LoggerHierarchyVisier_onNewLogger(loggers,
                                                          newLoggerName) {
    let flatLoggers = [];
    for each (let [name, val] in Iterator(loggers)) {
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
  WIDTH: 600,
  HEIGHT: 600,
  CELL_WIDTH: 60,
  CELL_HEIGHT: 60,
  _vis: null,
  _makeVis: function DateBucketVis__makeVis() {
    let vis = this._vis = new pv.Panel()
      .width(this.WIDTH)
      .height(this.HEIGHT)
      .fillStyle("blue");

    this._treemap = pv.Layout.treemap(LoggerHierarchyVisier.loggerTree)
      .round(true);

    let WIDTH = this.WIDTH, HEIGHT = this.HEIGHT;
    let CELL_WIDTH = this.CELL_WIDTH, CELL_HEIGHT = this.CELL_HEIGHT;
    let xCount = Math.floor(WIDTH / CELL_WIDTH);
    let yCount = Math.floor(HEIGHT / CELL_HEIGHT);

    let raw_colorize =
      pv.Colors.category19().by(function(n) n.keys.slice(0, -1));

    function colorize(s, n) {
      let loggerName = n.keys.join(".");
      //dump("s.parent: " + uneval(s.parent) + "\n");
      let p = s.parent;
      //dump("index: " + p.index + "\n");
      let bucketAggr = p.scene[p.index].data;
      //dump("s: " + uneval(s) + "\n");
      //dump("n: " + uneval(n) + "\n");
      let count = 0;
      if (loggerName in bucketAggr.loggerCounts)
        count = bucketAggr.loggerCounts[loggerName];
      return raw_colorize(n).alpha(Math.min(1.0, count / 2 + 0.4));
    };

    let cell = vis.add(pv.Panel)
      .data(this.buckets)
      .top(function() Math.floor(this.index / xCount) * CELL_HEIGHT)
      .left(function() (this.index % xCount) * CELL_WIDTH)
      .height(CELL_HEIGHT)
      .width(CELL_WIDTH);
    this._mapvis = cell.add(pv.Bar)
      .extend(this._treemap)
      //.fillStyle(function(n) colorize(this, n));
      .fillStyle(function(n) raw_colorize(n));

  },
  updateVis: function DateBucketVis__updateVis() {
    LogAggr.chew();
    this.buckets = LogAggr.bucketAggrs;

    if (this.buckets.length == 0)
      return;

    dump(this.buckets.length + " buckets\n");

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

setInterval(function() {
              DateBucketVis.updateVis();
            }, 1000);
