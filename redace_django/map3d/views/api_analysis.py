# map3d/views/api_analysis.py
import json
import math
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ..analysis.comp_runner import (
    run_comparison,
    build_plot_payload,
    get_aligned_library_spectrum,
    build_plot_payload_raw,
    run_comparison_full,
)

def _to_bool(v, default=True):
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        s = v.strip().lower()
        if s in ("true", "1", "yes", "y", "on"):  return True
        if s in ("false", "0", "no", "n", "off"): return False
    return default

def _to_int_or_none(v):
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None
    
def _to_float_or_none(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def _wav_range_to_index(wavelength, min_wav, max_wav):
    """
    wavelength: List[float] (基本は昇順想定)
    min_wav/max_wav: float|None
    返り値: (min_index, max_index) ※max_index はスライス終端（exclusive）
    """
    if min_wav is None and max_wav is None:
        return (None, None)

    import numpy as np
    wav = np.asarray(wavelength, dtype=float)
    wav = wav[np.isfinite(wav)]
    if wav.size == 0:
        return (None, None)

    # 念のため昇順に（元が昇順なら無駄だけど安全）
    # インデックス変換なので、元配列と同順の前提が崩れるケースがあるならここは外す
    # 多くの場合CRISMは昇順なのでOK
    # wav.sort()

    i0 = None
    i1 = None
    if min_wav is not None:
        i0 = int(np.searchsorted(wav, float(min_wav), side="left"))
    if max_wav is not None:
        i1 = int(np.searchsorted(wav, float(max_wav), side="right"))  # ★exclusive

    return (i0, i1)

@csrf_exempt
def run_analysis(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))

        interp_type  = body.get('interp_type', 'liner')
        scaling_type = body.get('scaling_type', 'norm')
        sim_type     = body.get('sim_type', 'pcc')     # 'pcc' | 'cos' | 'edis'
        sort         = body.get('sort', 'sim_type')    # 'sim_type' | 'Band'
        ascending    = _to_bool(body.get('ascending', True))  # ← 反転はしない
        top_n_raw    = body.get('top_n', 10)
        try:
            top_n = int(top_n_raw)
        except (TypeError, ValueError):
            top_n = 10

        wavelength  = body.get('wavelength')
        reflectance = body.get('reflectance')

        if wavelength is None or reflectance is None:
            return JsonResponse({'error': 'wavelength and reflectance are required'}, status=400)

        # reflectance が [[...]] のとき先頭を使う（フロント互換）
        if isinstance(reflectance, list) and len(reflectance) > 0 and isinstance(reflectance[0], list):
            reflectance = reflectance[0]

        # インデックス範囲
        min_wav = _to_float_or_none(body.get('min_wav'))
        max_wav = _to_float_or_none(body.get('max_wav'))

        min_index = _to_int_or_none(body.get('min_index'))
        max_index = _to_int_or_none(body.get('max_index'))

        if (min_wav is not None) or (max_wav is not None):
            min_index, max_index = _wav_range_to_index(wavelength, min_wav, max_wav)


        def _json_safe(obj):
            # dict / list を再帰的に走査して NaN/Inf を None にする
            if isinstance(obj, dict):
                return {k: _json_safe(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_json_safe(v) for v in obj]
            if isinstance(obj, float):
                if math.isnan(obj) or math.isinf(obj):
                    return None
            return obj
        
        results = run_comparison(
            wavelength=wavelength,
            reflectance=reflectance,
            interp_type=interp_type,
            scaling_type=scaling_type,
            similarity_type=sim_type,
            sort_key=sort,
            ascending=ascending,
            top_n=top_n,
            min_index=min_index,
            max_index=max_index,
        )

        return JsonResponse({"results": _json_safe(results)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ★ 追加：Jupyter と同じ処理を通した描画用データを返す
@csrf_exempt
def plotdata(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        body = json.loads(request.body.decode('utf-8'))
        interp_type  = body.get('interp_type', 'liner')
        scaling_type = body.get('scaling_type', 'norm')
        min_index    = _to_int_or_none(body.get('min_index'))
        max_index    = _to_int_or_none(body.get('max_index'))
        overlay_ids  = body.get('overlay_ids') or []

        wavelength  = body.get('wavelength')
        reflectance = body.get('reflectance')
        if wavelength is None or reflectance is None:
            return JsonResponse({'error': 'wavelength and reflectance are required'}, status=400)
        if isinstance(reflectance, list) and len(reflectance) > 0 and isinstance(reflectance[0], list):
            reflectance = reflectance[0]

        payload = build_plot_payload(
            wavelength=wavelength,
            reflectance=reflectance,
            interp_type=interp_type,
            scaling_type=scaling_type,
            min_index=min_index,
            max_index=max_index,
            overlay_ids=overlay_ids,
        )
        return JsonResponse(payload)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ★ 追加：行クリックで 1 本だけ（ターゲット x に整列したライブラリ）を返す
def spectrum_one(request, spectrum_id: str):
    if request.method != 'GET':
        return JsonResponse({'error': 'GET only'}, status=405)
    try:
        interp_type  = request.GET.get('interp_type', 'liner')
        scaling_type = request.GET.get('scaling_type', 'norm')
        min_index    = _to_int_or_none(request.GET.get('min_index'))
        max_index    = _to_int_or_none(request.GET.get('max_index'))

        payload = get_aligned_library_spectrum(
            spectrum_id=spectrum_id,
            interp_type=interp_type,
            scaling_type=scaling_type,
            min_index=min_index,
            max_index=max_index,
        )
        return JsonResponse(payload)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# ★ 追加：Raw 描画用データの一括返却
@csrf_exempt
def plotdata_raw(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        body = json.loads(request.body.decode('utf-8'))
        wavelength  = body.get('wavelength')
        reflectance = body.get('reflectance')
        overlay_ids = body.get('overlay_ids') or []

        if wavelength is None or reflectance is None:
            return JsonResponse({'error': 'wavelength and reflectance are required'}, status=400)
        if isinstance(reflectance, list) and len(reflectance) > 0 and isinstance(reflectance[0], list):
            reflectance = reflectance[0]

        payload = build_plot_payload_raw(
            wavelength=wavelength,
            reflectance=reflectance,
            overlay_ids=overlay_ids,
        )
        return JsonResponse(payload)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
    
@csrf_exempt
def download_analysis_csv(request):
    """
    Run と同じパラメータを受け取り、全件を CSV として返す。
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))

        interp_type  = body.get('interp_type', 'liner')
        scaling_type = body.get('scaling_type', 'norm')
        sim_type     = body.get('sim_type', 'pcc')
        sort         = body.get('sort', 'sim_type')
        ascending    = _to_bool(body.get('ascending', True))

        wavelength  = body.get('wavelength')
        reflectance = body.get('reflectance')

        if wavelength is None or reflectance is None:
            return JsonResponse({'error': 'wavelength and reflectance are required'}, status=400)
        if isinstance(reflectance, list) and len(reflectance) > 0 and isinstance(reflectance[0], list):
            reflectance = reflectance[0]

        min_index = _to_int_or_none(body.get('min_index'))
        max_index = _to_int_or_none(body.get('max_index'))

        # 全件 DataFrame
        df = run_comparison_full(
            wavelength=wavelength,
            reflectance=reflectance,
            interp_type=interp_type,
            scaling_type=scaling_type,
            similarity_type=sim_type,
            sort_key=sort,
            ascending=ascending,
            min_index=min_index,
            max_index=max_index,
        )

        download_rows = _to_int_or_none(body.get('download_rows'))
        if download_rows is not None and download_rows > 0:
            df = df.head(download_rows)

        csv_data = df.to_csv(index=False)

        resp = HttpResponse(csv_data, content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="analysis_result.csv"'
        return resp

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
