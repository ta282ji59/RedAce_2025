# /app/map3d/analysis/comp_runner.py
import os
import csv
import numpy as np
import pandas as pd
from .libcomp import LibraryComparison  # あなたの libcomp.py を利用
from typing import List, Optional, Tuple, Dict

BASE_DIR = os.path.dirname(os.path.dirname(__file__))         # /app/map3d
ANALYSIS_DIR = os.path.join(BASE_DIR, "analysis")
DATA_DIR = os.path.join(ANALYSIS_DIR, "data")

LIBRARY_CSV = os.path.join(DATA_DIR, "Library_Mineral_BD-VNIR.csv")
CATALOG_XLSX = os.path.join(DATA_DIR, "Sample_Catalogue.xlsx")
TMP_TARGET = os.path.join(DATA_DIR, "tmp_target.csv")  # 毎回上書き

def _write_target_csv(wavelength: List[float], reflectance: List[float], out_path: str) -> None:
    """フロントから渡された配列を [wav, ref] の2列CSVに保存"""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        for x, y in zip(wavelength, reflectance):
            # -1 は欠損扱いなら NaN にしたいが、libcomp 側で NaN 除去をしているのでそのままでもOK
            w.writerow([x, y])

def _to_json_safe_df(df: pd.DataFrame) -> pd.DataFrame:
    """NaN/Inf を None に変換して JSON 互換に + numpy scalar を Python scalar に"""
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.where(pd.notna(df), None)

    # numpy.int64 / numpy.float64 などを Python の int/float に変換
    def _py(v):
        if isinstance(v, np.generic):
            return v.item()
        return v

    return df.applymap(_py)

def _safe_normalize_edis(series: pd.Series) -> pd.Series:
    """edis（距離）→ スコアへ正規化（1/(1+d)）。負値/非有限は欠損へ。"""
    s = pd.to_numeric(series, errors="coerce")
    s = s.where(s >= 0)                        # 距離なので 0 未満は無効
    score = 1.0 / (1.0 + s)                    # (0,1] に収まる
    score = score.where(np.isfinite(score))    # 非有限 → NaN
    return score

def _extract_target_arrays(comp: LibraryComparison) -> Tuple[np.ndarray, np.ndarray]:
    if hasattr(comp, "get_target_scaled"):
        x, y = comp.get_target_scaled()
        return np.asarray(x, dtype=float), np.asarray(y, dtype=float)
    if hasattr(comp, "get_scaled_arr"):
        scaled = comp.get_scaled_arr()
    else:
        scaled = getattr(comp, "scaled_arr", None)

    if scaled is None:
        raise RuntimeError("scaled_arr not found. Run interpolate() and scaling() first.")
    
    for arr in scaled:
        if isinstance(arr, np.ndarray) and arr.size and arr.shape[0] == 3:
            return np.asarray(arr[0], dtype=float), np.asarray(arr[1], dtype=float)
        
    raise RuntimeError("Could not extract target arrays from scaled_arr.")

