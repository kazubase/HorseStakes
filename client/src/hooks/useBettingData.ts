import { useQuery } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { horsesAtom, winProbsAtom, placeProbsAtom } from '@/stores/bettingStrategy';
import type { Horse } from '@db/schema';
import { useEffect } from 'react';

export function useBettingData(raceId: string) {
  const [horses, setHorses] = useAtom(horsesAtom);
  const [winProbs] = useAtom(winProbsAtom);
  const [placeProbs] = useAtom(placeProbsAtom);

  const { data: horsesData, isError: isHorsesError } = useQuery<Horse[]>({
    queryKey: [`/api/horses/${raceId}`],
    enabled: !!raceId,
  });

  useEffect(() => {
    if (horsesData) {
      setHorses(horsesData);
    }
  }, [horsesData, setHorses]);

  return {
    horses,
    winProbs,
    placeProbs,
    isHorsesError
  };
} 