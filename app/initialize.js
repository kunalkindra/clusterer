import Map from './map';

document.addEventListener('DOMContentLoaded', () => {
    new Map('container', 'data/places.json', {
        radius: 40,
        maxZoom: 20
    });
});