def run_comparison(
    wavelength: List[float],
    reflectance: List[float],
    interp_type: str = "liner",
    scaling_type: str = "norm",
    similarity_type: str = "pcc",   # 'pcc'|'cos'|'edis'
    sort_key: str = "sim_type",     # 'sim_type'|'Band'
    ascending: bool = True,         # ← Bandで並べたい時だけ使う。sim_type時は自動で上書き
    top_n: int = 10,
    min_index: Optional[int] = None,
    max_index: Optional[int] = None,
):
    """
    画面から渡されたスペクトル（wavelength, reflectance）を起点に、
    ライブラリ比較を実行して結果（辞書配列）を返す。
    """
    # 1) ターゲットCSVを一時生成
    _write_target_csv(wavelength, reflectance, TMP_TARGET)

    # 2) ライブラリ読み込み & ターゲット読込
    comp = LibraryComparison(
        library_file=LIBRARY_CSV,
        sample_catalogue_file=CATALOG_XLSX,
        target_spectrum_file=TMP_TARGET,
    )

    # 3) インデックス範囲の切り出し
    if min_index is not None or max_index is not None:
        if min_index is None:
            comp.slice_wav(0, int(max_index))
        elif max_index is None:
            comp.slice_wav(int(min_index))
        else:
            comp.slice_wav(int(min_index), int(max_index))

    # 4) 補間
    comp.interpolate(interp_type=interp_type)

    # 5) スケーリング
    comp.scaling(method=scaling_type)

    # 6) 類似度
    comp.measure_similarity(similarity_type=similarity_type)

    # 7) DataFrame を取得
    df = comp.result()  # 先頭行(行0)は target の行が入るので除外する前提
    if not isinstance(df, pd.DataFrame):
        raise RuntimeError("Unexpected result type (not DataFrame).")

    # 8) 列名の正規化（存在しない場合もガード）
    metric_col = similarity_type  # 'pcc'|'cos'|'edis'
    for col in ["SpectrumID", "SampleID", metric_col, "Band", "SubType"]:
        if col not in df.columns:
            df[col] = None

    # 8.5) edis の正規化（距離→スコア）。※他の類似度と同じ「大きいほど良い」に統一
    if similarity_type == "edis":
        df[metric_col] = _safe_normalize_edis(df[metric_col])

    # 9) 並び替え（★invalid metric を常に最後に送る）
    sort_key_norm = (sort_key or "sim_type").strip().lower()
    sort_mode = "sim_type" if sort_key_norm == "sim_type" else "band"

    df_data = df.iloc[1:].copy()  # 先頭の target 行を除外

    df_data["_metric_num"] = pd.to_numeric(df_data[metric_col], errors="coerce")
    df_data["_band_num"]   = pd.to_numeric(df_data["Band"], errors="coerce")

    # metric が有限値の行だけを優先（NaN/Inf は後ろへ）
    df_data["_valid"] = df_data["_metric_num"].apply(lambda v: pd.notna(v) and np.isfinite(v))

    if sort_mode == "sim_type":
        # 類似度は大きい順、同点はBand小さい順
        df_data = df_data.sort_values(
            by=["_valid", "_metric_num", "_band_num"],
            ascending=[False, False, True],
            na_position="last",
        )
    else:
        # Bandはascendingに従う、同順位は類似度で安定化（大きい順）
        df_data = df_data.sort_values(
            by=["_valid", "_band_num", "_metric_num"],
            ascending=[False, bool(ascending), False],
            na_position="last",
        )

    # 10) JSON 互換化 & 出力
    out_cols = ["SpectrumID", "SampleID", metric_col, "Band", "SubType"]
    df_out = _to_json_safe_df(df_data[out_cols]).head(top_n)

    # ★フロント表示用の列名に統一
    df_out = df_out.rename(columns={
        metric_col: "similarity_method",
        "Band": "Band Number",
    })

    return df_out.to_dict(orient="records")

