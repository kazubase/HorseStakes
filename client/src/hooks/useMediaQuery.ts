import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // クライアントサイドでのみメディアクエリをチェックするための初期値
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // windowオブジェクトがある場合のみ（クライアントサイドのみ）実行
    if (typeof window !== 'undefined') {
      const media = window.matchMedia(query);
      
      // 初期値を設定
      setMatches(media.matches);

      // リサイズイベントでメディアクエリの結果を更新
      const listener = () => setMatches(media.matches);
      
      // イベントリスナーを追加
      media.addEventListener('change', listener);
      
      // クリーンアップ関数
      return () => media.removeEventListener('change', listener);
    }
    
    // サーバーサイドの場合は何もしない
    return undefined;
  }, [query]); // query が変更されたときに再実行

  return matches;
} 