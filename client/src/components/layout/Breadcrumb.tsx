import { useLocation } from "wouter";
import { useMemo, useCallback } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "wouter";
import { Home } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Race } from "@db/schema";

// パスに基づいてパンくずリストの項目を生成する関数
const generateBreadcrumbItems = (pathWithQuery: string, raceData: Race | null, handleBackToPrediction: (raceId: string) => void) => {
  // クエリパラメータを分離
  const [path, query] = pathWithQuery.split('?');
  const queryString = query ? `?${query}` : '';
  
  // パスをセグメントに分割
  const segments = path.split('/').filter(segment => segment !== '');
  
  // ベースパスから累積パスのリストを作成
  const items: Array<{
    url: string,
    label: string,
    isCurrentPage: boolean,
    customAction?: () => void
  }> = [];
  
  // URLパターンを正確に判断するための正規表現
  const raceDetailPattern = /^\/race\/(\d+)$/;
  const predictSettingsPattern = /^\/predict\/(\d+)$/;
  // URLの最後が「betting-strategy」で終わればOKに変更
  const bettingStrategyPattern = /^\/races\/(\d+)\/betting-strategy/;
  
  // パターンに基づいてブレッドクラム項目を生成
  if (raceDetailPattern.test(path)) {
    // レース詳細画面の場合
    const raceId = path.match(raceDetailPattern)![1];
    
    items.push({
      url: `/race/${raceId}`,
      label: raceData?.name || `レース ${raceId}`,
      isCurrentPage: true
    });
  } 
  else if (predictSettingsPattern.test(path)) {
    // 予想設定画面の場合
    const raceId = path.match(predictSettingsPattern)![1];
    
    items.push({
      url: `/race/${raceId}`,
      label: raceData?.name || `レース ${raceId}`,
      isCurrentPage: false
    });
    
    items.push({
      url: `/predict/${raceId}${queryString}`,
      label: '予想設定',
      isCurrentPage: true
    });
  } 
  else if (bettingStrategyPattern.test(path)) {
    // 馬券戦略画面の場合
    const raceId = path.match(bettingStrategyPattern)![1];
    
    items.push({
      url: `/race/${raceId}`,
      label: raceData?.name || `レース ${raceId}`,
      isCurrentPage: false
    });
    
    // 予想設定ページへのリンク（クエリパラメータを保持）
    // カスタムアクションを追加してBettingStepProgressの関数を呼び出す
    items.push({
      url: `/predict/${raceId}${queryString}`,
      label: '予想設定',
      isCurrentPage: false,
      customAction: () => handleBackToPrediction(raceId)
    });
    
    items.push({
      url: `/races/${raceId}/betting-strategy${queryString}`,
      label: '馬券戦略',
      isCurrentPage: true
    });
  } else {
    // その他の通常のパス（ガイド、利用規約、プライバシーポリシーなど）
    segments.forEach((segment, index) => {
      const url = `/${segments.slice(0, index + 1).join('/')}`;
      const label = getBreadcrumbLabel(segment, url);
      
      items.push({
        url,
        label,
        isCurrentPage: index === segments.length - 1
      });
    });
  }
  
  return items;
};

// URLセグメントをラベルに変換する関数
const getBreadcrumbLabel = (segment: string, fullPath: string) => {
  // 特定のパスに対するカスタムラベル
  const pathLabels: Record<string, string> = {
    'guide': '使い方ガイド',
    'terms': '利用規約',
    'privacy': 'プライバシーポリシー',
    'predict': '予想設定',
    'betting-strategy': '馬券戦略',
  };

  return pathLabels[segment] || segment;
};

