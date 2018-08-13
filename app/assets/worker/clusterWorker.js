/*global importScripts supercluster */
importScripts('../external/supercluster.js');


//TODO - Find a way to import constants here, copying here for now
//Using es5 as this file is not transpiled

var CLUSTER_WORKER_OPS = {
    init: 'init',
    getClusters: 'getClusters',
    getClusterExpansionZoom: 'getClusterExpansionZoom'
};

var CLUSTER_WORKER_EVENTS = {
    updatePoints: 'updatePoints',
    expandAndZoom: 'expandAndZoom'
};

var clusterer;

function init(options, points, bounds, zoom) {
    clusterer = supercluster(options).load(points);
    postClusters(bounds, zoom)
}

function postClusters(bounds, zoom) {
    postMessage({
        type: CLUSTER_WORKER_EVENTS.updatePoints,
        points: clusterer.getClusters(bounds, Math.floor(zoom))
    });
}

function postClusterExpansionZoom(clusterId, center) {
    postMessage({
        type: CLUSTER_WORKER_EVENTS.expandAndZoom,
        zoom: clusterer.getClusterExpansionZoom(clusterId),
        center: center
    });
}

self.onmessage = function (e) {
    var data = e.data;
    switch (data.type) {
        case CLUSTER_WORKER_OPS.init:
            init(data.options, data.points, data.bounds, data.zoom);
            break;
        case CLUSTER_WORKER_OPS.getClusters:
            postClusters(data.bounds, data.zoom);
            break;
        case CLUSTER_WORKER_OPS.getClusterExpansionZoom:
            postClusterExpansionZoom(data.clusterId, data.center);
    }
};

