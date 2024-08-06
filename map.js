let map;
let drawingManager;
let selectedMarkers = [];
let allMarkers = [];
let currentRectangle = null;
let currentCircle = null;
let previouslySelectedMarker = null;
let currentUnit = 'miles'; // Default unit

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
            showClearButton(); // Show clear button on marker click
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
            setSelectedMarkersOpacity(currentRectangle, false); // Rectangle does not need distance calculations
        } else if (event.type === 'circle') {
            currentCircle = event.overlay;
            setSelectedMarkersOpacity(currentCircle, true); // Circle needs distance calculations
        }

        clearSidebar(); // Clear sidebar for both rectangle and circle
        showExportButton();
        showClearButton(); // Show clear button on drawing complete
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

function setSelectedMarkersOpacity(shape, calculateDistance) {
    selectedMarkers = [];
    const bounds = shape.getBounds ? shape.getBounds() : null;
    const center = shape.getCenter ? shape.getCenter() : null;
    const radius = shape.getRadius ? shape.getRadius() : null;

    allMarkers.forEach(marker => {
        let isSelected = false;
        marker.distanceFromCenter = null; // Reset distance initially

        if (calculateDistance && center && radius) {
            // Circle selection
            const distance = google.maps.geometry.spherical.computeDistanceBetween(center, marker.getPosition());
            isSelected = distance <= radius;
            if (isSelected) {
                marker.distanceFromCenter = distance; // Store distance only if selected
            }
        } else if (bounds) {
            // Rectangle selection
            isSelected = bounds.contains(marker.getPosition());
        }

        if (isSelected) {
            marker.setOpacity(1); // Full opacity for selected markers
            selectedMarkers.push(marker);
        } else {
            marker.setOpacity(0.1); // Low opacity for unselected markers
        }
    });
}

function clearSidebar() {
    const detailsDiv = document.getElementById("controls");
    const markerInfoDiv = document.getElementById("marker-info");
    if (detailsDiv) {
        detailsDiv.innerHTML = ''; // Clear the input details section
    }
    if (markerInfoDiv) {
        markerInfoDiv.innerHTML = ''; // Clear the marker info section
    }
}

function showExportButton() {
    const sidebar = document.getElementById('controls');
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
    const sidebar = document.getElementById('controls');
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
    const sidebar = document.getElementById('controls');
    const exportButton = document.getElementById('exportButton');
    const clearButton = document.getElementById('clearButton');
    if (exportButton) {
        sidebar.removeChild(exportButton);
    }
    if (clearButton) {
        sidebar.removeChild(clearButton);
    }
    clearSidebar(); // Clear the details section
}

function drawCircle(marker, radius) {
    if (currentCircle) {
        currentCircle.setMap(null);
    }

    const conversionFactor = currentUnit === 'miles' ? 1609.34 : 1000; // Convert miles to meters or km to meters

    const radiusMeters = radius * conversionFactor;

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

    setSelectedMarkersOpacity(currentCircle, true);
    showExportButton();
    showClearButton(); // Show clear button when a circle is drawn
}

function exportSelectedMarkers() {
    const selectedData = selectedMarkers.map(marker => {
        const data = marker.markerData;
        const distanceMiles = marker.distanceFromCenter ? (marker.distanceFromCenter / 1609.34).toFixed(2) : "N/A"; // Convert meters to miles if available
        return {
            title: data.title,
            lat: marker.getPosition().lat(),
            lng: marker.getPosition().lng(),
            distance: distanceMiles,
            sentences: data.sentence.join('|')
        };
    });

    const csvContent = "data:text/csv;charset=UTF-8," 
        + "title,latitude,longitude,distance,sentences\n" 
        + selectedData.map(e => `${e.title},${e.lat},${e.lng},${e.distance},"${e.sentences}"`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "selected_markers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function displayDetails(markerData, marker) {
    const detailsDiv = document.getElementById("controls");
    const markerInfoDiv = document.getElementById("marker-info");

    if (!detailsDiv || !markerInfoDiv) {
        console.error("Cannot find sidebar elements.");
        return;
    }

    detailsDiv.innerHTML = ''; // Clear the first compartment
    markerInfoDiv.innerHTML = ''; // Clear the second compartment

    // First Compartment: Input and Control Section
    const unitDiv = document.createElement("div");
    unitDiv.style.marginBottom = "10px";
    const milesRadio = document.createElement("input");
    milesRadio.type = "radio";
    milesRadio.name = "unit";
    milesRadio.value = "miles";
    milesRadio.checked = currentUnit === 'miles';
    milesRadio.onchange = () => currentUnit = 'miles';

    const milesLabel = document.createElement("label");
    milesLabel.innerText = "Miles";

    const kmRadio = document.createElement("input");
    kmRadio.type = "radio";
    kmRadio.name = "unit";
    kmRadio.value = "km";
    kmRadio.checked = currentUnit === 'km';
    kmRadio.onchange = () => currentUnit = 'km';

    const kmLabel = document.createElement("label");
    kmLabel.innerText = "Kilometers";

    unitDiv.appendChild(milesRadio);
    unitDiv.appendChild(milesLabel);
    unitDiv.appendChild(document.createTextNode(" "));
    unitDiv.appendChild(kmRadio);
    unitDiv.appendChild(kmLabel);
    detailsDiv.appendChild(unitDiv);

    const inputDiv = document.createElement("div");
    inputDiv.style.marginBottom = "10px";
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Radius";
    input.style.marginRight = "10px";
    const button = document.createElement("button");
    button.className = "location-button";
    button.innerText = "Draw Circle";
    button.onclick = () => {
        const radius = parseFloat(input.value);
        if (!isNaN(radius) && radius > 0) {
            drawCircle(marker, radius);
        }
    };
    inputDiv.appendChild(input);
    inputDiv.appendChild(button);
    detailsDiv.appendChild(inputDiv);

    // Second Compartment: Marker Information Section
    const titleParagraph = document.createElement("p");
    titleParagraph.innerHTML = `<strong>Location:</strong> ${markerData.title}`;
    markerInfoDiv.appendChild(titleParagraph);

    const relatedSentencesHeader = document.createElement("h4");
    relatedSentencesHeader.innerText = "Related Sentences";
    markerInfoDiv.appendChild(relatedSentencesHeader);

    const list = document.createElement("ul");
    markerData.sentence.forEach((sentence, index) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${index + 1}. ${sentence}`;
        list.appendChild(listItem);
    });
    markerInfoDiv.appendChild(list);
}
