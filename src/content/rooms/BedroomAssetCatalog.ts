import bedDoubleUrl from '../../assets/models/bedroom/prop-bed-double.glb?url';
import bookcaseLowUrl from '../../assets/models/bedroom/prop-bookcase-low.glb?url';
import booksStackUrl from '../../assets/models/bedroom/prop-books-stack.glb?url';
import chairCushionUrl from '../../assets/models/bedroom/prop-chair-cushion.glb?url';
import nightstandUrl from '../../assets/models/bedroom/prop-nightstand.glb?url';
import pictureFrameUrl from '../../assets/models/bedroom/prop-picture-frame.glb?url';
import photoFrameUrl from '../../assets/models/bedroom/prop-photo-frame.glb?url';
import pillowBlueUrl from '../../assets/models/bedroom/prop-pillow-blue.glb?url';
import pillowWarmUrl from '../../assets/models/bedroom/prop-pillow-warm.glb?url';
import plantSmallUrl from '../../assets/models/bedroom/prop-plant-small.glb?url';
import radioUrl from '../../assets/models/bedroom/prop-radio.glb?url';
import rugRectangleUrl from '../../assets/models/bedroom/prop-rug-rectangle.glb?url';
import tableLampUrl from '../../assets/models/bedroom/prop-table-lamp.glb?url';
import televisionUrl from '../../assets/models/bedroom/prop-television.glb?url';
import tvCabinetUrl from '../../assets/models/bedroom/prop-tv-cabinet.glb?url';
import wardrobeUrl from '../../assets/models/bedroom/prop-wardrobe.glb?url';
import type { GlbAssetDefinition } from '../../world/assets/AssetManager';

export const BEDROOM_ASSET_CATALOG = {
  bedDouble: {
    id: 'bedroom/bed-double',
    url: bedDoubleUrl,
  },
  bookcaseLow: {
    id: 'bedroom/bookcase-low',
    url: bookcaseLowUrl,
  },
  booksStack: {
    id: 'bedroom/books-stack',
    url: booksStackUrl,
  },
  chairCushion: {
    id: 'bedroom/chair-cushion',
    url: chairCushionUrl,
  },
  nightstand: {
    id: 'bedroom/nightstand',
    url: nightstandUrl,
  },
  pictureFrame: {
    id: 'bedroom/picture-frame',
    url: pictureFrameUrl,
  },
  photoFrame: {
    id: 'bedroom/photo-frame',
    url: photoFrameUrl,
  },
  pillowBlue: {
    id: 'bedroom/pillow-blue',
    url: pillowBlueUrl,
  },
  pillowWarm: {
    id: 'bedroom/pillow-warm',
    url: pillowWarmUrl,
  },
  plantSmall: {
    id: 'bedroom/plant-small',
    url: plantSmallUrl,
  },
  radio: {
    id: 'bedroom/radio',
    url: radioUrl,
  },
  rugRectangle: {
    id: 'bedroom/rug-rectangle',
    url: rugRectangleUrl,
  },
  tableLamp: {
    id: 'bedroom/table-lamp',
    url: tableLampUrl,
  },
  television: {
    id: 'bedroom/television',
    url: televisionUrl,
  },
  tvCabinet: {
    id: 'bedroom/tv-cabinet',
    url: tvCabinetUrl,
  },
  wardrobe: {
    id: 'bedroom/wardrobe',
    url: wardrobeUrl,
  },
} as const satisfies Record<string, GlbAssetDefinition>;
