import { ComponentProps, Fragment, use, useEffect, useMemo, useRef, useState } from 'react';

import { buildModuleUrl, Cartesian2, Cartesian3, ClockStep, Color, Ellipsoid, ExtrapolationType, Ion, IonImageryProvider, IonWorldImageryStyle, JulianDate, LabelStyle, MapboxStyleImageryProvider, Material, MaterialProperty, NearFarScalar, PolylineDashMaterialProperty, ProviderViewModel, Rectangle, ReferenceFrame, SampledPositionProperty, SceneMode, SingleTileImageryProvider, TextureMagnificationFilter, TextureMinificationFilter, TileMapServiceImageryProvider, WebMapServiceImageryProvider, WebMercatorProjection, WebMercatorTilingScheme } from 'cesium';
import { Camera, Clock, Entity, ImageryLayer, Polyline, PolylineCollection, Scene, useCesium, Viewer } from 'resium';

import { useResizeDetector } from 'react-resize-detector';

import { AircraftStateBoard } from './C2Panel';
import { RadioCommunicationBoard } from './RadioPanel';

Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MjBkYTg4OC1hNTkwLTRkZTgtOGFiOS01MGJmMmIzYmE1MTMiLCJpZCI6MjI3NTE3LCJpYXQiOjE3MjA1ODQxOTV9.LxcjcFed2nuTnsX5wBV7B6NH_ks1Wjg__3EBWBaQnas';

const kFeetToMeters = 0.3048;

const ConfigureCesium = () => {
  const { viewer } = useCesium();
  const { ref } = useResizeDetector();

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

  return <Entity {...props} billboard={{ image, pixelOffset: new Cartesian2(65, -10), eyeOffset: new Cartesian3(0, 0, -3000) }} />;
};


const Rings = ({ position, show }: { position: SampledPositionProperty, show: boolean }) => {
  if (!position.getValue(JulianDate.now())) return <></>;

  return (
    <>
      <Entity
        position={position}
        ellipse={{
          semiMajorAxis: (10 * 1852),
          semiMinorAxis: (10 * 1852),
          material: Color.RED.withAlpha(0.2),
          outline: true,
          outlineColor: Color.RED,
          outlineWidth: 3,
          numberOfVerticalLines: 0,
          fill: false,
        }}
        show={show}
      />

      <Entity
        position={position}
        ellipse={{
          semiMajorAxis: (20 * 1852),
          semiMinorAxis: (20 * 1852),
          material: Color.BLUE.withAlpha(0.2),
          outline: true,
          outlineColor: Color.BLUE,
          outlineWidth: 3,
          numberOfVerticalLines: 0,
          fill: false,
        }}
        show={show}
      />
    </>
  );
}

const FlightPlan = ({ polylinePositions, waypointNames, show }: { polylinePositions: Cartesian3[] | undefined, waypointNames: string[], show: boolean }) => {
  const polylineMaterial = useMemo(() => new PolylineDashMaterialProperty(), []);
  const polylineGraphics = useMemo(() => ({ positions: polylinePositions, width: 3, material: polylineMaterial }), [polylinePositions]);

  if (!polylinePositions) return <></>;

  return (
    <>
      <Entity polyline={polylineGraphics} show={show} />
      {waypointNames.slice(0, -1).map((waypointName, i) => <Entity key={waypointName}
        show={show}
        position={polylinePositions[i]}
        label={{ text: waypointName.replace(/_/g, ' '), font: 'bold 16px monospace', fillColor: Color.BLACK, showBackground: true, backgroundColor: Color.LIGHTGRAY, backgroundPadding: new Cartesian2(4, 4), style: LabelStyle.FILL, scaleByDistance: new NearFarScalar(10000, 1, 500000, 0.3) }}
      />)}
    </>
  );
}

const Aircraft = ({ aircraft, position, polylinePositions, selected, onSelectAircraft }: { aircraft: AircraftStateBoard, position: SampledPositionProperty | undefined, polylinePositions: Cartesian3[] | undefined, selected: boolean, onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined }) => {
  if (!position) return <></>;

  const entityColor = selected ? Color.MAGENTA : Color.WHITE;

  return (
    <>
      <Entity
        name={aircraft.callsign}
        position={position}
        // billboard={{ image: 'images/ownship-map.svg', color: entityColor, alignedAxis: velocityVector, rotation }}
        // path={{ leadTime: -0.5, trailTime: 60, show: true, width: 10, material: new PolylineDashMaterialProperty({ color: entityColor, gapColor: Color.TRANSPARENT, dashLength: 10 }) }}
        point={{ pixelSize: 10, color: entityColor }}
        path={{ leadTime: 0, trailTime: 60, show: true, width: 3 }}
        onClick={() => onSelectAircraft?.(aircraft.callsign)}
      >
        <LabelEntity position={position} aircraft={aircraft} receiving={/*radios?.[aircraft.callsign]?.receiving ??*/ false} selected={selected} onClick={() => onSelectAircraft?.(aircraft.callsign)} />

        <Rings position={position} show={selected} />
        <FlightPlan polylinePositions={polylinePositions} waypointNames={aircraft.flightPlan} show={selected} />
      </Entity>
    </>
  )
}

