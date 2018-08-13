import {CLUSTER_WORKER_EVENTS, CLUSTER_WORKER_OPS} from "./constants";
import mapboxgl from 'mapbox-gl';

export default class Map {
    constructor(containerId, dataUrl, clusteringOptions) {
        this.map = this.getMap(containerId);
        this.worker = new Worker('worker/clusterWorker.js');
        this.dataSource = 'dataSource';
        this.attachWorkerListeners();

        this.getClustersFromWorker = this.getClustersFromWorker.bind(this);

        fetch(dataUrl)
            .then(response => response.json())
            .then((data) => this.map.on('load', () => {
                this.loadMap();
                this.initClusterer(data.features, clusteringOptions)
            }))
    }

    getMap(containerId) {
        return new mapboxgl.Map({
            container: document.getElementById(containerId),
            style: {
                version: 8,
                zoom: 9, // default zoom.
                center: [0, 51.5], // default center coordinate in [longitude, latitude] format.
                sources: {
                    // Using an open-source map tile layer.
                    "simple-tiles": {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        ],
                        tileSize: 256
                    }
                },
                glyphs: 'http://glfonts.lukasmartinelli.ch/fonts/{fontstack}/{range}.pbf',
                layers: [
                    {
                        id: "simple-tiles",
                        type: "raster",
                        source: "simple-tiles",
                        minzoom: 0,
                        maxzoom: 22
                    }
                ]
            }
        });
    }

    initClusterer(points, clusteringOptions) {
        this.worker.postMessage({
            type: CLUSTER_WORKER_OPS.init,
            options: clusteringOptions,
            points,
            bounds: this.getBounds(),
            zoom: this.map.getZoom()
        })
    }

    getClustersFromWorker() {
        this.worker.postMessage({
            type: CLUSTER_WORKER_OPS.getClusters,
            bounds: this.getBounds(),
            zoom: this.map.getZoom()
        })
    }

    getBounds() {
        const bounds = this.map.getBounds();
        return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    }

    attachWorkerListeners() {
        this.worker.onmessage = ({data}) => {
            if (data.type === CLUSTER_WORKER_EVENTS.updatePoints) {
                this.updateDataOnMap(data.points, data.allPoints)
            } else if (data.type === CLUSTER_WORKER_EVENTS.expandAndZoom) {
                this.flyTo(data.center, data.zoom);
            }
        };
    }

    flyTo(center, zoom) {
        this.map.flyTo({center, zoom});
    }

    loadMap() {
        const {map, dataSource} = this;

        //Layers
        const clusterLayerId = 'clusters';
        const clusterCountLayerId = 'cluster-count';
        const pointLayerId = 'unclustered-point';

        //Point Filters
        const clusterFilter = ['has', 'point_count'];
        const pointFilter = ['!has', 'point_count'];

        //Style properties
        const textFont = ['Open Sans Regular'];
        const textFontSize = 10;

        //Common Listeners
        const setStyleToCursor = () => map.getCanvas().style.cursor = 'pointer';
        const removeCursorStyle = () => map.getCanvas().style.cursor = '';

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
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#51bbd6',
                    100,
                    '#f1f075',
                    750,
                    '#f28cb1'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    15,
                    100,
                    20,
                    750,
                    25
                ]
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
        map.on('click', clusterLayerId, (e) => {
            const cluster = map.queryRenderedFeatures(e.point, {layers: [clusterLayerId]})[0];
            this.worker.postMessage({
                type: CLUSTER_WORKER_OPS.getClusterExpansionZoom,
                clusterId: cluster.properties.cluster_id,
                center: cluster.geometry.coordinates
            })
        });

        map.on('click', pointLayerId, event => {
            let feature = event.features[0],
                properties = feature.properties,
                pointInfo = properties.id;

            new mapboxgl.Popup()
                .setLngLat(feature.geometry.coordinates)
                .setHTML(`Clicked on point number ${pointInfo}`)
                .addTo(map);
        });

        map.on('mouseenter', clusterLayerId, setStyleToCursor);
        map.on('mouseleave', clusterLayerId, removeCursorStyle);
        map.on('mouseenter', pointLayerId, setStyleToCursor);
        map.on('mouseleave', pointLayerId, removeCursorStyle);
        map.on('moveend', this.getClustersFromWorker);
    }

    updateDataOnMap(data) {
        const source = this.map.getSource(this.dataSource);

        if (source) {
            source.setData({
                type: "FeatureCollection",
                features: data
            });
        }
    }
}
