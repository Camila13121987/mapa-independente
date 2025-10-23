const source =
  "https://api.maptiler.com/maps/0195cab0-65de-7e42-9cdf-3c0ae2936085/style.json?key=wJI2gT4QofYYcPJuRuQp";

function getBoundingBox(geojson) {
  let minLng, maxLng, minLat, maxLat;

  geojson.features.forEach(feature => {
    const coords = feature.geometry.coordinates;
    if (minLng === undefined || coords[0] < minLng) {
      minLng = coords[0];
    }
    if (maxLng === undefined || coords[0] > maxLng) {
      maxLng = coords[0];
    }
    if (minLat === undefined || coords[1] < minLat) {
      minLat = coords[1];
    }
    if (maxLat === undefined || coords[1] > maxLat) {
      maxLat = coords[1];
    }
  });
  return [[minLng, minLat], [maxLng, maxLat]];
}

const map = new maplibregl.Map({
  container: "map",
  style: source,
  attributionControl: false
});

// Add zoom and rotation controls to the map.
map.addControl(new maplibregl.NavigationControl({
  visualizePitch: true,
  visualizeRoll: true,
  showZoom: true,
  showCompass: true
}));

// Add attribution control with collapsed option
map.addControl(new maplibregl.AttributionControl({
  compact: true,
}));

// Force attribution to be collapsed on load
map.on('load', () => {
  // Find and collapse the attribution control
  setTimeout(() => {
    const attrEl = document.querySelector('.maplibregl-ctrl-attrib');
    if (attrEl && attrEl.hasAttribute('open')) {
      attrEl.removeAttribute('open');
      attrEl.classList.remove('maplibregl-compact-show');
    }
  }, 100);
});

// Animation variables
let isPlaying = false;
let timer;
const frameDuration = 750;

const playIconSVG = '<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M8 5v14l11-7z"/></svg>';
const pauseIconSVG = '<svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

