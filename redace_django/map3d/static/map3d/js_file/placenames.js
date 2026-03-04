let placenameDataSource = null;

let placenameRequestId = 0;
let placenameLoading = false;

// ★定数は上
const PLACENAME_SHOW_MIN_H = 1.0e5;
const PLACENAME_SHOW_MAX_H = 1.0e6;

// ★「function 宣言」にする（これが重要）
function shouldShowPlacenames(viewer) {
  const h = viewer.camera.positionCartographic.height;
  return (h >= PLACENAME_SHOW_MIN_H && h <= PLACENAME_SHOW_MAX_H);
}

async function loadPlacenamesByBBox(viewer) {
  if (!shouldShowPlacenames(viewer)) return;
  if (placenameLoading) return;
  placenameLoading = true;

  const myId = ++placenameRequestId;

  try {
    const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
    if (!rect) return;

    const west  = Cesium.Math.toDegrees(rect.west);
    const east  = Cesium.Math.toDegrees(rect.east);
    const south = Cesium.Math.toDegrees(rect.south);
    const north = Cesium.Math.toDegrees(rect.north);

    const url = `/map3d/api/placenames?west=${west}&east=${east}&south=${south}&north=${north}&limit=200`;
    const geojson = await fetch(url).then(r => r.json());

    if (myId !== placenameRequestId) return;

    if (placenameDataSource) viewer.dataSources.remove(placenameDataSource);

    placenameDataSource = await Cesium.GeoJsonDataSource.load(geojson, { clampToGround: true });

    placenameDataSource.entities.values.forEach(e => {
      const name = e.properties.name.getValue();
      e.billboard = undefined;
      e.label = new Cesium.LabelGraphics({
        text: name,
        font: "18px sans-serif",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        showBackground: true,
        pixelOffset: new Cesium.Cartesian2(0, -12),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      });
    });

    viewer.dataSources.add(placenameDataSource);
  } finally {
    placenameLoading = false;
  }
}

function clearPlacenames(viewer) {
  placenameRequestId++;
  if (placenameDataSource) {
    viewer.dataSources.remove(placenameDataSource);
    placenameDataSource = null;
  }
}

// ★最後に export
window.shouldShowPlacenames = shouldShowPlacenames;
window.loadPlacenamesByBBox = loadPlacenamesByBBox;
window.clearPlacenames = clearPlacenames;

console.log("placenames.js loaded", PLACENAME_SHOW_MIN_H, PLACENAME_SHOW_MAX_H);
