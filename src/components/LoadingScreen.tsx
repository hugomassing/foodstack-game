import { FONT_FAMILY } from '../config';

export function LoadingScreen() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
        color: '#aaaacc',
        fontSize: 14,
        pointerEvents: 'none',
      }}
    >
      Loading assets...
    </div>
  );
}
