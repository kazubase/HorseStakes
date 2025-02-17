import { useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { horsesAtom, oddsAtom, probabilitiesAtom } from '@/stores/bettingStrategy';

export function useBettingData(raceId: string) {
  // データ取得と状態管理を実装
} 