/** 말소리가 주로 실리는 주파수 범위(Hz). 이 밖의 소리는 게이지에 넣지 않는다 */
const SPEECH_LOW_HZ = 150;
const SPEECH_HIGH_HZ = 4000;

/** 이 값 아래의 바이트 세기는 주변 소음으로 보고 0으로 둔다 */
const NOISE_FLOOR = 70;
const SIGNAL_RANGE = 130;

/**
 * @description AnalyserNode의 주파수 세기(0~255)를 말소리 범위 안에서 `bandCount`개 묶음으로 나눠
 * 묶음마다 0~1 세기로 돌려준다. 묶음 경계는 낮은 소리 쪽을 촘촘히 나누도록 로그 간격으로 잡는다.
 */
export function toBandLevels(
  frequencyData: ArrayLike<number>,
  sampleRate: number,
  bandCount: number,
): number[] {
  const binHz = sampleRate / 2 / frequencyData.length;
  const lowBin = Math.max(1, Math.floor(SPEECH_LOW_HZ / binHz));
  const highBin = Math.min(frequencyData.length, Math.ceil(SPEECH_HIGH_HZ / binHz));
  const ratio = highBin / lowBin;

  return Array.from({ length: bandCount }, (_, band) => {
    const start = Math.floor(lowBin * ratio ** (band / bandCount));
    const end = Math.max(start + 1, Math.floor(lowBin * ratio ** ((band + 1) / bandCount)));
    let sum = 0;
    for (let bin = start; bin < end; bin += 1) sum += frequencyData[bin] ?? 0;
    const average = sum / (end - start);
    return Math.min(1, Math.max(0, (average - NOISE_FLOOR) / SIGNAL_RANGE));
  });
}
