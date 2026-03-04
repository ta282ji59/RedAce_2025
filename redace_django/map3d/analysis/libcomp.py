from tqdm import tqdm 
from tqdm.notebook import trange 
import csv
import math
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
from scipy.signal import find_peaks, peak_prominences
from scipy.interpolate import interp1d


class SpectraInterpolation:
    def __init__(self, spectrumA_2d_arr, spectrumB_2d_arr):
        """
        NaN を除去 → 共通波長範囲とステップを決定 → 共通グリッド生成
        """
        nan_indicesA = np.where(np.isnan(spectrumA_2d_arr[:, 1]))[0].tolist()
        nan_indicesB = np.where(np.isnan(spectrumB_2d_arr[:, 1]))[0].tolist()
        unique_indicesA = list(set(nan_indicesA))
        unique_indicesB = list(set(nan_indicesB))

        # NaN を取り除いた配列を保持
        self.spectrumA_2d_arr = np.delete(spectrumA_2d_arr, unique_indicesA, axis=0)
        self.spectrumB_2d_arr = np.delete(spectrumB_2d_arr, unique_indicesB, axis=0)

        # ← ★ ここを“元配列”ではなく NaN 除去後の配列で計算する
        a = self.spectrumA_2d_arr
        b = self.spectrumB_2d_arr

        # 念のため波長で昇順ソート
        a = a[np.argsort(a[:, 0])]
        b = b[np.argsort(b[:, 0])]
        self.spectrumA_2d_arr = a
        self.spectrumB_2d_arr = b

        self.min_wavelength = max(a[0, 0], b[0, 0])
        self.max_wavelength = min(a[-1, 0], b[-1, 0])

        # ステップは両者の最小刻み
        step_a = np.diff(a[:, 0]).min()
        step_b = np.diff(b[:, 0]).min()
        wavelength_step = float(min(step_a, step_b))

        # 何らかの理由で step が非正ならフォールバック
        if not np.isfinite(wavelength_step) or wavelength_step <= 0:
            wavelength_step = 0.001  # 例: 1nm 相当のフォールバック

        self.common_wavelength = np.arange(self.min_wavelength,
                                           self.max_wavelength + 1e-12,
                                           wavelength_step)

    def get_min_max_wav(self):
        return self.min_wavelength, self.max_wavelength
    
    def liner(self):
        interpolated_refA = np.interp(self.common_wavelength, self.spectrumA_2d_arr[:,0], self.spectrumA_2d_arr[:,1])
        interpolated_refB = np.interp(self.common_wavelength, self.spectrumB_2d_arr[:,0], self.spectrumB_2d_arr[:,1])
        return [self.common_wavelength, interpolated_refA, interpolated_refB]

    def spline(self, kind='cubic'):
        spA = interp1d(self.spectrumA_2d_arr[:,0], self.spectrumA_2d_arr[:,1], kind=kind, fill_value='extrapolate')
        spB = interp1d(self.spectrumB_2d_arr[:,0], self.spectrumB_2d_arr[:,1], kind=kind, fill_value='extrapolate')
        return [self.common_wavelength, spA(self.common_wavelength), spB(self.common_wavelength)]


class SpectrumScaling:
    def normalization(self, ref_1d_arr, exception=True):
        ref_1d_arr = np.asarray(ref_1d_arr, dtype=float)
        if ref_1d_arr.size <= 1:
            if exception: print('Not enough elements.')
            return np.full(ref_1d_arr.shape, np.nan, dtype=float)
        denom = (np.nanmax(ref_1d_arr) - np.nanmin(ref_1d_arr))
        if denom == 0 or not np.isfinite(denom):
            if exception: print('ZeroDivisionError.')
            return np.full(ref_1d_arr.shape, np.nan, dtype=float)
        return (ref_1d_arr - np.nanmin(ref_1d_arr)) / denom

    def standardization(self, ref_1d_arr, exception=True):
        ref_1d_arr = np.asarray(ref_1d_arr, dtype=float)
        if ref_1d_arr.size <= 1:
            if exception: print('Not enough elements.')
            return np.full(ref_1d_arr.shape, np.nan, dtype=float)
        sd = np.nanstd(ref_1d_arr)
        if sd == 0 or not np.isfinite(sd):
            if exception: print('ZeroDivisionError.')
            return np.full(ref_1d_arr.shape, np.nan, dtype=float)
        return (ref_1d_arr - np.nanmean(ref_1d_arr)) / sd

    def relative_ref(self, target_ref_1d_arr, base_ref_1d_arr, exception=True):
        target_ref_1d_arr = np.asarray(target_ref_1d_arr, dtype=float)
        base_ref_1d_arr   = np.asarray(base_ref_1d_arr,   dtype=float)
        if target_ref_1d_arr.size == 0 or base_ref_1d_arr.size == 0:
            if exception: print('Not enough elements.')
            return np.full(target_ref_1d_arr.shape, np.nan, dtype=float)
        # 要素ごとに 0 を判定
        with np.errstate(divide='ignore', invalid='ignore'):
            out = np.true_divide(target_ref_1d_arr, base_ref_1d_arr)
            out[~np.isfinite(out)] = np.nan
        return out

