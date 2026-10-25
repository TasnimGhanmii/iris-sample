
const STATUS = document.querySelector("#status");
const RETRY = document.querySelector("#retry");
const BESS_TOGGLE = document.querySelector("#bess-toggle");
const PEATLAND_TOGGLE = document.querySelector("#peatland-toggle");


const fixtures = {
  bess: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Synthetic BESS A" },
        geometry: { type: "Point", coordinates: [7.45, 51.45] }
      },
      {
        type: "Feature",
        properties: { name: "Synthetic BESS B" },
        geometry: { type: "Point", coordinates: [7.75, 51.30] }
      }
    ]
  },
  peatland: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Synthetic peatland A" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [7.55, 51.55],
            [7.62, 51.55],
            [7.62, 51.59],
            [7.55, 51.59],
            [7.55, 51.55]
          ]]
        }
      }
    ]
  }
};

const style = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: ["https://mock-tiles.iris.test/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "Synthetic test basemap"
    },
    bess: {
      type: "geojson",
      data: fixtures.bess
    },
    peatland: {
      type: "geojson",
      data: fixtures.peatland
    }
  },
  layers: [
    {
      id: "basemap",
      type: "raster",
      source: "basemap"
    },
    {
      id: "peatland-fill",
      type: "fill",
      source: "peatland",
      paint: {
        "fill-color": "#16a34a",
        "fill-opacity": 0.45,
        "fill-outline-color": "#166534"
      }
    },
    {
      id: "bess-points",
      type: "circle",
      source: "bess",
      paint: {
        "circle-radius": 8,
        "circle-color": "#7c3aed",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2
      }
    }
  ]
};

const map = new maplibregl.Map({
  container: "map",
  style,
  center: [7.6616, 51.4332],
  zoom: 8,
  attributionControl: true
});

let styleLoaded = false;
let tileFailed = false;
let retryCount = 0;

function updateStatus(message, state) {
  STATUS.textContent = message;
  STATUS.dataset.state = state;
}

map.on("load", () => {
  styleLoaded = true;

  updateStatus(
    tileFailed
      ? "Basemap tiles failed. Retry or use the fallback background."
      : "Map style loaded; checking basemap tiles…",
    tileFailed ? "error" : "loading"
  );

  updateLayerVisibility();
});

map.on("style.load", () => {
  styleLoaded = true;
  updateLayerVisibility();
});

map.once("idle", () => {
  if (!tileFailed) {
    updateStatus(
      "Map ready. Basemap tiles loaded; fixture layers available.",
      "ready"
    );
  }
});

map.once("idle", () => {
  if (!tileFailed) {
    updateStatus("Map ready. Basemap tiles loaded; fixture layers available.", "ready");
  }
});

map.on("error", (event) => {
  const message = event?.error?.message || "Unknown map error";

  if (String(message).toLowerCase().includes("tile") ||
      String(message).includes("mock-tiles")) {
    tileFailed = true;
    updateStatus(
      "Basemap tiles failed. The fixture layers remain available; retry the basemap.",
      "error"
    );
  } else if (!styleLoaded) {
    updateStatus(`Map initialization failed: ${message}`, "error");
  }
});

function updateLayerVisibility() {
  if (!map.isStyleLoaded()) return;

  map.setLayoutProperty(
    "bess-points",
    "visibility",
    BESS_TOGGLE.checked ? "visible" : "none"
  );

  map.setLayoutProperty(
    "peatland-fill",
    "visibility",
    PEATLAND_TOGGLE.checked ? "visible" : "none"
  );
}

BESS_TOGGLE.addEventListener("change", updateLayerVisibility);
PEATLAND_TOGGLE.addEventListener("change", updateLayerVisibility);

RETRY.addEventListener("click", () => {
  retryCount += 1;
  tileFailed = false;

  updateStatus(`Retrying basemap (attempt ${retryCount})…`, "loading");

  // Reapply the same style without requiring a manual style switch.
  map.setStyle(style);

  map.once("idle", () => {
  if (!tileFailed) {
    updateStatus("Map ready. Basemap tiles loaded; fixture layers available.", "ready");
  }
});
});

window.__IRIS_MAP_TEST__ = {
  map,
  getState: () => ({
    styleLoaded,
    tileFailed,
    retryCount,
    bessVisible: BESS_TOGGLE.checked,
    peatlandVisible: PEATLAND_TOGGLE.checked
  })
};
