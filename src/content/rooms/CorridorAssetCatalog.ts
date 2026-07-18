import bootsUrl from '../../assets/models/corridor/prop-boots.glb?url';
import benchUrl from '../../assets/models/corridor/prop-bench.glb?url';
import coatStandUrl from '../../assets/models/corridor/prop-coat-stand.glb?url';
import consoleUrl from '../../assets/models/corridor/prop-console.glb?url';
import officePhoneUrl from '../../assets/models/corridor/prop-office-phone.glb?url';
import parcelClosedUrl from '../../assets/models/corridor/prop-parcel-closed.glb?url';
import parcelOpenUrl from '../../assets/models/corridor/prop-parcel-open.glb?url';
import pottedPlantUrl from '../../assets/models/corridor/prop-potted-plant.glb?url';
import runnerRugUrl from '../../assets/models/corridor/prop-runner-rug.glb?url';
import sideTableUrl from '../../assets/models/corridor/prop-side-table.glb?url';
import smallSpeakerUrl from '../../assets/models/corridor/prop-small-speaker.glb?url';
import wallClockUrl from '../../assets/models/corridor/prop-wall-clock.glb?url';
import wallHooksUrl from '../../assets/models/corridor/prop-wall-hooks.glb?url';
import wallLampUrl from '../../assets/models/corridor/prop-wall-lamp.glb?url';
import pictureFrameUrl from '../../assets/models/bedroom/prop-picture-frame.glb?url';
import photoFrameUrl from '../../assets/models/bedroom/prop-photo-frame.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const CORRIDOR_ASSET_CATALOG = {
  bench: {
    id: 'first-corridor/bench',
    url: benchUrl,
  },
  boots: {
    id: 'first-corridor/boots',
    url: bootsUrl,
  },
  console: {
    id: 'first-corridor/console',
    url: consoleUrl,
  },
  coatStand: {
    id: 'first-corridor/coat-stand',
    url: coatStandUrl,
  },
  frameLarge: {
    id: 'first-corridor/frame-large',
    url: pictureFrameUrl,
  },
  frameSmall: {
    id: 'first-corridor/frame-small',
    url: photoFrameUrl,
  },
  officePhone: {
    id: 'first-corridor/office-phone',
    url: officePhoneUrl,
  },
  parcelClosed: {
    id: 'first-corridor/parcel-closed',
    url: parcelClosedUrl,
  },
  parcelOpen: {
    id: 'first-corridor/parcel-open',
    url: parcelOpenUrl,
  },
  pottedPlant: {
    id: 'first-corridor/potted-plant',
    url: pottedPlantUrl,
  },
  runnerRug: {
    id: 'first-corridor/runner-rug',
    url: runnerRugUrl,
  },
  sideTable: {
    id: 'first-corridor/side-table',
    url: sideTableUrl,
  },
  smallSpeaker: {
    id: 'first-corridor/small-speaker',
    url: smallSpeakerUrl,
  },
  wallClock: {
    id: 'first-corridor/wall-clock',
    url: wallClockUrl,
  },
  wallLamp: {
    id: 'first-corridor/wall-lamp',
    url: wallLampUrl,
  },
  wallHooks: {
    id: 'first-corridor/wall-hooks',
    url: wallHooksUrl,
  },
} as const satisfies Record<string, GlbAssetDefinition>;
