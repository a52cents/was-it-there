import {
  FinalRouteRoomBase,
  type FinalRouteRoomConfig,
} from './FinalRouteRoomBase';

const CONFIG: FinalRouteRoomConfig = {
  id: 'entrance-corridor',
  displayName: 'Entrance Corridor',
  prefix: 'EntranceCorridor',
  halfWidth: 2.5,
  halfDepth: 4.4,
  roomHeight: 3,
  entranceX: -1.25,
  exitWall: 'east',
  exitCenter: -2.75,
  observationDurationMs: 10_000,
  searchDurationMs: 22_000,
  anomalyCount: { min: 3, max: 3 },
  playerSpawn: [-1.25, 0, 3.65],
  floorStyle: 'stone',
  props: [
    {
      id: 'false-front-door',
      name: 'ANOM_EntranceCorridor_FalseFrontDoor',
      position: [0, 0, -4.22],
      size: [1.35, 2.35, 0.16],
      color: '#4b3530',
      shape: 'frame',
      anomalyStyle: 'story',
      detail: 'records',
    },
    {
      id: 'intercom',
      name: 'ANOM_EntranceCorridor_Intercom',
      position: [-2.05, 0, -2.55],
      size: [0.48, 1.48, 0.38],
      color: '#555b59',
      anomalyStyle: 'story',
      detail: 'screen',
    },
    {
      id: 'return-clock',
      name: 'ANOM_EntranceCorridor_ReturnClock',
      position: [1.85, 0, -3.45],
      size: [0.55, 1.72, 0.38],
      color: '#66513e',
      anomalyStyle: 'story',
      detail: 'screen',
    },
    {
      id: 'door-records',
      name: 'ANOM_EntranceCorridor_DoorRecords',
      position: [1.75, 0, -1.35],
      size: [0.85, 0.8, 0.5],
      color: '#625246',
      anomalyStyle: 'corridor',
      collision: true,
      detail: 'records',
    },
    {
      id: 'waiting-bench',
      name: 'ANOM_EntranceCorridor_WaitingBench',
      position: [-1.9, 0, 0.15],
      size: [0.62, 0.66, 1.5],
      color: '#6e5d50',
      anomalyStyle: 'standard',
      collision: true,
    },
    {
      id: 'coat-stand',
      name: 'ANOM_EntranceCorridor_CoatStand',
      position: [1.85, 0, 1.15],
      size: [0.55, 1.8, 0.55],
      color: '#65503f',
      shape: 'cylinder',
      anomalyStyle: 'corridor',
      collision: true,
    },
    {
      id: 'returned-parcel',
      name: 'ANOM_EntranceCorridor_ReturnedParcel',
      position: [-1.65, 0, 2.2],
      size: [0.72, 0.48, 0.62],
      color: '#806b4c',
      anomalyStyle: 'corridor',
      detail: 'labels',
    },
    {
      id: 'runner-rug',
      name: 'ANOM_EntranceCorridor_Runner',
      position: [0, 0.02, 1.15],
      size: [1.2, 0.05, 3.35],
      color: '#65504b',
      anomalyStyle: 'corridor',
    },
    {
      id: 'umbrella-stand',
      name: 'ANOM_EntranceCorridor_UmbrellaStand',
      position: [1.85, 0, 2.6],
      size: [0.5, 0.95, 0.5],
      color: '#4c5654',
      shape: 'cylinder',
      anomalyStyle: 'corridor',
    },
    {
      id: 'wall-portrait',
      name: 'ANOM_EntranceCorridor_WallPortrait',
      position: [-2.28, 0, -1.1],
      size: [0.12, 1.25, 0.9],
      color: '#715847',
      shape: 'frame',
      anomalyStyle: 'corridor',
    },
  ],
};

export class GreyboxEntranceCorridor extends FinalRouteRoomBase {
  public constructor() {
    super(CONFIG);
  }

  protected createRoomDetails(): void {
    this.getVisualRoot().add(
      this.createDetailBox(
        'DETAIL_EntranceCorridor_ExitSign',
        [1.35, 0.26, 0.05],
        [0, 2.62, -4.28],
        '#9d735c',
      ),
      this.createDetailBox(
        'DETAIL_EntranceCorridor_LoopArrow',
        [0.42, 0.42, 0.04],
        [0, 1.28, -4.32],
        '#7c4942',
      ),
    );
  }
}
