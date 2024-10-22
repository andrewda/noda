import { ComponentProps, Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { buildModuleUrl, ImageryLayer, CallbackProperty, Cartesian2, Cartesian3, ClockStep, Color, Ellipsoid, HeadingPitchRoll, ImageryProvider, Ion, IonImageryProvider, IonWorldImageryStyle, JulianDate, MapboxStyleImageryProvider, PolylineDashMaterialProperty, ProviderViewModel, ReferenceFrame, SampledPositionProperty, SceneMode, TileMapServiceImageryProvider, VelocityOrientationProperty, VelocityVectorProperty, WebMercatorProjection, Cartographic, ExtrapolationType } from 'cesium';
import { Camera, Clock, Entity, Globe, PathGraphics, Scene, useCesium, Viewer } from 'resium';

import { useResizeDetector } from 'react-resize-detector';

import { AircraftStateBoard } from './C2Panel';
import { RadioCommunicationBoard } from './RadioPanel';

Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MjBkYTg4OC1hNTkwLTRkZTgtOGFiOS01MGJmMmIzYmE1MTMiLCJpZCI6MjI3NTE3LCJpYXQiOjE3MjA1ODQxOTV9.LxcjcFed2nuTnsX5wBV7B6NH_ks1Wjg__3EBWBaQnas';

const kFeetToMeters = 0.3048;

function ConfigureCesium() {
  const { scene, viewer } = useCesium();
  const { width, height, ref } = useResizeDetector();

  // TODO: fix this hack
  if (viewer?.baseLayerPicker && viewer.baseLayerPicker.viewModel.imageryProviderViewModels.length !== 3) {
    viewer.baseLayerPicker.viewModel.imageryProviderViewModels = [
      new ProviderViewModel({
        name: 'Simple Dark',
        iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/stamenToner.png'),
        tooltip: '',
        creationFunction: () => [new MapboxStyleImageryProvider({
          styleId: 'dark-v10',
          accessToken: 'pk.eyJ1IjoiYW5kcmV3ZGEiLCJhIjoiY2p3dGpkbXF0M2VtazN6bjBndml6MDgxYyJ9.nBlrcPQG1vXt1Jo3etUaEw'
        })]
      }),
      new ProviderViewModel({
        name: 'Aerial',
        iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/bingAerial.png'),
        tooltip: '',
        // @ts-ignore
        creationFunction: () => [IonImageryProvider.fromAssetId(IonWorldImageryStyle.AERIAL)],
      }),
      new ProviderViewModel({
        name: 'VFR Sectional',
        iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/bingRoads.png'),
        tooltip: '',
        // @ts-ignore
        creationFunction: () => [
          IonImageryProvider.fromAssetId(IonWorldImageryStyle.AERIAL),
          TileMapServiceImageryProvider.fromUrl('https://r2dassonville.github.io/faa-geo/tiles/current/sectional/'),
          // ArcGisMapServerImageryProvider.fromUrl('https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Sectional/MapServer', { enablePickFeatures: false }),
        ],
      }),
    ];
    viewer.baseLayerPicker.viewModel.selectedImagery = viewer.baseLayerPicker.viewModel.imageryProviderViewModels[0];

    viewer.baseLayerPicker.viewModel.terrainProviderViewModels = [];
  }

  // Set canvas ref
  useEffect(() => {
    try {
      ref.current = viewer?.canvas;
    } catch (e) {
      ref.current = undefined;
    }
  }, [ref, viewer]);

  // On cesium resize, update canvas size
  useEffect(() => {
    if (scene) {
      // // @ts-expect-error
      // scene.pixelRatio = window.devicePixelRatio;
      // scene.canvas.width = window.innerWidth * window.devicePixelRatio;
      // scene.canvas.height = window.innerHeight * window.devicePixelRatio;
    }
  }, [scene, width, height]);

  return <></>;
}

const initCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 64;
  return canvas;
};