class SpectraSimilarity:
    def pcc(self, refA_1d_arr, refB_1d_arr, exception=True):
        if refA_1d_arr.size == 0 or refA_1d_arr.size == 1 or refB_1d_arr.size == 0 or refB_1d_arr.size == 1:
            if exception:
                print('Not enough elements.')
            return np.nan
        # 計算結果が行列形式のため、０行１列目を取得。
        return np.corrcoef(refA_1d_arr, refB_1d_arr)[0, 1]

    def cos(self, refA_1d_arr, refB_1d_arr, exception=True):
        if refA_1d_arr.size == 0 or refA_1d_arr.size == 1 or refB_1d_arr.size == 0 or refB_1d_arr.size == 1:
            if exception:
                print('Not enough elements.')
            return np.nan
        v1_norm = np.linalg.norm(refA_1d_arr)
        v2_norm = np.linalg.norm(refB_1d_arr)
        if v1_norm == 0 or v2_norm == 0:
            if exception:
                print('ZeroDivisionError.')
            return np.nan
        return np.dot(refA_1d_arr, refB_1d_arr) / (v1_norm * v2_norm)

    def euclid_dis(self, refA_1d_arr, refB_1d_arr, exception=True):
        if refA_1d_arr.size == 0 or refB_1d_arr.size == 0:
            if exception:
                print('Not enough elements.')
            return np.nan
        return np.linalg.norm(refA_1d_arr - refB_1d_arr)


class SpectrumSmoothing:
    def moving_avg(self, ref, window_size):
        b = np.ones(window_size) / window_size
        ref_mean = np.convolve(ref, b, mode="same")
        n_conv = window_size // 2

        # 補正部分、始めと終わり部分をwindow_sizeの半分で移動平均を取る
        ref_mean[0] *= window_size / n_conv
        for i in range(1, n_conv):
            ref_mean[i] *= window_size / (i + n_conv)
            ref_mean[-i] *= window_size / (i + n_conv - (window_size % 2)) # size % 2は奇数偶数での違いに対応するため
        return ref_mean