type EntitiesProps = {
  aircraft: Record<string, AircraftStateBoard> | undefined,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
}
export function Entities({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: EntitiesProps) {
  const polylinePositionsMap = useMemo(() => new Map<string, Cartesian3[]>(), []);
  const sampledPositionMap = useMemo(() => new Map<string, SampledPositionProperty>(), []);

  useEffect(() => {
    Object.values(aircraft ?? {}).forEach((aircraft) => {
      const sampledPosition = sampledPositionMap.get(aircraft.callsign);

      if (!sampledPosition) {
        const sampledPositionProperty = new SampledPositionProperty(ReferenceFrame.FIXED, 0);
        sampledPositionProperty.forwardExtrapolationDuration = 3000;
        sampledPositionProperty.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;

        sampledPositionMap.set(aircraft.callsign, sampledPositionProperty);
      }

      const position = Cartesian3.fromDegrees(aircraft.position[1], aircraft.position[0], aircraft.altitude * kFeetToMeters);
      sampledPosition?.addSample(JulianDate.now(), position);

      const polylinePositions = aircraft.flightPlanPos.map(([lat, lon]) => Cartesian3.fromDegrees(lon, lat, 100));
      polylinePositionsMap.set(aircraft.callsign, polylinePositions);
    });
  }, [aircraft, sampledPositionMap]);

  return Object.values(aircraft ?? {}).map((aircraft) => <Aircraft key={aircraft.callsign} aircraft={aircraft} position={sampledPositionMap.get(aircraft.callsign)} polylinePositions={polylinePositionsMap.get(aircraft.callsign)} selected={aircraft.callsign === selectedAircraftCallsign} onSelectAircraft={onSelectAircraft} />);
}

type MapPanelProps = {
  weather: string | undefined;
  aircraft: Record<string, AircraftStateBoard> | undefined,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
}
export default function MapPanel({ aircraft, weather, radios, selectedAircraftCallsign, onSelectAircraft }: MapPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  const startTime = useMemo(() => JulianDate.now(), []);
  const mapProjection = useMemo(() => new WebMercatorProjection(Ellipsoid.WGS84), []);
  const creditContainer = useMemo(() => typeof DocumentFragment !== 'undefined' ? new DocumentFragment() as any : undefined, []);

  const weatherLayer = useMemo(() => {
    if (!weather) return undefined;

    return SingleTileImageryProvider.fromUrl(
      // '/weather/radar_nominal.png',
      `/weather/radar_${weather}.png`,
      {
        // rectangle: Rectangle.fromDegrees(
        //   -129.45,
        //   40.22,
        //   -109.25,
        //   49.93,
        // ),
        rectangle: Rectangle.fromDegrees(
          -127.85,
          40.85,
          -107.67,
          50.5,
        ),
      }
    )
  }, [weather]);

  // Live weather layer
  // const weatherLayer = useMemo(() => new WebMapServiceImageryProvider({
  //   url: 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?',
  //   layers: 'conus_bref_qcd',
  //   parameters: {
  //     format: 'image/png',
  //     transparent: true,
  //     time: new Date().toISOString(),
  //   },
  //   tileWidth: 512,
  //   tileHeight: 512,
  //   tilingScheme: new WebMercatorTilingScheme(),
  // }), []);

  return (
    <>
      <div id="base-layer-picker" ref={ref}></div>
      <Viewer
        // sceneMode={SceneMode.SCENE3D}
        sceneMode={SceneMode.SCENE2D}
        mapProjection={mapProjection}
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
        creditContainer={creditContainer}
        creditDisplay={undefined}
        // msaaSamples={4}
        style={{ height: '100%' }}
      >
        <Scene debugShowFramesPerSecond={false} />
        {/* <Globe baseColor={Color.fromCssColorString('#000000')} showGroundAtmosphere={false} /> */}
        <Camera />

        <Clock startTime={startTime} currentTime={JulianDate.now()} clockStep={ClockStep.SYSTEM_CLOCK_MULTIPLIER} shouldAnimate />
        <ConfigureCesium />

        <Entities aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSelectAircraft} />

        {weatherLayer && <ImageryLayer imageryProvider={weatherLayer} alpha={0.5} minificationFilter={TextureMinificationFilter.NEAREST} magnificationFilter={TextureMagnificationFilter.NEAREST}  />}
      </Viewer>
    </>
  )
}