map.on("load", async () => {
  // UI Elements
  const yearSlider = document.getElementById("yearSlider"); // Re-added
  const selectedYearLabel = document.getElementById("selectedYearLabel"); // Re-added
  const timelapseRange = document.getElementById("timelapseRange");
  const timelapseDate = document.getElementById("timelapseDate");
  const playPauseButton = document.getElementById("play-pause");

  const currentYear = 2025; // Current year as per context
  let minDataYear = currentYear;
  let maxDataYear = currentYear;
  let foundMinYear = false;

  mapa_independente_data.features.forEach(feature => {
      const fromYear = parseInt(feature.properties.from);
      if (!isNaN(fromYear)) {
          if (!foundMinYear || fromYear < minDataYear) {
              minDataYear = fromYear;
              foundMinYear = true;
          }
          // No need to find maxDataYear from 'from', it's usually currentYear or based on 'to'
      }
  });
  if (!foundMinYear) {
    minDataYear = currentYear - 10; // Fallback if no valid 'from' years found
  }
  // maxDataYear remains currentYear as per existing logic for timelapseRange.max

  // Setup sliders
  if (yearSlider) { // Re-added block for yearSlider setup
    yearSlider.min = minDataYear;
    yearSlider.max = maxDataYear;
    yearSlider.value = minDataYear;
    yearSlider.step = 1;
  }
  if (timelapseRange) {
    timelapseRange.min = minDataYear;
    timelapseRange.max = maxDataYear;
    timelapseRange.value = minDataYear;
    timelapseRange.step = 1;
  }

  if (playPauseButton) {
    playPauseButton.innerHTML = playIconSVG; // Set initial icon
  }

  // Unified function to update map view based on selected year
  function updateMapViewForYear(selectedYear) {
    selectedYear = parseInt(selectedYear);

    if (yearSlider) yearSlider.value = selectedYear;
    if (timelapseRange) timelapseRange.value = selectedYear;
    if (selectedYearLabel) selectedYearLabel.textContent = selectedYear;
    if (timelapseDate) timelapseDate.textContent = selectedYear;

    const processedFeatures = mapa_independente_data.features.map(feature => {
        const fromYear = parseInt(feature.properties.from);
        const toYearString = feature.properties.to;
        // Default 'to' is currentYear (2025) if 'to' is empty, invalid, or not present
        const toYear = (toYearString && String(toYearString).trim() !== "" && !isNaN(parseInt(toYearString)))
                       ? parseInt(toYearString)
                       : currentYear;

        let displayState = 'hidden'; // Default to hidden

        if (!isNaN(fromYear)) {
            if (selectedYear >= fromYear && selectedYear <= toYear) {
                displayState = 'active';
            } else if (selectedYear > toYear && fromYear <= toYear) { // Point is past its 'to' date, and it was valid at some point
                // To be considered expired, it must have been active at some point,
                // meaning its fromYear must be less than or equal to its toYear.
                // And the selectedYear must be greater than its toYear.
                displayState = 'expired';
            }
            // If selectedYear < fromYear, it remains 'hidden'
        }
        return { ...feature, properties: { ...feature.properties, displayState: displayState } };
    }).filter(feature => feature.properties.displayState !== 'hidden'); // Filter out 'hidden' points (not yet active)


    const filteredData = {
      ...mapa_independente_data,
      features: processedFeatures,
    };

    if (map.getSource("mapa_independente")) {
      map.getSource("mapa_independente").setData(filteredData);
    }

    // Fit map to the bounds of the currently displayed features
    if (filteredData.features.length > 0) {
      const newBounds = getBoundingBox(filteredData);
      // Ensure bounds are valid before attempting to fit
      if (newBounds &&
          newBounds[0][0] !== undefined && newBounds[0][1] !== undefined &&
          newBounds[1][0] !== undefined && newBounds[1][1] !== undefined) {
        map.fitBounds(newBounds, {
          padding: 75,
          maxZoom: 13, // Prevent over-zooming on a single point or very close points
          duration: 1000 // Smooth transition
        });
      }
    } else {
      // Optional: Handle the case where no features are visible for the selected year.
      // For example, you could fly to a default extent:
      // map.flyTo({ center: [defaultLongitude, defaultLatitude], zoom: defaultZoom });
      // For now, it will keep the current view if no points are shown.
    }
  }

  // Play/pause timeline animation
  function togglePlayTimelapse() {
    isPlaying = !isPlaying;
    if (playPauseButton) {
        playPauseButton.innerHTML = isPlaying ? pauseIconSVG : playIconSVG;
    }

    if (isPlaying) {
      timer = setInterval(() => {
        let currentValue = parseInt(yearSlider.value); // Changed from timelapseRange.value
        if (currentValue >= maxDataYear) {
          currentValue = minDataYear;
        } else {
          currentValue++;
        }
        updateMapViewForYear(currentValue);
      }, frameDuration);
    } else {
      clearInterval(timer);
    }
  }

  // Event listeners
  if (yearSlider) { // Re-added event listener for yearSlider
    yearSlider.addEventListener("input", (e) => {
      if (isPlaying) togglePlayTimelapse();
      updateMapViewForYear(parseInt(e.target.value));
    });
  }

  if (timelapseRange) {
    timelapseRange.addEventListener("input", (e) => {
      if (isPlaying) togglePlayTimelapse(); // Stop playing if user manually changes slider
      updateMapViewForYear(parseInt(e.target.value));
    });
  }

  if (playPauseButton) {
    playPauseButton.addEventListener("click", togglePlayTimelapse);
  }

  try {
    // Create an SVG marker as a data URL
    const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg
        width="32px"
        height="32px"
        viewBox="0 0 16 16"
        stroke-linecap="round"
        stroke-linejoin="round"
        xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
        xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:svg="http://www.w3.org/2000/svg">
        <path
        style="fill:#e91e63;fill-opacity:1;stroke:none"
        d="M 8,1 C 4.6951784,1 2,3.6951784 2,7 2,9.225 3.4644709,11.148567 4.8378906,12.554688 6.2113103,13.960808 7.5839844,14.875 7.5839844,14.875 a 0.750075,0.750075 0 0 0 0.8320312,0 c 0,0 1.3726741,-0.914192 2.7460934,-2.320312 C 12.535529,11.148567 14,9.225 14,7 14,3.6951801 11.30483,1 8,1 Z m 0,1.5 c 2.49417,0 4.5,2.0058399 4.5,4.5 0,1.525 -1.160529,3.226433 -2.412109,4.507813 C 9.0442066,12.576346 8.3182375,13.050507 8,13.273438 7.6817625,13.050507 6.9557934,12.576346 5.9121094,11.507813 4.6605291,10.226433 3.5,8.525 3.5,7 3.5,4.5058416 5.5058416,2.5 8,2.5 Z"
        id="path1" />
        <path
        style="fill:#e91e63;fill-opacity:1;stroke:none"
        d="M 9.25,7 A 1.25,1.25 0 0 1 8,8.25 1.25,1.25 0 0 1 6.75,7 1.25,1.25 0 0 1 8,5.75 1.25,1.25 0 0 1 9.25,7 Z"
        id="path3" />
        <path
        style="fill:#e91e63;fill-opacity:1;stroke:none"
        d="M 8,5 C 6.904314,5 6,5.904314 6,7 6,8.095686 6.904314,9 8,9 9.095686,9 10,8.095686 10,7 10,5.904314 9.095686,5 8,5 Z M 8,6.5 C 8.2850259,6.5 8.5,6.7149741 8.5,7 8.5,7.2850259 8.2850259,7.5 8,7.5 7.7149741,7.5 7.5,7.2850259 7.5,7 7.5,6.7149741 7.7149741,6.5 8,6.5 Z"
        id="path4" />
      </svg>`;

    const svgStringGrey = svgString.replace(/fill:#e91e63/g, 'fill:#808080'); // Dark Grey for expired markers

    const svg64 = btoa(unescape(encodeURIComponent(svgString))); // Ensure proper UTF-8 handling for btoa
    const dataURL = `data:image/svg+xml;base64,${svg64}`;

    const svg64Grey = btoa(unescape(encodeURIComponent(svgStringGrey)));
    const dataURLGrey = `data:image/svg+xml;base64,${svg64Grey}`;

    const img = new Image();
    const imgGrey = new Image();

    let activeMarkerLoaded = false;
    let expiredMarkerLoaded = false;
    let fallbackTriggered = false;

    function setupMapLayersAndData() {
      if (fallbackTriggered) return; // Don't proceed if fallback already active

      // Add source
      if (!map.getSource("mapa_independente")) {
        map.addSource("mapa_independente", {
          type: "geojson",
          data: { type: 'FeatureCollection', features: [] }, // Initial empty data
        });
      }

      // Add layer with data-driven icon-image
      if (!map.getLayer("mapa_independente")) {
        map.addLayer({
          id: "mapa_independente", // Unified layer
          type: "symbol",
          source: "mapa_independente",
          layout: {
            'icon-image': [
                'case',
                ['==', ['get', 'displayState'], 'active'], 'custom-marker-active',
                ['==', ['get', 'displayState'], 'expired'], 'custom-marker-expired',
                'custom-marker-active' // Default/fallback icon if state is missing
            ],
            "icon-size": 1,
            "text-font": ["Open Sans", "Arial Unicode MS Bold"],
            "text-offset": [0, 1.25],
            "text-anchor": "top",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-allow-overlap": true,
            "text-ignore-placement": true
          },
        });
      }

      // Common map setup (popups, fitBounds, initial update)
      map.on('click', 'mapa_independente', function (e) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        const longitude = coordinates[0];
        const latitude = coordinates[1];

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        let popupHTML = '<div class="popup-content">';
        if (properties.name) {
          popupHTML += `<h3>${properties.name}</h3>`;
        }

        let detailsHtml = '';
        const excludedKeys = ['id', 'address_gmaps', 'share_gmaps', 'point_lat', 'point_lon', 'displaystate']; // Ensure displaystate is lowercase
        for (const key in properties) {
          if (Object.prototype.hasOwnProperty.call(properties, key) && key !== 'name' && !excludedKeys.includes(key.toLowerCase())) { // Exclude specified keys
            const value = properties[key];
            if (value === null || value === undefined || String(value).trim() === '') continue;

            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
              detailsHtml += `<p><strong>${formattedKey}:</strong> <a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a></p>`;
            } else if (typeof value === 'string' && value.includes('@') && !value.startsWith('mailto:')) {
              detailsHtml += `<p><strong>${formattedKey}:</strong> <a href="mailto:${value}">${value}</a></p>`;
            } else {
              detailsHtml += `<p><strong>${formattedKey}:</strong> ${value}</p>`;
            }
          }
        }
        popupHTML += detailsHtml;

        popupHTML += `
          <iframe
            width="100%"
            height="200"
            style="border:0;"
            loading="lazy"
            allowfullscreen
            referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${latitude},${longitude}&hl=es&z=14&amp;output=embed">
          </iframe>
        `;

        popupHTML += '</div>';

        new maplibregl.Popup({
          className: 'custom-popup',
          maxWidth: 'none'
        })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map);
      });

      map.on('mouseenter', 'mapa_independente', function () {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'mapa_independente', function () {
        map.getCanvas().style.cursor = '';
      });

      // Calculate the bounding box of the data and fit map
      const bounds = getBoundingBox(mapa_independente_data);
      map.fitBounds(bounds, { padding: 50 });

      // Initialize map view with the initial slider value
      updateMapViewForYear(minDataYear);
    }

    function handleMarkerLoadSuccess() {
        if (activeMarkerLoaded && expiredMarkerLoaded && !fallbackTriggered) {
            setupMapLayersAndData();
        }
    }

    function handleMarkerLoadError(markerType) {
        console.error(`Failed to load SVG image for ${markerType} marker. Triggering fallback.`);
        if (!fallbackTriggered) {
            fallbackTriggered = true;
            triggerFallbackMechanism();
        }
    }

    function triggerFallbackMechanism() {
        console.warn("Fallback: Using circle markers.");
        if (!map.getSource("mapa_independente")) {
            map.addSource("mapa_independente", {
              type: "geojson",
              data: { type: 'FeatureCollection', features: [] }, // Initial empty data
            });
        }
        if (!map.getLayer("mapa_independente")) { // Check if layer exists to avoid duplicate
            map.addLayer({
                id: "mapa_independente", // Fallback circle layer, ensure ID is same or handled
                type: "circle",
                source: "mapa_independente",
                paint: {
                  "circle-radius": 6,
                  "circle-color": [
                      'case',
                      ['==', ['get', 'displayState'], 'active'], '#e91e63',
                      ['==', ['get', 'displayState'], 'expired'], '#808080',
                      '#e91e63' // Default color
                  ],
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#fff",
                },
            });
        }
        // Common map setup for fallback
        map.on('click', 'mapa_independente', function (e) {
            // Popup logic here is duplicated, consider refactoring if it grows more complex
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;
            const longitude = coordinates[0];
            const latitude = coordinates[1];

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            let popupHTML = '<div class="popup-content">';
            if (properties.name) {
              popupHTML += `<h3>${properties.name}</h3>`;
            }

            let detailsHtml = '';
            const excludedKeys = ['id', 'address_gmaps', 'share_gmaps', 'point_lat', 'point_lon', 'displaystate']; // Ensure displaystate is lowercase
            for (const key in properties) {
              if (Object.prototype.hasOwnProperty.call(properties, key) && key !== 'name' && !excludedKeys.includes(key.toLowerCase())) {
                const value = properties[key];
                if (value === null || value === undefined || String(value).trim() === '') continue;
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
                  detailsHtml += `<p><strong>${formattedKey}:</strong> <a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a></p>`;
                } else if (typeof value === 'string' && value.includes('@') && !value.startsWith('mailto:')) {
                  detailsHtml += `<p><strong>${formattedKey}:</strong> <a href="mailto:${value}">${value}</a></p>`;
                } else {
                  detailsHtml += `<p><strong>${formattedKey}:</strong> ${value}</p>`;
                }
              }
            }
            popupHTML += detailsHtml;
            // Iframe logic (ensure it's the same as in the primary path)
            let rawIframeSrc = `https://maps.google.com/maps?q=${latitude},${longitude}&hl=es&z=14&output=embed`;
            if (properties.share_gmaps && typeof properties.share_gmaps === 'string') {
              try {
                const shareUrl = new URL(properties.share_gmaps);
                if ((shareUrl.hostname === 'maps.google.com' || shareUrl.hostname === 'www.google.com')) {
                  if (shareUrl.pathname.startsWith('/maps/place/')) {
                    const pathParts = shareUrl.pathname.split('/');
                    if (pathParts.length > 3 && pathParts[3] && pathParts[3] !== '@') {
                      const placeName = decodeURIComponent(pathParts[3]);
                      rawIframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&hl=es&z=14&output=embed`;
                    }
                  } else if (shareUrl.searchParams.has('q')) {
                    const query = shareUrl.searchParams.get('q');
                    rawIframeSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=es&z=14&output=embed`;
                  }
                }
              } catch (urlParseError) { console.warn('Could not parse share_gmaps URL for fallback popup:', properties.share_gmaps, urlParseError); }
            }
            const finalIframeSrcForHtml = rawIframeSrc.replace(/&/g, '&amp;');
            popupHTML += `
              <h4>Location Preview:</h4>
              <iframe width="100%" height="200" style="border:0;" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${finalIframeSrcForHtml}"></iframe>
            `;
            popupHTML += '</div>';

            new maplibregl.Popup({ className: 'custom-popup', maxWidth: 'none' })
              .setLngLat(coordinates)
              .setHTML(popupHTML)
              .addTo(map);
        });
        map.on('mouseenter', 'mapa_independente', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'mapa_independente', () => { map.getCanvas().style.cursor = ''; });

        const bounds = getBoundingBox(mapa_independente_data);
        map.fitBounds(bounds, { padding: 50 });
        updateMapViewForYear(minDataYear);
    }

    img.onload = function() {
      map.addImage('custom-marker-active', img);
      activeMarkerLoaded = true;
      handleMarkerLoadSuccess();
    };
    img.onerror = () => handleMarkerLoadError('active');
    img.src = dataURL;

    imgGrey.onload = function() {
      map.addImage('custom-marker-expired', imgGrey);
      expiredMarkerLoaded = true;
      handleMarkerLoadSuccess();
    };
    imgGrey.onerror = () => handleMarkerLoadError('expired');
    imgGrey.src = dataURLGrey;

  } catch (error) {
    console.error("General error setting up custom marker or initial map layers:", error);
    if (!fallbackTriggered) {
        fallbackTriggered = true;
        triggerFallbackMechanism(); // Trigger fallback on general error too
    }
  }

  // Initial call to set the map based on the default year
  // This is now handled within setupMapLayersAndData or triggerFallbackMechanism
});

