/**
 * ネットワーク設定
 * URLを変数に代入して使いやすくしている。
 */

// CRISM、THEMISを起動する際のサーバーリンク
var Network_mapserver='/redace_map/?map=/maps';

// 火星レイヤーを出力するためのサーバーリンク
var Network_terrainserver='/redace_terrain/tilesets/mars';



var basemap_viking_mdim="http://192.168.1.53/wmts/viking_mdim2.1/{z}/{x}/{reverseY}.png";
var basemap_MGS_MOLA="http://192.168.1.53/wmts/MGS_MOLA/{z}/{x}/{reverseY}.png";

// var Network_ajax_db='/map3d/static/map3d/api_db-v01.py';
// var Network_ajax_db='/views_old/api_db.py'; //usui
var Network_ajax_db='/views/api_db.py'; ///usui

// var Network_ajax_directory=headname+'/cgi-bin/api_directory-v01.py'; ///usui
// var Network_ajax_directory='http://localhost:8000/redace/cgi-bin/api_directory-v01.py'; ///usui
var Network_ajax_directory='/views/api_dir.py'; //usui

// var Network_ajax_ref=headname+'/cgi-bin/api_reflectance-v01.py'; ///usui
// var Network_ajax_ref='http://localhost:8000/redace/cgi-bin/api_reflectance-v01.py'; ///usui
var Network_ajax_ref='/views/api_reflectance.py';
