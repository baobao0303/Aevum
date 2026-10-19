/**
 * Web Speech API Text-to-Speech Engine with BCP-47 Language Mapping
 * Complies with AC-FC-02
 */

export class TtsSpeechService {
  private static readonly LANG_MAP: Record<string, string> = {
    en: 'en-US',
    vi: 'vi-VN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    zh: 'zh-CN',
  };

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public static speak(text: string, lang = 'en', rate = 1.0): Promise<boolean> {
    return new Promise(resolve => {
      if (!text || !text.trim()) {
        resolve(false);
        return;
      }

      if (!this.isSupported()) {
        // Fallback for non-browser/test environments
        resolve(false);
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = this.LANG_MAP[lang.toLowerCase()] || lang;
      utterance.rate = Math.min(Math.max(rate, 0.5), 2.0);

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      synth.speak(utterance);
    });
  }

  public static stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