// Removed the second map.on('load', ...) block and its related 'points' source/layer logic.
// All slider and map update logic is now consolidated above.

const mapa_independente_data = {
  "type": "FeatureCollection",
  "name": "mapa-indpendente",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": [
    { "type": "Feature", "properties": { "id": "1", "name": "A ILHA ", "address": "Rua da ilha do principe 3a, porta E, 1170-182 Lisboa, Portugal", "phone_number": "351 21 826 92 70", "website": "https://www.a-ilha.pt/en", "email": "info@a-ilha.pt", "category": "Espaço Independente ", "from": "2013", "to": "", "address_gmaps": "R. Ilha do Príncipe 3A porta E, 1170-182 Lisboa", "share_gmaps": "https://maps.app.goo.gl/XE7MWX8vffZByDgt5", "point_lat": "38.7276091", "point_lon": "-9.1316058" }, "geometry": { "type": "Point", "coordinates": [ -9.1316058, 38.7276091 ] } },
    { "type": "Feature", "properties": { "id": "2", "name": "A.Space", "address": "Arco Escuro, nº 6, Lisboa (Campo das Cebolas)", "phone_number": "351 914 865 243", "website": "https://aspace.pt/pt/", "email": "info@aspace.pt", "category": "Espaço Independente ", "from": "2013", "to": "", "address_gmaps": "Arco Escuro 6, 1100-389 Lisboa", "share_gmaps": "https://maps.app.goo.gl/Cwd9Pk6cWzV9rgX3A", "point_lat": "38.7092552", "point_lon": "-9.1341093" }, "geometry": { "type": "Point", "coordinates": [ -9.1341093, 38.7092552 ] } },
    { "type": "Feature", "properties": { "id": "3", "name": "AiR351 Art in Residence", "address": "Avenida Vasco da Gama nº 11, 2750-509 Cascais, Portugal", "phone_number": "Não disponível ", "website": "https://air351.art/", "email": "info@air351.art", "category": "Espaço Independente ", "from": "2015", "to": "", "address_gmaps": "Av. Vasco da Gama 11, 2750-509 Cascais", "share_gmaps": "https://maps.app.goo.gl/zPSr7ewZBh8wBEQK9", "point_lat": "38.6965704", "point_lon": "-9.4229744" }, "geometry": { "type": "Point", "coordinates": [ -9.4229744, 38.6965704 ] } },
    { "type": "Feature", "properties": { "id": "4", "name": "Appleton Associação Cultural ", "address": "R. Acácio de Paiva 27, 1700-004 Lisboa, Portugal ", "phone_number": "351 210 993 660", "website": "https://appleton.pt/programa/?lang=pt-pt", "email": "appleton@appleton.pt", "category": "Espaço Independente ", "from": "2007", "to": "", "address_gmaps": "R. Acácio de Paiva 27, 1700-004 Lisboa", "share_gmaps": "https://maps.app.goo.gl/VBq3PGb45XaiQExYA", "point_lat": "38.7558787", "point_lon": "-9.1434369" }, "geometry": { "type": "Point", "coordinates": [ -9.1434369, 38.7558787 ] } },
    { "type": "Feature", "properties": { "id": "5", "name": "Atelier Concorde", "address": "Rua Leite Vasconcelos 43A, 1170-198 Lisboa, Portugal", "phone_number": "Não disponível ", "website": "https://www.atelierconcorde.org/", "email": "okconcorde@gmail.com", "category": "Espaço Independente ", "from": "2010", "to": "", "address_gmaps": "R. Leite de Vasconcelos 43A, 1170-198 Lisboa", "share_gmaps": "https://maps.app.goo.gl/a8qCzTvMNyJ2myxT9", "point_lat": "38.7177168", "point_lon": "-9.1249811" }, "geometry": { "type": "Point", "coordinates": [ -9.1249811, 38.7177168 ] } },
    { "type": "Feature", "properties": { "id": "6", "name": "Cortex ", "address": "Rua Melo Mexia 9a, 7040-067, Arraiolos, Portugal", "phone_number": "351 936 650 003", "website": "https://www.cortexfrontal.org/", "email": "info@cortexfrontal.org", "category": "Espaço Independente", "from": "2015", "to": "", "address_gmaps": "Rua Mello Mexia 9A, 7040-067 Arraiolos", "share_gmaps": "https://maps.app.goo.gl/qfc1JDaLMEtR6Atg8", "point_lat": "38.7237970", "point_lon": "-7.9863574" }, "geometry": { "type": "Point", "coordinates": [ -7.9863574, 38.723797 ] } },
    { "type": "Feature", "properties": { "id": "7", "name": "Duplex Air ", "address": "Rua Angelina Vidal 31C - 1170-017 Lisboa, Portugal ", "phone_number": "Não disponível ", "website": "https://www.duplexair.com/", "email": "hello@duplexair.com", "category": "Espaço Independente ", "from": "2019", "to": "", "address_gmaps": "R. Angelina Vidal 31c, 1170-017 Lisboa", "share_gmaps": "https://maps.app.goo.gl/8ERntxvCyrgAWT2aA", "point_lat": "38.7219766", "point_lon": "-9.1307668" }, "geometry": { "type": "Point", "coordinates": [ -9.1307668, 38.7219766 ] } },
    { "type": "Feature", "properties": { "id": "8", "name": "Egeu", "address": "R. do Funchal 1A, 1000-163 Lisboa, Portugal", "phone_number": "Não disponível ", "website": "https://egeu-project.com/", "email": "egeuproject@gmail.com", "category": "Espaço Independente ", "from": "2019", "to": "2023", "address_gmaps": "R. do Funchal 1 A 1000, 1000-154 Lisboa", "share_gmaps": "https://maps.app.goo.gl/FSRwE5GFb8bgrh3W9", "point_lat": "38.7337315", "point_lon": "-9.1402153" }, "geometry": { "type": "Point", "coordinates": [ -9.1402153, 38.7337315 ] } },
    { "type": "Feature", "properties": { "id": "9", "name": "Emerge ", "address": "Avenida Tenente Valadim, 17, 2º piso, 2560-274, Torres Vedras, Portugal ", "phone_number": "351 919 182 780", "website": "https://www.emerge-ac.pt/en/", "email": "", "category": "Espaço Independente", "from": "2016", "to": "", "address_gmaps": "Av. Ten. Valadim 17 2.ªpiso, 2560-275 Torres Vedras", "share_gmaps": "https://maps.app.goo.gl/BwyVJgVVpZ51e2gZ8", "point_lat": "39.0923919", "point_lon": "-9.2574085" }, "geometry": { "type": "Point", "coordinates": [ -9.2574085, 39.0923919 ] } },
    { "type": "Feature", "properties": { "id": "10", "name": "Foundation Obras ", "address": "Heradade de marmeleira, N18, 7100-301, Évora Monte", "phone_number": "Não disponível ", "website": "http://www.obras-art.org/", "email": "obrasart@hotmail.com ", "category": "Espaço Independente", "from": "2003", "to": "", "address_gmaps": "Heradade de marmeleira, N18, 7100-301 Évora Monte", "share_gmaps": "https://maps.app.goo.gl/7SoWWzhy6XAvqD378", "point_lat": "38.7961898", "point_lon": "-7.6944828" }, "geometry": { "type": "Point", "coordinates": [ -7.6944828, 38.7961898 ] } },
    { "type": "Feature", "properties": { "id": "11", "name": "Galeria Zé dos Bois ", "address": "Rua da Barroca nº 59, 1200-047 Lisboa, Portugal", "phone_number": "351 213 430 205", "website": "http://www.zedosbois.org", "email": "e. reservas[@]zedosbois[.]org", "category": "Espaço Independente  ", "from": "1994", "to": "", "address_gmaps": "R. da Barroca 59, 1200-049 Lisboa", "share_gmaps": "https://maps.app.goo.gl/2APVzsTn1aca5ZJRA", "point_lat": "38.7126883", "point_lon": "-9.1446383" }, "geometry": { "type": "Point", "coordinates": [ -9.1446383, 38.7126883 ] } },
    { "type": "Feature", "properties": { "id": "12", "name": "Hangar ", "address": "Rua Damasceno Monteiro, 12 r/c, 1170-112 Lisboa, Portugal ", "phone_number": "351 934 155 100", "website": "https://hangar.com.pt", "email": "geral@hangar.com.pt", "category": "Espaço Independente ", "from": "2014", "to": "", "address_gmaps": "R. Damasceno Monteiro 12, 1170-108 Lisboa", "share_gmaps": "https://maps.app.goo.gl/jQroqvfgCsQfqZjg8", "point_lat": "38.7185978", "point_lon": "-9.1322542" }, "geometry": { "type": "Point", "coordinates": [ -9.1322542, 38.7185978 ] } },
    { "type": "Feature", "properties": { "id": "13", "name": "Kindred Spirit Projects", "address": "Rua da Boavista 54, 1200-085 Lisboa, Portugal ", "phone_number": "351 217 162 220", "website": "https://kindredspiritprojects.com", "email": "info@kindredprojects.com", "category": "Espaço Independente ", "from": "2023", "to": "", "address_gmaps": "Rua da Boavista 54, 1200-262 Lisboa", "share_gmaps": "https://maps.app.goo.gl/pXw5b4Akt1UGcXEGA", "point_lat": "38.7088189", "point_lon": "-9.1485260" }, "geometry": { "type": "Point", "coordinates": [ -9.148526, 38.7088189 ] } },
    { "type": "Feature", "properties": { "id": "14", "name": "Kusnthalle Lissabon ", "address": "R. José Sobral Cid 9E, 1900-289 Lisboa, Portugal", "phone_number": "351 912 045 650", "website": "http://www.kunsthalle-lissabon.org", "email": "info@kunsthalle-lissabon.org", "category": "Espaço Independente ", "from": "2009", "to": "", "address_gmaps": "R. José Sobral Cid 9E, 1900-312 Lisboa", "share_gmaps": "https://maps.app.goo.gl/qRDGWT1oTHxvpfpU9", "point_lat": "38.7236265", "point_lon": "-9.1156212" }, "geometry": { "type": "Point", "coordinates": [ -9.1156212, 38.7236265 ] } },
    { "type": "Feature", "properties": { "id": "15", "name": "Largo Residências", "address": "Rua Gomes Freire, 161, 1150-176, Lisboa, Portugal ", "phone_number": "351 21 888 54 20", "website": "https://www.largoresidencias.com", "email": " info@largoresidencias.com", "category": "Espaço Independente ", "from": "2011", "to": "", "address_gmaps": "R. Gomes Freire 161, 1150-176 Lisboa", "share_gmaps": "https://maps.app.goo.gl/4sgDtqSPJYCpkMbP8", "point_lat": "38.7258681", "point_lon": "-9.1408387" }, "geometry": { "type": "Point", "coordinates": [ -9.1408387, 38.7258681 ] } },
    { "type": "Feature", "properties": { "id": "16", "name": "Maumaus - Lumiar Cité", "address": "Avenida António Augusto de Aguiar, 148 - 3º C, 1050-021 Lisboa, Portugal", "phone_number": "351 217 551 570", "website": "http://www.maumaus.org", "email": "maumaus@maumaus.org", "category": "Espaço Independente ", "from": "2009", "to": "", "address_gmaps": "Av. António Augusto de Aguiar 148 3º C, 1050-021 Lisboa", "share_gmaps": "https://maps.app.goo.gl/faSXut5pTdPnjZBc6", "point_lat": "38.7353848", "point_lon": "-9.1544428" }, "geometry": { "type": "Point", "coordinates": [ -9.1544428, 38.7353848 ] } },
    { "type": "Feature", "properties": { "id": "17", "name": "Mono Lisboa ", "address": "Rua feio terenas, 31a, 1170-176 lisboa, Portugal ", "phone_number": "Não disponível ", "website": "https://monolisboa.com/", "email": "info@monolisboa.com", "category": "Espaço Independente", "from": "2019", "to": "", "address_gmaps": "R. Feio Terenas 31A, 1170-176 Lisboa", "share_gmaps": "https://maps.app.goo.gl/XWm5qnriiLWj4ZhSA", "point_lat": "38.7234293", "point_lon": "-9.1308599" }, "geometry": { "type": "Point", "coordinates": [ -9.1308599, 38.7234293 ] } },
    { "type": "Feature", "properties": { "id": "18", "name": "Nowhere", "address": "Estr. de Chelas 41, Lisboa, Portugal", "phone_number": "351 910 654 87", "website": "https://www.nowhere-lisboa.com", "email": "nowherelisboa@gmail.com", "category": "Espaço Independente", "from": "2018", "to": "", "address_gmaps": "Estr. de Chelas 41, Lisboa", "share_gmaps": "https://maps.app.goo.gl/EZn6EGaY1YViFAcd6", "point_lat": "38.7264448", "point_lon": "-9.1158967" }, "geometry": { "type": "Point", "coordinates": [ -9.1158967, 38.7264448 ] } },
    { "type": "Feature", "properties": { "id": "19", "name": "Pada Studios and Residency", "address": "Rua 42, Parque Empresarial da Quimiparque n 2, Barreiro, Portugal ", "phone_number": "Não disponível ", "website": "https://www.padastudios.com/about-pada", "email": "info@padastudios.com", "category": "Espaço Independente", "from": "2018", "to": "", "address_gmaps": "Rua 42, Parque Empresarial da Quimiparque n2, 2831-904 Barreiro", "share_gmaps": "https://maps.app.goo.gl/9dpArsUoCwwEjNNy8", "point_lat": "38.6660050", "point_lon": "-9.0664270" }, "geometry": { "type": "Point", "coordinates": [ -9.066427, 38.666005 ] } },
    { "type": "Feature", "properties": { "id": "20", "name": "Parasita ", "address": "Avenida Infante D. Henrique, N334, 1800-244, Lisboa, Portugal ", "phone_number": "351 916 436 740", "website": "https://parasita.eu/parasita/", "email": "associacaoparasita@gmail.com", "category": "Espaço Independente", "from": "2014", "to": "", "address_gmaps": "Av. Infante Dom Henrique 334, 1800-224 Lisboa", "share_gmaps": "https://maps.app.goo.gl/VAgSMzSCVgGbSYUR6", "point_lat": "38.7613491", "point_lon": "-9.1031882" }, "geometry": { "type": "Point", "coordinates": [ -9.1031882, 38.7613491 ] } },
    { "type": "Feature", "properties": { "id": "21", "name": "Passetive", "address": " R. Maria da Fonte 54A, 1170-217 Lisboa, Portugal ", "phone_number": "351 918 753 471", "website": "https://www.passevite.net/artistas/", "email": "diz@passevite.net", "category": "Espaço Independente ", "from": "2015", "to": "", "address_gmaps": "R. Maria da Fonte 54A, 1170-217 Lisboa", "share_gmaps": "https://maps.app.goo.gl/NtmRfDF1AX7pHGvd9", "point_lat": "38.7231552", "point_lon": "-9.1321345" }, "geometry": { "type": "Point", "coordinates": [ -9.1321345, 38.7231552 ] } },
    { "type": "Feature", "properties": { "id": "22", "name": "Revólver ", "address": "Rua da Boavista 84, 1200-068 Lisboa", "phone_number": "351 926 576 443", "website": "https://artecapital.net/plataforma.php?t=home", "email": "plataformarevolver@gmail.com", "category": "Espaço Independente", "from": "2006", "to": "2022", "address_gmaps": "Rua da Boavista 84, 1200-068 Lisboa", "share_gmaps": "https://maps.app.goo.gl/6wtQNDwC52n8gaaN7", "point_lat": "38.7088885", "point_lon": "-9.1489593" }, "geometry": { "type": "Point", "coordinates": [ -9.1489593, 38.7088885 ] } },
    { "type": "Feature", "properties": { "id": "23", "name": "Salto Lisboa", "address": "Calçada Dom Gastão 5A, 1300-193 Lisboa, Portugal ", "phone_number": "351  917 974 399", "website": "https://www.instagram.com/salto_lisboa/", "email": "Saltolisboa@gmail.com", "category": "Espaço Independente ", "from": "2020", "to": "", "address_gmaps": "Calçada Dom Gastão 5A, 1300-193 Lisboa", "share_gmaps": "https://maps.app.goo.gl/NaB6zdN3WeaYzgeC6", "point_lat": "38.7293964", "point_lon": "-9.1083166" }, "geometry": { "type": "Point", "coordinates": [ -9.1083166, 38.7293964 ] } },
    { "type": "Feature", "properties": { "id": "24", "name": "Zarathan ", "address": "R. de São Bento 432, 1250-221 Lisboa, Portugal ", "phone_number": "Não disponível ", "website": "https://zaratan.pt/pt/", "email": "info@zaratan.pt", "category": "Espaço Independente", "from": "2014", "to": "", "address_gmaps": "R. de São Bento 432, 1250-221 Lisboa", "share_gmaps": "https://maps.app.goo.gl/9zVKeMyynYDXrKzQ6", "point_lat": "38.7157102", "point_lon": "-9.1544410" }, "geometry": { "type": "Point", "coordinates": [ -9.154441, 38.7157102 ] } },
    { "type": "Feature", "properties": { "id": "25", "name": "1399 ART. LIVE. ROOM", "address": "Rua do Vale de Santo António 48С, 1170-381 Lisboa", "phone_number": "Não disponível ", "website": "https://www.instagram.com/1399live.art.room/?hl=en", "email": "", "category": "Espaço Independente", "from": "2023", "to": "", "address_gmaps": "Rua do Vale de Santo António 48С, 1170-381 Lisboa", "share_gmaps": "https://maps.app.goo.gl/zK8wvqvwD8AfqaLS6", "point_lat": "38.7182866", "point_lon": "-9.1227536" }, "geometry": { "type": "Point", "coordinates": [ -9.1227536, 38.7182866 ] } },
    { "type": "Feature", "properties": { "id": "26", "name": "ADAO – Associação para o Desenvolvimento das Artes e Ofícios", "address": "Rua da Recosta 1, 2830-303 Barreiro", "phone_number": "Não disponível ", "website": "https://www.adao2830.org/", "email": "geral@adao2830.org", "category": "Espaço Independente", "from": "2015", "to": "", "address_gmaps": "Rua da Recosta 0, 2830-303 Barreiro", "share_gmaps": "https://maps.app.goo.gl/cjVj26Gs12jwmS3z8", "point_lat": "38.6556738", "point_lon": "-9.0774873" }, "geometry": { "type": "Point", "coordinates": [ -9.0774873, 38.6556738 ] } },
    { "type": "Feature", "properties": { "id": "27", "name": "Galeria Artur Bual", "address": "R. Luís de Camões, 2700-422 Amadora", "phone_number": "351 21 436 9059", "website": "https://www.cm-amadora.pt/pt/cultura/galeria-municipal-artur-bual.html", "email": "", "category": "Espaço Independente", "from": "2006", "to": "", "address_gmaps": "R. Luís de Camões, 2700-422 Amadora", "share_gmaps": "https://maps.app.goo.gl/fvBbNPyAnx5oDpKu9", "point_lat": "38.7567773", "point_lon": "-9.2356033" }, "geometry": { "type": "Point", "coordinates": [ -9.2356033, 38.7567773 ] } },
    { "type": "Feature", "properties": { "id": "28", "name": "FIAR, Associação Cultural - Centro de Artes de Rua", "address": "Rua Jaime Afreixo, 71, 2950 Palmela", "phone_number": "351 210831500", "website": "https://www.facebook.com/artenaviladepalmela", "email": "fiarproducao@gmail.com", "category": "Espaço Independente", "from": "1995", "to": "", "address_gmaps": "O Moinho, rua Heliodoro Salgado, Parque Venâncio Ribeiro da Costa, 2950-241 Palmela", "share_gmaps": "https://maps.app.goo.gl/yWEwpT595yBrc7kx9", "point_lat": "38.5670745", "point_lon": "-8.9029055" }, "geometry": { "type": "Point", "coordinates": [ -8.9029055, 38.5670745 ] } },
    { "type": "Feature", "properties": { "id": "29", "name": "Rua das Gaivotas 6", "address": "R. Gaivotas 6, 1200-202 Lisboa", "phone_number": "351 912 191 940", "website": "https://ruadasgaivotas6.pt/", "email": "", "category": "Espaço Independente", "from": "2015", "to": "", "address_gmaps": "R. das Gaivotas 8, 1200-202 Lisboa", "share_gmaps": "https://maps.app.goo.gl/YcYoKqNoMZMoqKpz9", "point_lat": "38.7092756", "point_lon": "-9.1508754" }, "geometry": { "type": "Point", "coordinates": [ -9.1508754, 38.7092756 ] } }
  ]
};
