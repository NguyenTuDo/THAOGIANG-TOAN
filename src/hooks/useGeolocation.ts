import { useCallback, useState } from 'react';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export type GeoState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; coords: GeoCoords }
  | { status: 'error'; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'Trình duyệt không hỗ trợ định vị' });
      return;
    }
    setState({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'ok',
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      (err) => {
        setState({ status: 'error', message: err.message });
      },
      { timeout: 8000 },
    );
  }, []);

  const clear = useCallback(() => setState({ status: 'idle' }), []);

  return { state, request, clear };
}