def run_comparison_full(
    wavelength: List[float],
    reflectance: List[float],
    interp_type: str = "liner",
    scaling_type: str = "norm",
    similarity_type: str = "pcc",
    sort_key: str = "sim_type",
    ascending: bool = True,
    min_index: Optional[int] = None,
    max_index: Optional[int] = None,
):
    """
    CSV ダウンロード用：top_n で切らずに、全行の DataFrame を返す。
    （並び替えロジックは run_comparison と同じ）
    """
    # 1) ターゲットCSVを一時生成
    _write_target_csv(wavelength, reflectance, TMP_TARGET)

    # 2) ライブラリ読み込み & ターゲット読込
    comp = LibraryComparison(
        library_file=LIBRARY_CSV,
        sample_catalogue_file=CATALOG_XLSX,
        target_spectrum_file=TMP_TARGET,
    )

    # 3) インデックス範囲の切り出し
    if min_index is not None or max_index is not None:
        if min_index is None:
            comp.slice_wav(0, int(max_index))
        elif max_index is None:
            comp.slice_wav(int(min_index))
        else:
            comp.slice_wav(int(min_index), int(max_index))

    # 4) 補間
    comp.interpolate(interp_type=interp_type)

    # 5) スケーリング
    comp.scaling(method=scaling_type)

    # 6) 類似度
    comp.measure_similarity(similarity_type=similarity_type)

    # 7) DataFrame を取得
    df = comp.result()
    if not isinstance(df, pd.DataFrame):
        raise RuntimeError("Unexpected result type (not DataFrame).")

    metric_col = similarity_type  # 'pcc'|'cos'|'edis'
    for col in ["SpectrumID", "SampleID", metric_col, "Band", "SubType"]:
        if col not in df.columns:
            df[col] = None

    if similarity_type == "edis":
        df[metric_col] = _safe_normalize_edis(df[metric_col])

    sort_key_norm = (sort_key or "sim_type").strip().lower()
    if sort_key_norm in ("sim_type", "similarity_method", "similarity_analysis_type"):
        sort_mode = "sim_type"
    elif sort_key_norm in ("band", "band_number", "band number", "Band".lower()):
        sort_mode = "band"
    else:
        sort_mode = "sim_type"

    df_data = df.iloc[1:].copy()  # 先頭 target 行は除外

    df_data["_metric_num"] = pd.to_numeric(df_data[metric_col], errors="coerce")
    df_data["_band_num"]   = pd.to_numeric(df_data["Band"], errors="coerce")
    df_data["_valid"]      = df_data["_metric_num"].apply(lambda v: pd.notna(v) and np.isfinite(v))

    if sort_mode == "sim_type":
        df_data = df_data.sort_values(
            by=["_valid", "_metric_num", "_band_num"],
            ascending=[False, False, True],
            na_position="last",
        )
    else:
        df_data = df_data.sort_values(
            by=["_valid", "_band_num", "_metric_num"],
            ascending=[False, bool(ascending), False],
            na_position="last",
        )

    out_cols = ["SpectrumID", "SampleID", metric_col, "Band", "SubType"]
    df_out = df_data[out_cols].copy()
    df_out = df_out.rename(columns={metric_col: "similarity_method", "Band": "Band Number",})
    return df_out

# ==== ここから：Jupyter と同じ処理を通した描画用データ ====

def get_aligned_library_spectrum(
    spectrum_id: str,
    interp_type: str = "liner",
    scaling_type: str = "norm",
    min_index: Optional[int] = None,
    max_index: Optional[int] = None,
):
    """
    直近の Run と同じ前処理（slice -> interpolate -> scaling）後の
    ターゲットの波長グリッドに、指定 SpectrumID のライブラリを整列して返す。
    ※ libcomp.LibraryComparison に aligned_library_spectrum(spectrum_id) を実装しておくこと。
    """
    if not os.path.exists(TMP_TARGET):
        raise RuntimeError("No target spectrum found. Run analysis first.")

    comp = LibraryComparison(
        library_file=LIBRARY_CSV,
        sample_catalogue_file=CATALOG_XLSX,
        target_spectrum_file=TMP_TARGET,
    )

    if min_index is not None or max_index is not None:
        if min_index is None:
            comp.slice_wav(0, int(max_index))
        elif max_index is None:
            comp.slice_wav(int(min_index))
        else:
            comp.slice_wav(int(min_index), int(max_index))

    comp.interpolate(interp_type=interp_type)
    comp.scaling(method=scaling_type)

    # libcomp 側でターゲットと同じ x に補間済みの (x, y) を返す想定
    wav, ref = comp.aligned_library_spectrum(spectrum_id)

    # JSON 変換安全化
    wav = [float(x) for x in np.asarray(wav, dtype=float)]
    ref = [float(y) for y in np.asarray(ref, dtype=float)]
    return {"wavelength": wav, "reflectance": ref, "label": spectrum_id}

