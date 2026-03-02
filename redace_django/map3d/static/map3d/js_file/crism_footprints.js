let crismFootprintsDS = null;

// 表示する高度範囲（必要なら調整）
const CRISM_FP_SHOW_MIN_H = 0.0;     // 近すぎても消さないなら 0
const CRISM_FP_SHOW_MAX_H = 2.0e7;   // 遠すぎたら消すなら調整

function shouldShowCrismFootprints(viewer) {
  const h = viewer.camera.positionCartographic.height;
  return (h >= CRISM_FP_SHOW_MIN_H && h <= CRISM_FP_SHOW_MAX_H);
}

async function loadCrismFootprintsByBBox(viewer) {
  const rect = viewer.camera.computeViewRectangle();
  if (!rect) return;

  const west  = Cesium.Math.toDegrees(rect.west);
  const east  = Cesium.Math.toDegrees(rect.east);
  const south = Cesium.Math.toDegrees(rect.south);
  const north = Cesium.Math.toDegrees(rect.north);

  const url = `/map3d/api/crism_footprints?west=${west}&east=${east}&south=${south}&north=${north}&limit=800`;

  const geojson = await fetch(url).then(r => r.json());

  if (crismFootprintsDS) viewer.dataSources.remove(crismFootprintsDS);

  crismFootprintsDS = await Cesium.GeoJsonDataSource.load(geojson, {
    clampToGround: true,
  });

  // 見た目を赤枠にする
  crismFootprintsDS.entities.values.forEach(e => {
    if (!e.polygon) return;

    e.polygon.material = Cesium.Color.RED.withAlpha(0.12);
    e.polygon.outline = true;
    e.polygon.outlineColor = Cesium.Color.RED;
    e.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
    e.polygon.disableDepthTestDistance = Infinity;

    // クリックしやすいように名前を付ける（任意）
    const obsid = e.properties?.observation_id?.getValue?.();
    if (obsid) e.name = `CRISM ${obsid}`;
  });

  viewer.dataSources.add(crismFootprintsDS);
}

function clearCrismFootprints(viewer) {
  if (crismFootprintsDS) {
    viewer.dataSources.remove(crismFootprintsDS);
    crismFootprintsDS = null;
  }
}

// クリックで詳細を開く（openCrismDetailはあなたの既存関数に置換）
function installCrismFootprintClick(viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    if (!Cesium.defined(picked) || !picked.id) return;

    const ent = picked.id;

    // CRISM footprint 以外は無視
    if (!ent.properties || !ent.properties.observation_id) return;

    const obsid = ent.properties.observation_id.getValue();
    console.log("CRISM clicked:", obsid);

    // ポリゴンの代表点を取得（先頭点でOK）
    const poly = ent.polygon;
    if (!poly) return;

    const hierarchy = poly.hierarchy.getValue(Cesium.JulianDate.now());
    const positions = hierarchy.positions;
    if (!positions || positions.length === 0) return;

    const carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(positions[0]);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);

    // InfoBox を出す（既存挙動と統一）
    viewer.selectedEntity = ent;

    // ★ 既存の詳細表示フローに接続
    fetchDataClickedCoordinates(lon, lat, "crism");

  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

window.installCrismFootprintClick = installCrismFootprintClick;
window.loadCrismFootprintsByBBox = loadCrismFootprintsByBBox;
window.clearCrismFootprints = clearCrismFootprints;
window.shouldShowCrismFootprints = shouldShowCrismFootprints;
window.installCrismFootprintClick = installCrismFootprintClick;
