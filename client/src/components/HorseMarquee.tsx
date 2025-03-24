import { useEffect, useState, useRef, useMemo } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';

interface HorseData {
  number: number;
  name: string;
  odds?: number;
  frame: number;
}

interface HorseMarqueeProps {
  horses: HorseData[];
  className?: string;
  speed?: number; // アニメーション速度（秒）のベース値
}

export function HorseMarquee({ horses = [], className, speed = 25 }: HorseMarqueeProps) {
  const { theme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(speed);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  
  // 枠番の色を取得する関数
  const getFrameColor = (frame: number) => {
    const colors = {
      1: 'bg-white text-black border border-gray-200',
      2: 'bg-black text-white',
      3: 'bg-red-600 text-white',
      4: 'bg-blue-600 text-white',
      5: 'bg-yellow-400 text-black',
      6: 'bg-green-600 text-white',
      7: 'bg-orange-500 text-white',
      8: 'bg-pink-400 text-white'
    };
    return colors[frame as keyof typeof colors] || 'bg-gray-200';
  };

  // ソート済みの馬データ
  const sortedHorses = useMemo(() => {
    if (!horses || horses.length === 0) return [];
    return [...horses].sort((a, b) => a.number - b.number);
  }, [horses]);

  // サイズ測定関数
  const measureSizes = () => {
    if (containerRef.current && contentRef.current) {
      const containerSize = containerRef.current.offsetWidth;
      const contentSize = contentRef.current.offsetWidth;
      const currentWindowWidth = window.innerWidth;
      
      setContainerWidth(containerSize);
      setContentWidth(contentSize);
      setWindowWidth(currentWindowWidth);
      
      // アニメーション速度計算 - より遅くなるよう調整
      const baseSpeed = 60; // 基準速度を60秒に設定（より遅く）
      const baseContentWidth = 1000; // 基準コンテンツ幅
      
      // コンテンツの幅に応じて速度を調整
      const widthRatio = Math.max(0.1, Math.min(0.6, contentSize / baseContentWidth));
      
      // 最終的な速度を計算（コンテンツが長いほど短い時間で動く）
      const finalDuration = baseSpeed / widthRatio;
      
      // 速度を設定
      setAnimationDuration(finalDuration);
    }
  };

  // マウント時と馬データ変更時にサイズを計測
  useEffect(() => {
    // 初回マウント時に即座に計測
    measureSizes();
    
    // 少し遅延を入れて再計測（レンダリング完了後）
    const timer1 = setTimeout(() => {
      measureSizes();
    }, 50);
    
    // さらに遅延を入れて確実に計測
    const timer2 = setTimeout(() => {
      measureSizes();
    }, 200);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [horses]); // horsesが変更されたときだけ実行

  // 要素のサイズを継続的に監視
  useEffect(() => {
    // ResizeObserverを設定
    const observer = new ResizeObserver(() => {
      measureSizes();
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []); // 依存配列を空にして初回マウント時のみ実行

  // ウィンドウリサイズ時にも再計測
  useEffect(() => {
    const handleResize = () => {
      measureSizes();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 表示する馬情報がない場合は何も表示しない
  if (!sortedHorses || !sortedHorses.length) {
    return null;
  }

  // アニメーション用に馬データを複製して無限にループするように
  const duplicatedHorses = useMemo(() => {
    if (!sortedHorses.length) return [];
    
    // より多くの複製を作成して途切れのないシームレスなループを実現
    const minMultiplier = 6; // 最低6セット分のデータを用意
    const calculatedMultiplier = Math.ceil(containerWidth > 0 ? (8 * containerWidth / (contentWidth || 1)) : 8);
    const multiplier = Math.max(minMultiplier, calculatedMultiplier);
    
    // 通常の複製データを作成
    const baseData = Array.from({ length: multiplier }, () => sortedHorses).flat();
    
    return baseData;
  }, [sortedHorses, containerWidth, contentWidth]);

  // 画面サイズに応じたテキストサイズクラスを決定
  const getResponsiveTextClasses = () => {
    if (windowWidth < 640) {
      return "text-xs"; // スマホ向け
    } else if (windowWidth < 1024) {
      return "text-sm"; // タブレット向け
    } else {
      return "text-base"; // デスクトップ向け
    }
  };

  // 画面サイズに応じた馬番表示サイズを決定
  const getResponsiveFrameSize = () => {
    if (windowWidth < 640) {
      return "w-6 h-6 text-xs";
    } else if (windowWidth < 1024) {
      return "w-6 h-6";
    } else {
      return "w-7 h-7";
    }
  };

  // コンテンツが表示領域より長いかどうか
  const shouldAnimate = contentWidth > containerWidth;

  // インラインスタイル - アニメーション
  const animationStyle = shouldAnimate && !isHovered && contentWidth > 0
    ? {
        animation: `marquee ${animationDuration}s linear infinite`,
        width: 'fit-content',
        willChange: 'transform'
      }
    : {
        width: 'fit-content',
        transform: 'translateX(0)'
      };
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg py-2',
        theme === 'light' 
          ? 'bg-indigo-50 border border-indigo-100 shadow-sm' 
          : 'bg-black/70 backdrop-blur-sm border border-primary/20',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${contentWidth / 2}px); }
        }
      `}} />
      
      {/* グラデーション装飾（左右両端） */}
      <div className={
        theme === 'light'
          ? "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-indigo-50 to-transparent z-10 pointer-events-none"
          : "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none"
      } />
      <div className={
        theme === 'light'
          ? "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-50 to-transparent z-10 pointer-events-none"
          : "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/40 to-transparent z-10 pointer-events-none"
      } />

      {/* 電光掲示板のLEDっぽいデザイン要素 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-led-blink"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-led-blink"></div>

      {/* 馬情報のスクロール - 簡略化したアニメーション実装 */}
      <div className="relative whitespace-nowrap overflow-hidden">
        <div
          ref={contentRef}
          className={cn(
            "inline-flex items-center gap-1 px-4 whitespace-nowrap",
            getResponsiveTextClasses()
          )}
          style={animationStyle}
        >
          {/* 表示する馬データ（シームレスループ用に複数セット分表示） */}
          {duplicatedHorses.map((horse, index) => (
            <div 
              key={`${horse.number}-${index}`}
              className={cn(
                "flex items-center gap-1 px-1 mx-1 rounded",
                theme === 'light' 
                  ? 'text-gray-800' 
                  : 'text-foreground'
              )}
            >
              <div className={cn(
                getResponsiveFrameSize(),
                "flex items-center justify-center rounded-md font-bold shadow-sm",
                getFrameColor(horse.frame)
              )}>
                {horse.number}
              </div>
              <span className="font-medium truncate max-w-[60px] xs:max-w-[70px] sm:max-w-[100px] md:max-w-none">{horse.name}</span>
              {horse.odds && (
                <span className={cn(
                  "font-bold",
                  theme === 'light' 
                    ? horse.odds >= 10 ? 'text-black' : 'text-red-500' 
                    : horse.odds >= 10 ? 'text-white' : 'text-red-400'
                )}>
                  {horse.odds.toFixed(1)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HorseMarquee; 