def build_plot_payload(
    wavelength: List[float],
    reflectance: List[float],
    interp_type: str = "liner",
    scaling_type: str = "norm",
    min_index: Optional[int] = None,
    max_index: Optional[int] = None,
    overlay_ids: Optional[List[str]] = None,
):
    """
    Jupyter と同じ前処理（slice -> interpolate -> scaling）を通した
    'ターゲット' と 'ライブラリ(任意複数)' の曲線を返す。
    戻り値: {"traces":[{"name","x","y","lineWidth"}, ...]}
    """
    overlay_ids = overlay_ids or []

    # 1) ターゲットCSV更新（Jupyterと同じ前処理の起点）
    _write_target_csv(wavelength, reflectance, TMP_TARGET)

    # 2) 準備
    comp = LibraryComparison(
        library_file=LIBRARY_CSV,
        sample_catalogue_file=CATALOG_XLSX,
        target_spectrum_file=TMP_TARGET,
    )

    # 3) 範囲（インデックス）指定
    if min_index is not None or max_index is not None:
        if min_index is None:
            comp.slice_wav(0, int(max_index))
        elif max_index is None:
            comp.slice_wav(int(min_index))
        else:
            comp.slice_wav(int(min_index), int(max_index))

    # 4) 補間
    comp.interpolate(interp_type=interp_type)

    # 5) スケーリング
    comp.scaling(method=scaling_type)

    # 6) Jupyter と同じ状態の配列を取得
    wav_x, tgt_y = _extract_target_arrays(comp)

    traces = [{
        "name": "Target",
        "x": [float(v) for v in wav_x],
        "y": [float(v) for v in tgt_y],
        "lineWidth": 2,
    }]

    # 7) 任意のライブラリ曲線（ターゲットと同グリッド）
    for sid in overlay_ids:
        wav_lib, y_lib = comp.aligned_library_spectrum(sid)  # libcomp 側で実装
        traces.append({
            "name": str(sid),
            "x": [float(v) for v in wav_lib],
            "y": [float(v) for v in y_lib],
            "lineWidth": 1,
        })

    return {"traces": traces}

def build_plot_payload_raw(
    wavelength: list[float],
    reflectance: list[float],
    overlay_ids: Optional[List[str]] = None,
    min_index: Optional[int] = None,
    max_index: Optional[int] = None,
)-> Dict[str, List[dict]]:
    """
    Raw（未補間・未スケーリング）のターゲット＋任意ライブラリ(複数)を返す。
    traces[0] が Target raw、以降が各ライブラリ raw。
    index range（min_index/max_index）が与えられたら、Target raw にだけ適用。
    """
    overlay_ids = overlay_ids or []

    _write_target_csv(wavelength, reflectance, TMP_TARGET)

    comp = LibraryComparison(
        library_file=LIBRARY_CSV,
        sample_catalogue_file=CATALOG_XLSX,
        target_spectrum_file=TMP_TARGET,
    )

    # Target raw を読み、index range を適用
    tgt = pd.read_csv(TMP_TARGET).values  # shape (N,2)
    if min_index is not None or max_index is not None:
        i0 = 0 if min_index is None else int(min_index)
        i1 = None if max_index is None else int(max_index)
        tgt = tgt[i0:i1, :]

    eps = 1e-6
    m = (np.isfinite(tgt[:,0]) & np.isfinite(tgt[:,1]) & (tgt[:,0] <= 2.6))
    tgt = tgt[m]
    tgt[:,1] = np.clip(tgt[:,1], a_min=eps, a_max=None)

    traces = [{
        "name": "Target (raw)",
        "x": [float(v) for v in tgt[:,0]],
        "y": [float(v) for v in tgt[:,1]],
        "lineWidth": 2,
    }]

    # Library raw（※Raw では通常オーバーレイしない設計だが、指定があればそのまま素の配列を返す）
    id_list = list(comp.spectrumID_list)
    for sid in overlay_ids:
        try:
            idx = id_list.index(sid)
        except ValueError:
            continue
        arr = comp.library_spectra[idx]
        m = (np.isfinite(arr[:,0]) & np.isfinite(arr[:,1]) & (arr[:,0] <= 2.6))
        arr = arr[m]
        arr[:,1] = np.clip(arr[:,1], a_min=eps, a_max=None)
        traces.append({
            "name": str(sid),
            "x": [float(v) for v in arr[:, 0]],
            "y": [float(v) for v in arr[:, 1]],
            "lineWidth": 1,
        })
    return {"traces": traces}