const BreadcrumbComponent = () => {
  const [location, setLocation] = useLocation();
  const { theme } = useThemeStore();
  
  // すべてのフックを最初に呼び出す
  const handleBackToPrediction = useCallback((raceId: string) => {
    // 現在のURLパラメータを取得
    const searchParams = new URLSearchParams(window.location.search);
    const budget = searchParams.get('budget');
    const risk = searchParams.get('risk');
    const winProbs = searchParams.get('winProbs');
    const placeProbs = searchParams.get('placeProbs');
    
    // 予想設定画面のURLを構築（パラメータを明示的にエンコード）
    const encodedWinProbs = winProbs ? encodeURIComponent(winProbs) : '';
    const encodedPlaceProbs = placeProbs ? encodeURIComponent(placeProbs) : '';
    
    setLocation(`/predict/${raceId}?budget=${budget || ''}&risk=${risk || ''}&winProbs=${encodedWinProbs}&placeProbs=${encodedPlaceProbs}`);
  }, [setLocation]);

  // URLからレースIDを抽出
  const [path, query] = location.split('?');
  const raceIdMatch = path.match(/\/(?:race|predict|races)\/(\d+)/);
  const raceId = raceIdMatch ? raceIdMatch[1] : null;

  // レースデータの取得
  const { data: raceData } = useQuery<Race>({
    queryKey: [`/api/races/${raceId}`],
    enabled: !!raceId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // パンくずリストの項目を生成
  const breadcrumbItems = useMemo(() => {
    return generateBreadcrumbItems(
      location,
      raceData || null,
      handleBackToPrediction
    );
  }, [location, raceData, handleBackToPrediction]);

  // ホームページの場合はパンくずを表示しない
  if (location === "/") {
    return null;
  }

  // テーマに応じたスタイル
  const breadcrumbStyle = theme === 'light' 
    ? "py-2 text-xs sm:text-sm md:text-sm transition-colors"
    : "py-2 text-xs sm:text-sm md:text-sm transition-colors";

  const homeIconStyle = theme === 'light'
    ? "h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground/70 hover:text-primary transition-colors"
    : "h-3 w-3 sm:h-3.5 sm:w-3.5 text-foreground/70 hover:text-primary transition-colors";

  const linkStyle = theme === 'light'
    ? "text-foreground/70 hover:text-primary transition-colors"
    : "text-foreground/70 hover:text-primary transition-colors";

  const currentPageStyle = theme === 'light'
    ? "font-medium text-primary"
    : "font-medium text-primary";

  return (
    // Guide.tsxページのみ中央寄せと最大幅を適用し、他のページでは通常のレイアウトを使用
    location === "/guide" ? (
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Breadcrumb className={breadcrumbStyle}>
          <BreadcrumbList>
            {/* ホームリンク - 常に表示 */}
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/" className="transition-colors hover:text-foreground" aria-label="ホームページへ戻る">
                  <Home className={homeIconStyle} />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {breadcrumbItems.length > 0 && (
              <BreadcrumbSeparator className={cn(
                theme === 'light' ? "text-foreground/30" : "text-foreground/30",
                "[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-3.5 sm:[&>svg]:h-3.5"
              )} />
            )}
            
            {/* 動的に生成されたパンくず項目 */}
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.url}>
                <BreadcrumbItem>
                  {item.isCurrentPage ? (
                    <BreadcrumbPage className={currentPageStyle}>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      asChild 
                      className={linkStyle}
                      onClick={item.customAction ? (e) => {
                        e.preventDefault();
                        item.customAction?.();
                      } : undefined}
                    >
                      {/* カスタムアクションがある場合はそれを使用し、なければ通常のリンク */}
                      {item.customAction ? (
                        <span 
                          role="link" 
                          tabIndex={0} 
                          style={{ cursor: 'pointer' }}
                        >
                          {item.label}
                        </span>
                      ) : (
                        <Link href={item.url}>{item.label}</Link>
                      )}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                
                {index < breadcrumbItems.length - 1 && (
                  <BreadcrumbSeparator className={cn(
                    theme === 'light' ? "text-foreground/30" : "text-foreground/30",
                    "[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-3.5 sm:[&>svg]:h-3.5"
                  )} />
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    ) : (
      <Breadcrumb className={breadcrumbStyle}>
        <BreadcrumbList>
          {/* ホームリンク - 常に表示 */}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/" className="transition-colors hover:text-foreground" aria-label="ホームページへ戻る">
                <Home className={homeIconStyle} />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {breadcrumbItems.length > 0 && (
            <BreadcrumbSeparator className={cn(
              theme === 'light' ? "text-foreground/30" : "text-foreground/30",
              "[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-3.5 sm:[&>svg]:h-3.5"
            )} />
          )}
          
          {/* 動的に生成されたパンくず項目 */}
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={item.url}>
              <BreadcrumbItem>
                {item.isCurrentPage ? (
                  <BreadcrumbPage className={currentPageStyle}>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    asChild 
                    className={linkStyle}
                    onClick={item.customAction ? (e) => {
                      e.preventDefault();
                      item.customAction?.();
                    } : undefined}
                  >
                    {/* カスタムアクションがある場合はそれを使用し、なければ通常のリンク */}
                    {item.customAction ? (
                      <span 
                        role="link" 
                        tabIndex={0} 
                        style={{ cursor: 'pointer' }}
                      >
                        {item.label}
                      </span>
                    ) : (
                      <Link href={item.url}>{item.label}</Link>
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              
              {index < breadcrumbItems.length - 1 && (
                <BreadcrumbSeparator className={cn(
                  theme === 'light' ? "text-foreground/30" : "text-foreground/30",
                  "[&>svg]:w-3 [&>svg]:h-3 sm:[&>svg]:w-3.5 sm:[&>svg]:h-3.5"
                )} />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  );
};

export default BreadcrumbComponent; 