const renderCanvas = (canvas: HTMLCanvasElement, aircraft: AircraftStateBoard, receiving: boolean, selected: boolean) => {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.clearRect(0, 0, canvas.width, canvas.height);

  const callsignFontSize = 12;
  const dataFontSize = 11;
  const gap = 3;
  const xPadding = 8;
  const topPadding = 2;
  const bottomPadding = 5;
  const receivingCirclePadding = 3;
  const receivingCircleRadius = 4;
  const receivingCircleStrokeWidth = 2;

  // Draw aircraft callsign label. White text on black background if not selected. Black text on magenta background if selected.

  // Calculate text width
  c.font = `600 ${callsignFontSize}px monospace`;
  const textWidth1 = c.measureText(aircraft.callsign).width;

  c.font = `600 ${dataFontSize}px monospace`;
  const textWidth2 = c.measureText(`${Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}/${Math.round(aircraft.tas / 100).toString().padStart(3, '0')}`).width;

  const rectRight = Math.max(textWidth1, textWidth2) + 2 * xPadding;
  const rectBottom = callsignFontSize + dataFontSize + topPadding + gap + bottomPadding;

  // Draw background first
  c.fillStyle = selected ? 'magenta' : '#000000cc';
  c.fillRect(0, 0, rectRight, rectBottom);

  // Draw callsign
  c.fillStyle = selected ? 'black' : 'white';
  c.font = `600 ${callsignFontSize}px monospace`;
  c.fillText(aircraft.callsign, xPadding, callsignFontSize + topPadding);

  c.font = `600 ${dataFontSize}px monospace`;
  c.fillText(`${Math.round(aircraft.altitude / 100).toString().padStart(3, '0')}/${Math.round(aircraft.tas).toString().padStart(3, '0')}`, xPadding, callsignFontSize + dataFontSize + topPadding + gap);

  // Draw receive indicator (green circle)
  if (receiving) {
    c.fillStyle = '#00d30a';
    c.beginPath();
    c.arc(rectRight - receivingCircleRadius - receivingCircleStrokeWidth, rectBottom + receivingCircleRadius + receivingCirclePadding + receivingCircleStrokeWidth, receivingCircleRadius, 0, Math.PI * 2, false);
    c.fill();

    // Stroke in grey
    c.strokeStyle = '#ababab';
    c.lineWidth = 2;
    c.stroke();
  }
};

function LabelEntity({ aircraft, receiving, selected, ...props }: { aircraft: AircraftStateBoard, receiving: boolean, selected: boolean } & ComponentProps<typeof Entity>) {
  const [image, setImage] = useState<HTMLCanvasElement>();

  useEffect(() => {
    const c = initCanvas();
    renderCanvas(c, aircraft, receiving, selected);
    setImage(c);
  }, [aircraft, receiving, selected]);

  // return <Entity {...props} billboard={{ image, pixelOffset: new Cartesian2(65, -25) }} />;
  return <Entity {...props} billboard={{ image, pixelOffset: new Cartesian2(65, -10), eyeOffset: new Cartesian3(0, 0, -0.5) }} />;
};


