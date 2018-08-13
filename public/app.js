(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("constants.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var CLUSTER_WORKER_OPS = exports.CLUSTER_WORKER_OPS = {
    init: 'init',
    getClusters: 'getClusters',
    getClusterExpansionZoom: 'getClusterExpansionZoom'
};

var CLUSTER_WORKER_EVENTS = exports.CLUSTER_WORKER_EVENTS = {
    updatePoints: 'updatePoints',
    expandAndZoom: 'expandAndZoom'
};
});

require.register("initialize.js", function(exports, require, module) {
'use strict';

var _map = require('./map');

var _map2 = _interopRequireDefault(_map);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

document.addEventListener('DOMContentLoaded', function () {
    new _map2.default('container', 'data/places.json', {
        radius: 40,
        maxZoom: 20
    });
});
});

require.register("map.js", function(exports, require, module) {
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _constants = require('./constants');

var _mapboxGl = require('mapbox-gl');

var _mapboxGl2 = _interopRequireDefault(_mapboxGl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Map = function () {
    function Map(containerId, dataUrl, clusteringOptions) {
        var _this = this;

        _classCallCheck(this, Map);

        this.map = this.getMap(containerId);
        this.worker = new Worker('worker/clusterWorker.js');
        this.dataSource = 'dataSource';
        this.attachWorkerListeners();

        this.getClustersFromWorker = this.getClustersFromWorker.bind(this);

        fetch(dataUrl).then(function (response) {
            return response.json();
        }).then(function (data) {
            return _this.map.on('load', function () {
                _this.loadMap();
                _this.initClusterer(data.features, clusteringOptions);
            });
        });
    }

    _createClass(Map, [{
        key: 'getMap',
        value: function getMap(containerId) {
            return new _mapboxGl2.default.Map({
                container: document.getElementById(containerId),
                style: {
                    version: 8,
                    zoom: 9, // default zoom.
                    center: [0, 51.5], // default center coordinate in [longitude, latitude] format.
                    sources: {
                        // Using an open-source map tile layer.
                        "simple-tiles": {
                            type: "raster",
                            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"],
                            tileSize: 256
                        }
                    },
                    glyphs: 'http://glfonts.lukasmartinelli.ch/fonts/{fontstack}/{range}.pbf',
                    layers: [{
                        id: "simple-tiles",
                        type: "raster",
                        source: "simple-tiles",
                        minzoom: 0,
                        maxzoom: 22
                    }]
                }
            });
        }
    }, {
        key: 'initClusterer',
        value: function initClusterer(points, clusteringOptions) {
            this.worker.postMessage({
                type: _constants.CLUSTER_WORKER_OPS.init,
                options: clusteringOptions,
                points: points,
                bounds: this.getBounds(),
                zoom: this.map.getZoom()
            });
        }
    }, {
        key: 'getClustersFromWorker',
        value: function getClustersFromWorker() {
            this.worker.postMessage({
                type: _constants.CLUSTER_WORKER_OPS.getClusters,
                bounds: this.getBounds(),
                zoom: this.map.getZoom()
            });
        }
    }, {
        key: 'getBounds',
        value: function getBounds() {
            var bounds = this.map.getBounds();
            return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
        }
    }, {
        key: 'attachWorkerListeners',
        value: function attachWorkerListeners() {
            var _this2 = this;

            this.worker.onmessage = function (_ref) {
                var data = _ref.data;

                if (data.type === _constants.CLUSTER_WORKER_EVENTS.updatePoints) {
                    _this2.updateDataOnMap(data.points, data.allPoints);
                } else if (data.type === _constants.CLUSTER_WORKER_EVENTS.expandAndZoom) {
                    _this2.flyTo(data.center, data.zoom);
                }
            };
        }
    }, {
        key: 'flyTo',
        value: function flyTo(center, zoom) {
            this.map.flyTo({ center: center, zoom: zoom });
        }
    }, {
        key: 'loadMap',
        value: function loadMap() {
            var _this3 = this;

            var map = this.map,
                dataSource = this.dataSource;

            //Layers

            var clusterLayerId = 'clusters';
            var clusterCountLayerId = 'cluster-count';
            var pointLayerId = 'unclustered-point';

            //Point Filters
            var clusterFilter = ['has', 'point_count'];
            var pointFilter = ['!has', 'point_count'];

            //Style properties
            var textFont = ['Open Sans Regular'];
            var textFontSize = 10;

            //Common Listeners
            var setStyleToCursor = function setStyleToCursor() {
                return map.getCanvas().style.cursor = 'pointer';
            };
            var removeCursorStyle = function removeCursorStyle() {
                return map.getCanvas().style.cursor = '';
            };

            //Source
            map.addSource(dataSource, {
                type: 'geojson',
                data: {
                    type: "FeatureCollection",
                    features: []
                }
            });

            //Layers
            map.addLayer({
                id: clusterLayerId,
                type: 'circle',
                source: dataSource,
                filter: clusterFilter,
                paint: {
                    'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075', 750, '#f28cb1'],
                    'circle-radius': ['step', ['get', 'point_count'], 15, 100, 20, 750, 25]
                }
            });

            map.addLayer({
                id: clusterCountLayerId,
                type: 'symbol',
                source: dataSource,
                filter: clusterFilter,
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': textFont,
                    'text-size': textFontSize
                }
            });

            map.addLayer({
                id: pointLayerId,
                type: 'circle',
                source: dataSource,
                filter: pointFilter,
                paint: {
                    'circle-color': '#f00',
                    'circle-radius': 8,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            //Events
            map.on('click', clusterLayerId, function (e) {
                var cluster = map.queryRenderedFeatures(e.point, { layers: [clusterLayerId] })[0];
                _this3.worker.postMessage({
                    type: _constants.CLUSTER_WORKER_OPS.getClusterExpansionZoom,
                    clusterId: cluster.properties.cluster_id,
                    center: cluster.geometry.coordinates
                });
            });

            map.on('click', pointLayerId, function (event) {
                var feature = event.features[0],
                    properties = feature.properties,
                    pointInfo = properties.id;

                new _mapboxGl2.default.Popup().setLngLat(feature.geometry.coordinates).setHTML('Clicked on point number ' + pointInfo).addTo(map);
            });

            map.on('mouseenter', clusterLayerId, setStyleToCursor);
            map.on('mouseleave', clusterLayerId, removeCursorStyle);
            map.on('mouseenter', pointLayerId, setStyleToCursor);
            map.on('mouseleave', pointLayerId, removeCursorStyle);
            map.on('moveend', this.getClustersFromWorker);
        }
    }, {
        key: 'updateDataOnMap',
        value: function updateDataOnMap(data) {
            var source = this.map.getSource(this.dataSource);

            if (source) {
                source.setData({
                    type: "FeatureCollection",
                    features: data
                });
            }
        }
    }]);

    return Map;
}();

exports.default = Map;
});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map