class LibraryComparison:
    def __init__(self, library_file, sample_catalogue_file, target_spectrum_file):
        self.load_library(library_file)
        self.load_catalogue(sample_catalogue_file)
        self.load_target(target_spectrum_file)

    def load_library(self, library_file):
        """_summary_

        Args:
            library_file (_type_): _description_
        """
        csv_file = open(library_file, 'r')
        csv_data = list(csv.reader(csv_file))
        csv_file.close()
        self.library_len = len(csv_data)
        # progress_tqdm = tqdm(total=self.library_len, unit=' count')
        self.spectrumID_list = np.empty(self.library_len, dtype=object)
        self.sampleID_list = np.empty(self.library_len, dtype=object)
        self.library_spectra = [None] * self.library_len # 要素数が不均等のためlist
        
        for (i, row), _ in zip(enumerate(csv_data), trange(self.library_len, unit=' count')):
            self.sampleID_list[i] = row[0].upper()
            self.spectrumID_list[i] = row[1]
            band = int(float(row[2]))
            self.library_spectra[i] = np.column_stack((np.array(row[3:band+3], dtype=float), np.array(row[band+3:band*2+3], dtype=float)))
            # progress_tqdm.update(1)
            
        print('>>> Library loading completed.\n')

    def load_catalogue(self, sample_catalogue_file):
        sample_catalogue_df = pd.read_excel(sample_catalogue_file)
        extracted_df = sample_catalogue_df[sample_catalogue_df['SampleID'].isin(self.sampleID_list)]
        self.subtype_df = extracted_df[["SampleID", "SubType"]]

    def load_target(self, target_spectrum_file):
        """対象スペクトルのCSVファイルを読み込み、データフレーム化する。numpy配列を取得。ライブラリのnumpy配列と合体。

        Args:
            target_spectrum_file (str): _description_
        """
        self.raw_target = pd.read_csv(target_spectrum_file).values
        self.target_spectrum = self.raw_target.copy()
        self.raw_spectra = self.library_spectra.copy()
        self.raw_spectra.insert(0, self.target_spectrum)

    def slice_wav(self, min_index=0, max_index=99999):
        """指定の波長範囲にスライス（numpy配列）。必ず線形補間の前に実行しなければならない。

        Args:
            min_index (int, optional): _description_. Defaults to 0.
            max_index (_type_, optional): _description_. Defaults to 99999.
            sliced_target (_type_): スライス済ターゲットスペクトル（numpy配列）。
            target_spectrum (_type_): この先使用するターゲットスペクトル（numpy配列）。
        """
        self.sliced_target = self.target_spectrum[min_index:max_index, :]
        self.target_spectrum = self.sliced_target

    def interpolate(self, interp_type='liner'):
        target_spectrum = self.target_spectrum
        library_spectra = self.library_spectra
        interpolated_arr = np.empty(self.library_len, dtype=object).tolist()
        min_wav_list = np.empty(self.library_len, dtype=object).tolist()
        max_wav_list = np.empty(self.library_len, dtype=object).tolist()
    
        if interp_type == 'liner':
            for i in trange(self.library_len, unit=' count'):
                interpolation = SpectraInterpolation(target_spectrum, library_spectra[i])
                interpolated_arr[i] = interpolation.liner()
                min_wav_list[i], max_wav_list[i] = interpolation.get_min_max_wav()
        elif interp_type == 'sp':
            for i in trange(self.library_len, unit=' count'):
                interpolation = SpectraInterpolation(target_spectrum, library_spectra[i])
                interpolated_arr[i] = interpolation.spline(kind='cubic')  # ★必ず kind を渡す
                min_wav_list[i], max_wav_list[i] = interpolation.get_min_max_wav()
    
        self.interpolated_arr = interpolated_arr
        self.spectra_set = interpolated_arr
        self.min_wav_list = min_wav_list
        self.max_wav_list = max_wav_list
        print('>>> Interpolation completed.\n')


    def scaling(self, method, base_ref=None):
        """
        変更点：
          - ターゲットは一度だけ正規化して self.target_scaled に保存（描画は常にこれを使用）
          - ライブラリは各ペアの共通グリッド上でスケーリング
          - 外れ値対策：反射率の負値は除外ではなく微小値にクリップ、かつ 2.6µm より長波長は除外
        """
        interpolated_arr = self.spectra_set
        scaled_arr = np.empty(self.library_len, dtype=object).tolist()
        band_list  = np.empty(self.library_len, dtype=object).tolist()
        ss = SpectrumScaling()
    
        # === 1) ターゲットを一度だけスケーリング（ターゲット自身のグリッド） ===
        tx = self.target_spectrum[:, 0]
        ty = self.target_spectrum[:, 1]
    
        tgt_mask = (np.isfinite(tx)) & (np.isfinite(ty)) & (tx <= 2.6)
        tx_masked = tx[tgt_mask]
        ty_masked = ty[tgt_mask]
    
        # 負値を“除外”せずに持ち上げる（吸収帯の形が崩れない）
        eps = 1e-6
        ty_masked = np.clip(ty_masked, a_min=eps, a_max=None)
    
        if method == 'norm':
            ty_scaled = ss.normalization(ty_masked, False)
        elif method == 'st':
            ty_scaled = ss.standardization(ty_masked, False)
        else:
            ty_scaled = ss.normalization(ty_masked, False)
    
        self.target_scaled = (tx_masked, ty_scaled)
    
        # === 2) ライブラリは各ペアでスケーリング ===
        for i in trange(self.library_len, unit=' count'):
            interp_wav = interpolated_arr[i][0]
            t = interpolated_arr[i][1]
            l = interpolated_arr[i][2]
    
            m = (np.isfinite(interp_wav) & np.isfinite(t) & np.isfinite(l) & (interp_wav <= 2.6))
            interp_wav = interp_wav[m]
            t = np.clip(t[m], a_min=eps, a_max=None)
            l = np.clip(l[m], a_min=eps, a_max=None)
    
            if method == 'norm':
                t_scaled = ss.normalization(t, False)
                l_scaled = ss.normalization(l, False)
            elif method == 'st':
                t_scaled = ss.standardization(t, False)
                l_scaled = ss.standardization(l, False)
            else:
                t_scaled = ss.normalization(t, False)
                l_scaled = ss.normalization(l, False)
    
            # ★ ここで“形”を必ずそろえる（スカラーNaN対策）
            if not isinstance(t_scaled, np.ndarray):
                t_scaled = np.full(interp_wav.shape, np.nan, dtype=float)
            if not isinstance(l_scaled, np.ndarray):
                l_scaled = np.full(interp_wav.shape, np.nan, dtype=float)
    
            if interp_wav.size == 0 or t_scaled.size != interp_wav.size or l_scaled.size != interp_wav.size:
                scaled_arr[i] = np.vstack((np.empty(0), np.empty(0), np.empty(0)))
                band_list[i]  = 0
            else:
                scaled_arr[i] = np.vstack((interp_wav, t_scaled, l_scaled))
                band_list[i]  = interp_wav.size
    
        
        self.scaled_arr = scaled_arr
        self.spectra_set = scaled_arr
        self.band_list   = band_list
        print('>>> Scaling completed.\n')


    def get_scaled_arr(self):
        return self.scaled_arr

    def find_common_valley_indices(self, prominence=0.1):
        """共通の谷点（インデックス）を取得する。
        """
        common_valleys = np.empty(self.library_len).tolist()
        spectra_set = self.spectra_set

        for i in trange(self.library_len, unit=' count'):
            if spectra_set[i][1].size != 0:
                valleys_indexA, _ = find_peaks(-spectra_set[i][1], prominence=prominence)
                valleys_indexB, _ = find_peaks(-spectra_set[i][2], prominence=prominence)
                common_valleys[i] = np.intersect1d(valleys_indexA, valleys_indexB)
                if common_valleys[i].size == 0:
                    spectra_set[i] = np.vstack((np.empty(0), np.empty(0), np.empty(0)))
            else:
                common_valleys[i] = np.empty(0)

        self.common_valleys = common_valleys
        print('>>> Find common valleys completed.\n')

    def measure_similarity(self, similarity_type='pcc'):
        """類似度比較には、同じ要素数であること、
        補間が必要。

        Args:
            similarity_type (str, optional): _description_. Defaults to 'pcc'.

        Returns:
            _type_: _description_
        """
        sim_results = np.empty(self.library_len).tolist()
        spectra_set = self.spectra_set
        sim = SpectraSimilarity()

        if similarity_type == 'pcc':
            for i in trange(self.library_len, unit=' count'):
                sim_results[i] = sim.pcc(spectra_set[i][1], spectra_set[i][2], False)
        elif similarity_type == 'cos':
            for i in trange(self.library_len, unit=' count'):
                sim_results[i] = sim.cos(spectra_set[i][1], spectra_set[i][2], False)
        elif similarity_type == 'edis':
            for i in trange(self.library_len, unit=' count'):
                sim_results[i] = sim.euclid_dis(spectra_set[i][1], spectra_set[i][2], False)
        print('>>> Similarity measurement completed.\n')

        result_df = pd.DataFrame(
            data={
                'SpectrumID': self.spectrumID_list, 
                'SampleID': self.sampleID_list,
                similarity_type: sim_results, 
                'Band': self.band_list, 
                'Min Wavelength': self.min_wav_list, 
                'Max Wavelength': self.max_wav_list,
                }
        )
        result_df = pd.merge(result_df, self.subtype_df, on='SampleID', how='outer')
        data = [['target', 'target', 1, len(self.target_spectrum), self.target_spectrum[0][0], self.target_spectrum[-1][0], 'target']]
        target_row = pd.DataFrame(data=data, columns=result_df.columns)
        result_df = pd.concat([target_row, result_df]).reset_index(drop=True)
        # result_df = pd.concat([target_row, result_df])#.reset_index(drop=True)
        # result_df.set_index("SpectrumID", inplace=True)
        self.result_df = result_df
        # print(result_df)
        # return result_df

    def result(self):
        return self.result_df
    
    def plot(self, df, index_list, sp_type, avg_size=None, find=None, prominence=0.1):

        def find_valleys(wav, ref):
            valleys, _ = find_peaks(-ref, prominence=prominence)
            valleys_wav = wav[valleys]
            valleys_ref = ref[valleys]
            plt.plot(valleys_wav, valleys_ref, 'bx')#, label=f'valley (index), prominence {prominence}')

            for i, label in enumerate([n for n in valleys]):
                # plt.text(valleys_wav[i], valleys_ref[i], label)
                pass


        colors = ['red', 'blue', 'green', 'orange', 'pink']
        plt.figure(figsize=(8, 6))

        if sp_type == 'raw':
            plt.title('Raw Spectra Data')
            for i, index in enumerate(index_list):
                x = [row[0] for row in self.raw_spectra[index]]
                y = [row[1] for row in self.raw_spectra[index]]
                # x = [row[0] for row in df[index]]
                # y = [row[1] for row in df[index]]

                if avg_size != None:
                    y = SpectrumSmoothing().moving_avg(y, avg_size)
                    plt.plot(x, y, color=colors[i % 5], label=f'Ind {index}, {self.result_df.iloc[index,6]}, moving size {avg_size}')
                else:
                    plt.plot(x, y, color=colors[i % 5], label=f'Ind {index}, {self.result_df.iloc[index,6]}')

                if find == 'valley':
                    find_valleys(np.array(x), np.array(y))

        elif sp_type == 'scaled':
            if len(index_list) == 0:
                return print('Please specify a index other than 0.')
            # print(len(index))
            # if len(index) > 1:
            #     return print('Please specify one index.')

            x1 = self.scaled_arr[index - 1][0]
            y1 = self.scaled_arr[index - 1][1]
            y2 = self.scaled_arr[index - 1][2]
            # y_d = signal.detrend(self.scaled_arr[index-1][1])

            valleys1, _ = find_peaks(-y1, prominence=0.1)
            valleys2, _ = find_peaks(-y2, prominence=0.1)
            valleys_wav1 = x1[valleys1]
            valleys_wav2 = x1[valleys2]
            valleys_ref1 = y1[valleys1]
            valleys_ref2 = y2[valleys2]


            plt.plot(x1, y1, color=colors[0], label=f'Index {0}')
            # plt.plot(x1, y_d, color=colors[1], label=f'Index {0} Detrend')
            plt.plot(x1, y2, color=colors[2], label=f'Ind {index}, {self.result_df.iloc[index,6]}')
            # plt.plot(x1, y-y_d, color=colors[3],label="Trend")

            plt.plot(valleys_wav1, valleys_ref1, 'bx', label='peak point')
            labels = ['idx.'+str(num) for num in valleys1]
            for i, label in enumerate(labels):
                # plt.text(valleys_wav1[i], valleys_ref1[i], label)
                pass

            plt.plot(valleys_wav2, valleys_ref2, 'bx', label='peak point')
            labels = ['idx.'+str(num) for num in valleys2]
            for i, label in enumerate(labels):
                # plt.text(valleys_wav2[i], valleys_ref2[i], label)
                pass

            plt.title('Scaled Spectra Data')

        plt.xlabel('Wavelength')
        plt.ylabel('Reflectance')
        plt.rcParams["font.size"] = 18
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0) 
        plt.grid(True)
        plt.show()

    def get_target_scaled(self):
        """
        scaling() で作った self.target_scaled（ターゲットを一度だけ正規化したもの）
        を必ず返す。
        """
        if hasattr(self, "target_scaled") and self.target_scaled is not None:
            x, y = self.target_scaled
            return np.asarray(x, dtype=float), np.asarray(y, dtype=float)
        raise RuntimeError("Call interpolate() and scaling() before get_target_scaled().")
    
    def aligned_library_spectrum(self, spectrum_id: str):
        if not hasattr(self, "scaled_arr") or self.scaled_arr is None:
            raise RuntimeError("Call interpolate() and scaling() before aligned_library_spectrum().")
        try:
            idx = list(self.spectrumID_list).index(spectrum_id)
        except ValueError:
            raise RuntimeError(f"Unknown SpectrumID: {spectrum_id}")
        arr = self.scaled_arr[idx]
        if not isinstance(arr, np.ndarray) or arr.size == 0:
            return np.array([]), np.array([])
        x = arr[0]
        y_library = arr[2]
        return x, y_library