type EntitiesProps = {
  aircraft: Record<string, AircraftStateBoard> | undefined,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
}
export function Entities({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: EntitiesProps) {
  // TODO: it seems like this is getting wiped occasionally? something weird happens when selected aircraft changes
  const [sampledPositionMap] = useState(new Map<string, SampledPositionProperty>());

  const renderAircraft = (aircraft: AircraftStateBoard, selected: boolean = false) => {
    const entityColor = selected ? Color.MAGENTA : Color.WHITE;

    if (!sampledPositionMap.has(aircraft.callsign)) {
      const sampledPositionProperty = new SampledPositionProperty(ReferenceFrame.FIXED, 0);
      sampledPositionProperty.forwardExtrapolationDuration = 3000;
      sampledPositionProperty.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;

      sampledPositionMap.set(aircraft.callsign, sampledPositionProperty);
    }

    const sampledPosition = sampledPositionMap.get(aircraft.callsign);

    const position = Cartesian3.fromDegrees(aircraft.position[1], aircraft.position[0], aircraft.altitude * kFeetToMeters);
    sampledPosition?.addSample(JulianDate.now(), position);

    return (
      <Fragment key={aircraft.callsign}>
        <Entity
          name={aircraft.callsign}
          position={sampledPosition}
          // billboard={{ image: 'images/ownship-map.svg', color: entityColor, alignedAxis: velocityVector, rotation }}
          // path={{ leadTime: -0.5, trailTime: 60, show: true, width: 10, material: new PolylineDashMaterialProperty({ color: entityColor, gapColor: Color.TRANSPARENT, dashLength: 10 }) }}
          point={{ pixelSize: 10, color: entityColor }}
          path={{ leadTime: 0, trailTime: 30, show: true, width: 3 }}
          onClick={() => onSelectAircraft?.(aircraft.callsign)}
        />
        <LabelEntity position={sampledPosition} aircraft={aircraft} receiving={radios?.[aircraft.callsign]?.receiving ?? false} selected={selected} onClick={() => onSelectAircraft?.(aircraft.callsign)} />
      </Fragment>
    )
  }

  const renderAllAircraft = () => {
    return Object.values(aircraft ?? {}).map((aircraft) => renderAircraft(aircraft, aircraft.callsign === selectedAircraftCallsign))
  }

  return (
    <>
      {renderAllAircraft()}
      {/* <Entity
        polyline={{ positions: cartesians, width: 4, material: Color.RED }}
      /> */}
    </>
  );
}

type MapPanelProps = {
  aircraft: Array<AircraftStateBoard> | undefined,
  radios: Array<RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
}
export default function MapPanel({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: MapPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const startTime = useMemo(() => JulianDate.now(), []);
  // const mapProjection = useMemo(() => new WebMercatorProjection(Ellipsoid.WGS84), []);
  const creditContainer = useMemo(() => typeof DocumentFragment !== 'undefined' ? new DocumentFragment() as any : undefined, []);
  // const baseLayerPicker = useMemo(() => ref.current ? new BaseLayerPicker(ref.current, {}) : null, [ref]);

  return (
    <>
      <div id="base-layer-picker" ref={ref}></div>
      <Viewer
        sceneMode={SceneMode.SCENE3D}
        // sceneMode={SceneMode.SCENE2D}
        // mapProjection={mapProjection}
        fullscreenButton={false}
        animation={false}
        timeline={false}
        infoBox={false}
        selectionIndicator={false}
        geocoder={false}
        homeButton={false}
        navigationHelpButton={false}
        projectionPicker={false}
        sceneModePicker={false}
        // baseLayerPicker={false}
        creditContainer={creditContainer}
        creditDisplay={undefined}
        // msaaSamples={4}
        style={{ height: '100%' }}
        // baseLayer={ImageryLayer.fromProviderAsync(Promise.resolve(new MapboxStyleImageryProvider({
        //   styleId: 'dark-v10',
        //   accessToken: 'pk.eyJ1IjoiYW5kcmV3ZGEiLCJhIjoiY2p3dGpkbXF0M2VtazN6bjBndml6MDgxYyJ9.nBlrcPQG1vXt1Jo3etUaEw'
        // })), {})}
      >
        <Scene debugShowFramesPerSecond={true} />
        {/* <Globe baseColor={Color.fromCssColorString('#000000')} showGroundAtmosphere={false} /> */}
        <Camera />

        <Clock startTime={startTime} currentTime={JulianDate.now()} clockStep={ClockStep.SYSTEM_CLOCK_MULTIPLIER} shouldAnimate />
        <ConfigureCesium />

        <Entities aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSelectAircraft} />
      </Viewer>
    </>
  )
}
