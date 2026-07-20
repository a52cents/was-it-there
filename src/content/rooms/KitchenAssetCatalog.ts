import barStoolUrl from '../../assets/models/kitchen/prop-bar-stool.glb?url';
import blenderUrl from '../../assets/models/kitchen/prop-blender.glb?url';
import cabinetUrl from '../../assets/models/kitchen/prop-cabinet.glb?url';
import cabinetDrawerUrl from '../../assets/models/kitchen/prop-cabinet-drawer.glb?url';
import cabinetUpperDoubleUrl from '../../assets/models/kitchen/prop-cabinet-upper-double.glb?url';
import ceilingLightUrl from '../../assets/models/kitchen/prop-ceiling-light.glb?url';
import chairRoundedUrl from '../../assets/models/kitchen/prop-chair-rounded.glb?url';
import coffeeMachineUrl from '../../assets/models/kitchen/prop-coffee-machine.glb?url';
import fridgeLargeUrl from '../../assets/models/kitchen/prop-fridge-large.glb?url';
import hoodModernUrl from '../../assets/models/kitchen/prop-hood-modern.glb?url';
import islandEndUrl from '../../assets/models/kitchen/prop-island-end.glb?url';
import islandUrl from '../../assets/models/kitchen/prop-island.glb?url';
import microwaveUrl from '../../assets/models/kitchen/prop-microwave.glb?url';
import plantSmallUrl from '../../assets/models/kitchen/prop-plant-small.glb?url';
import sinkUrl from '../../assets/models/kitchen/prop-sink.glb?url';
import stoveElectricUrl from '../../assets/models/kitchen/prop-stove-electric.glb?url';
import tableRoundUrl from '../../assets/models/kitchen/prop-table-round.glb?url';
import toasterUrl from '../../assets/models/kitchen/prop-toaster.glb?url';
import trashcanUrl from '../../assets/models/kitchen/prop-trashcan.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const KITCHEN_ASSET_CATALOG = {
  barStool: { id: 'kitchen/bar-stool', url: barStoolUrl },
  blender: { id: 'kitchen/blender', url: blenderUrl },
  cabinet: { id: 'kitchen/cabinet', url: cabinetUrl },
  cabinetDrawer: {
    id: 'kitchen/cabinet-drawer',
    url: cabinetDrawerUrl,
  },
  cabinetUpperDouble: {
    id: 'kitchen/cabinet-upper-double',
    url: cabinetUpperDoubleUrl,
  },
  ceilingLight: { id: 'kitchen/ceiling-light', url: ceilingLightUrl },
  chairRounded: { id: 'kitchen/chair-rounded', url: chairRoundedUrl },
  coffeeMachine: { id: 'kitchen/coffee-machine', url: coffeeMachineUrl },
  fridgeLarge: { id: 'kitchen/fridge-large', url: fridgeLargeUrl },
  hoodModern: { id: 'kitchen/hood-modern', url: hoodModernUrl },
  island: { id: 'kitchen/island', url: islandUrl },
  islandEnd: { id: 'kitchen/island-end', url: islandEndUrl },
  microwave: { id: 'kitchen/microwave', url: microwaveUrl },
  plantSmall: { id: 'kitchen/plant-small', url: plantSmallUrl },
  sink: { id: 'kitchen/sink', url: sinkUrl },
  stoveElectric: { id: 'kitchen/stove-electric', url: stoveElectricUrl },
  tableRound: { id: 'kitchen/table-round', url: tableRoundUrl },
  toaster: { id: 'kitchen/toaster', url: toasterUrl },
  trashcan: { id: 'kitchen/trashcan', url: trashcanUrl },
} as const satisfies Record<string, GlbAssetDefinition>;
