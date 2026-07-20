import alcoveBenchUrl from '../../assets/models/dining-room/prop-alcove-bench.glb?url';
import bearOrnamentUrl from '../../assets/models/dining-room/prop-bear-ornament.glb?url';
import ceilingFanUrl from '../../assets/models/dining-room/prop-ceiling-fan.glb?url';
import diningChairModernUrl from '../../assets/models/dining-room/prop-dining-chair-modern.glb?url';
import diningTableClothUrl from '../../assets/models/dining-room/prop-dining-table-cloth.glb?url';
import floorLampSquareUrl from '../../assets/models/dining-room/prop-floor-lamp-square.glb?url';
import glassSideTableUrl from '../../assets/models/dining-room/prop-glass-side-table.glb?url';
import loungeChairRelaxUrl from '../../assets/models/dining-room/prop-lounge-chair-relax.glb?url';
import rugRoundedUrl from '../../assets/models/dining-room/prop-rug-rounded.glb?url';
import sideboardDoorsUrl from '../../assets/models/dining-room/prop-sideboard-doors.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const DINING_ROOM_ASSET_CATALOG = {
  alcoveBench: { id: 'dining-room/alcove-bench', url: alcoveBenchUrl },
  bearOrnament: { id: 'dining-room/bear-ornament', url: bearOrnamentUrl },
  ceilingFan: { id: 'dining-room/ceiling-fan', url: ceilingFanUrl },
  diningChairModern: {
    id: 'dining-room/dining-chair-modern',
    url: diningChairModernUrl,
  },
  diningTableCloth: {
    id: 'dining-room/dining-table-cloth',
    url: diningTableClothUrl,
  },
  floorLampSquare: {
    id: 'dining-room/floor-lamp-square',
    url: floorLampSquareUrl,
  },
  glassSideTable: {
    id: 'dining-room/glass-side-table',
    url: glassSideTableUrl,
  },
  loungeChairRelax: {
    id: 'dining-room/lounge-chair-relax',
    url: loungeChairRelaxUrl,
  },
  rugRounded: { id: 'dining-room/rug-rounded', url: rugRoundedUrl },
  sideboardDoors: {
    id: 'dining-room/sideboard-doors',
    url: sideboardDoorsUrl,
  },
} as const satisfies Record<string, GlbAssetDefinition>;
