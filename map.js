let map;
let drawingManager;
let selectedMarkers = [];
let allMarkers = [];
let currentRectangle = null;
let currentCircle = null;
let previouslySelectedMarker = null;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
    });

    const bounds = new google.maps.LatLngBounds();

    markers.forEach((markerData) => {
        const marker = new google.maps.Marker({
            position: markerData.position,
            map,
            title: markerData.title,
            icon: getMarkerIcon(markerData.background, 24),
        });

        marker.addListener("click", () => {
            highlightMarker(marker);
            displayDetails(markerData, marker);
        });

        marker.markerData = markerData; // Attach markerData to the marker object
        allMarkers.push(marker);
        bounds.extend(new google.maps.LatLng(markerData.position.lat, markerData.position.lng));
    });

    map.fitBounds(bounds);

    // Initialize the drawing manager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['rectangle', 'circle']
        },
        rectangleOptions: {
            fillColor: '#ffff00',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
        },
        circleOptions: {
            fillColor: '#ffff00',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'overlaycomplete', function(event) {
        if (currentRectangle) {
            currentRectangle.setMap(null);
        }
        if (currentCircle) {
            currentCircle.setMap(null);
        }

        if (event.type === 'rectangle') {
            currentRectangle = event.overlay;
            setSelectedMarkersOpacity(currentRectangle);
        } else if (event.type === 'circle') {
            currentCircle = event.overlay;
            setSelectedMarkersOpacity(currentCircle);
        }

        showExportButton();
        showClearButton();
    });
}

function getMarkerIcon(color, size) {
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 3.75 3 8.25 7 11.71C16 17.25 19 12.75 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
            </svg>`)}`,
        scaledSize: new google.maps.Size(size, size),
    };
}

function highlightMarker(selectedMarker) {
    if (previouslySelectedMarker && previouslySelectedMarker !== selectedMarker) {
        previouslySelectedMarker.setIcon(getMarkerIcon(previouslySelectedMarker.markerData.background, 24)); // Reset size of the previously selected marker
    }
    selectedMarker.setIcon(getMarkerIcon(selectedMarker.markerData.background, 50)); // Highlight selected marker with size 50
    previouslySelectedMarker = selectedMarker; // Update the previously selected marker
}

function setSelectedMarkersOpacity(shape) {
    selectedMarkers = [];
    const bounds = shape.getBounds ? shape.getBounds() : null;
    const center = shape.getCenter ? shape.getCenter() : null;
    const radius = shape.getRadius ? shape.getRadius() : null;

    allMarkers.forEach(marker => {
        let isSelected = false;
        if (bounds) {
            isSelected = bounds.contains(marker.getPosition());
        } else if (center && radius) {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(center, marker.getPosition());
            isSelected = distance <= radius;
        }

        if (isSelected) {
            marker.setOpacity(1); // Full opacity for selected markers
            selectedMarkers.push(marker);
        } else {
            marker.setOpacity(0.1); // Low opacity for unselected markers
        }
    });
}

function showExportButton() {
    const sidebar = document.getElementById('sidebar');
    let exportButton = document.getElementById('exportButton');
    if (!exportButton) {
        exportButton = document.createElement('button');
        exportButton.id = 'exportButton';
        exportButton.innerText = 'Export';
        exportButton.className = 'location-button';
        exportButton.addEventListener('click', exportSelectedMarkers);
        sidebar.appendChild(exportButton);
    }
}

function showClearButton() {
    const sidebar = document.getElementById('sidebar');
    let clearButton = document.getElementById('clearButton');
    if (!clearButton) {
        clearButton = document.createElement('button');
        clearButton.id = 'clearButton';
        clearButton.innerText = 'Clear Selection';
        clearButton.className = 'location-button';
        clearButton.addEventListener('click', clearSelection);
        sidebar.appendChild(clearButton);
    }
}

function clearSelection() {
    if (currentRectangle) {
        currentRectangle.setMap(null);
        currentRectangle = null;
    }
    if (currentCircle) {
        currentCircle.setMap(null);
        currentCircle = null;
    }
    allMarkers.forEach(marker => {
        marker.setOpacity(1);
        marker.setIcon(getMarkerIcon(marker.markerData.background, 24)); // Reset size of all markers but keep their colors
    });
    previouslySelectedMarker = null; // Reset previously selected marker
    selectedMarkers = [];
    const sidebar = document.getElementById('sidebar');
    const exportButton = document.getElementById('exportButton');
    const clearButton = document.getElementById('clearButton');
    if (exportButton) {
        sidebar.removeChild(exportButton);
    }
    if (clearButton) {
        sidebar.removeChild(clearButton);
    }
}

function drawCircle(marker, radiusMiles) {
    if (currentCircle) {
        currentCircle.setMap(null);
    }

    const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters

    currentCircle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        map,
        center: marker.getPosition(),
        radius: radiusMeters,
    });

    setSelectedMarkersOpacity(currentCircle);
    showExportButton();
    showClearButton();
}

function exportSelectedMarkers() {
    const selectedData = selectedMarkers.map(marker => {
        const data = marker.markerData;
        return {
            title: data.title,
            lat: marker.getPosition().lat(),
            lng: marker.getPosition().lng(),
            sentences: data.sentence.join('|')
        };
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + "title,latitude,longitude,sentences\n" 
        + selectedData.map(e => `${e.title},${e.lat},${e.lng},"${e.sentences}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "selected_markers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function displayDetails(markerData, marker) {
    const detailsDiv = document.getElementById("details");
    detailsDiv.innerHTML = '';

    const inputDiv = document.createElement("div");
    inputDiv.style.marginBottom = "10px";
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Radius in miles";
    input.style.marginRight = "10px";
    const button = document.createElement("button");
    button.className = "location-button";
    button.innerText = "Draw Circle";
    button.onclick = () => {
        const radiusMiles = parseFloat(input.value);
        if (!isNaN(radiusMiles) && radiusMiles > 0) {
            drawCircle(marker, radiusMiles);
        }
    };
    inputDiv.appendChild(input);
    inputDiv.appendChild(button);
    detailsDiv.appendChild(inputDiv);

    const titleButton = document.createElement("button");
    titleButton.className = "location-button";
    titleButton.innerHTML = `${markerData.title} <span>&times;</span>`;
    titleButton.querySelector("span").onclick = () => {
        detailsDiv.innerHTML = '';
    };
    detailsDiv.appendChild(titleButton);

    const list = document.createElement("ul");
    markerData.sentence.forEach((sentence, index) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${index + 1}. ${sentence}`;
        list.appendChild(listItem);
    });
    detailsDiv.appendChild(list);
}
