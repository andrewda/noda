import React, { ComponentProps, createElement, FC, Fragment, memo, useEffect, useMemo, useState } from 'react'

import { Ellipsoid, SceneMode, WebMercatorProjection, Ion, Color, Cartesian3, Transforms, CornerType, LabelStyle, EllipseGeometry, VertexFormat, Geometry, GeometryInstance, EllipsoidSurfaceAppearance, Material, SampledPositionProperty, ReferenceFrame, JulianDate, ClockStep, Cartesian2, PolylineDashMaterialProperty, SampledProperty, InterpolationAlgorithm, HermitePolynomialApproximation, LinearApproximation, VelocityOrientationProperty, VelocityVectorProperty, CallbackProperty, Cartographic, SceneTransforms, HeadingPitchRoll } from 'cesium'
import { Billboard, BillboardCollection, BillboardGraphics, Clock, CorridorGraphics, Entity, KmlDataSource, LabelGraphics, PointGraphics, PointPrimitive, PointPrimitiveCollection, Primitive, ShadowMap, useCesium, Viewer } from 'resium'

import { useResizeDetector } from 'react-resize-detector';

import tracklogJson from './tracklog.json';
import configFile from '../../config/noda-config.json';
import { AircraftStateBoard } from './C2Panel';
import { RadioCommunicationBoard } from './RadioPanel';

Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MjBkYTg4OC1hNTkwLTRkZTgtOGFiOS01MGJmMmIzYmE1MTMiLCJpZCI6MjI3NTE3LCJpYXQiOjE3MjA1ODQxOTV9.LxcjcFed2nuTnsX5wBV7B6NH_ks1Wjg__3EBWBaQnas';

const kFeetToMeters = 0.3048;

function ConfigureCesium() {
  const { scene, viewer } = useCesium();
  const { width, height, ref } = useResizeDetector();

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
      // @ts-expect-error
      scene.pixelRatio = window.devicePixelRatio;
      scene.canvas.width = window.innerWidth * window.devicePixelRatio;
      scene.canvas.height = window.innerHeight * window.devicePixelRatio;
    }
  }, [scene, width, height]);

  return <></>;
}

const initCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 48;
  return canvas;
};

const renderCanvas = (canvas: HTMLCanvasElement, callsign: string, receiving: boolean, selected: boolean) => {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.clearRect(0, 0, canvas.width, canvas.height);

  const fontSize = 18;
  const xPadding = 5;
  const topPadding = 2;
  const bottomPadding = 5;
  const receivingCirclePadding = 4;
  const receivingCircleRadius = 6;
  const receivingCircleStrokeWidth = 3;

  // Draw aircraft callsign label. White text on black background if not selected. Black text on magenta background if selected.

  // Calculate text width
  c.font = `800 ${fontSize}px monospace`;
  const textWidth = c.measureText(callsign).width;

  const rectRight = textWidth + 2 * xPadding;
  const rectBottom = fontSize + topPadding + bottomPadding;

  // Draw background first
  c.fillStyle = selected ? 'magenta' : 'black';
  c.fillRect(0, 0, rectRight, rectBottom);

  // Draw callsign
  c.fillStyle = selected ? 'black' : 'white';
  c.font = `800 ${fontSize}px monospace`;
  c.fillText(callsign, 5, fontSize + topPadding);

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

function LabelEntity({ callsign, receiving, selected, ...props }: { callsign: string, receiving: boolean, selected: boolean } & ComponentProps<typeof Entity>) {
  const [image, setImage] = useState<HTMLCanvasElement>();

  useEffect(() => {
    const c = initCanvas();
    renderCanvas(c, callsign, receiving, selected);
    setImage(c);
  }, [callsign, receiving, selected]);

  return <Entity {...props} billboard={{ image, pixelOffset: new Cartesian2(65, -25) }} />;
};


type EntitiesProps = {
  aircraft: Array<AircraftStateBoard> | undefined,
  radios: Array<RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
}
export function Entities({ radios, selectedAircraftCallsign }: EntitiesProps) {
  const cartesians = useMemo(() => {
    const positions = tracklogJson.features[0].geometry.coordinates as number[][];

    return positions.map(([lng, lat]) => Cartesian3.fromDegrees(lng, lat));
  }, []);

  const aircraftEvents = useMemo(() => Object.groupBy(configFile.events, (event) => event.aircraft), []);

  const aircraftEventTimes = useMemo(() => Object.fromEntries(Object.entries(aircraftEvents).map(([aircraft, events]) => [aircraft, events?.map((event) => JulianDate.fromDate(new Date(Date.now() + event.time * 1000)))])), [aircraftEvents]);
  const aircraftEventPositions = useMemo(() => Object.fromEntries(Object.entries(aircraftEvents).map(([aircraft, events]) => [aircraft, events?.map((event) => Cartesian3.fromDegrees(event.position[0], event.position[1], event.position[2] * kFeetToMeters))])), [aircraftEvents]);

  const aircraftSampledPositions = useMemo(() => Object.fromEntries(Object.entries(aircraftEventPositions).map(([aircraft, positions]) => {
    const sampledPosition = new SampledPositionProperty(ReferenceFrame.FIXED);
    sampledPosition.addSamples(aircraftEventTimes[aircraft] as JulianDate[], positions as Cartesian3[]);

    return [aircraft, sampledPosition]
  })), [aircraftEventTimes, aircraftEventPositions]);

  const receivingMap = useMemo(() => radios?.reduce((acc, radio) => {
    if (radio.aircraft) {
      acc[radio.aircraft] = radio.receiving;
    }

    return acc;
  }, {} as { [aircraft: string]: boolean }), [radios]);

  const renderAircraft = (aircraft: string, selected: boolean = false) => {
    const entityColor = selected ? Color.MAGENTA : Color.WHITE;

    const velocityOrientation = new VelocityOrientationProperty(aircraftSampledPositions[aircraft]);
    const velocityVector = new VelocityVectorProperty(aircraftSampledPositions[aircraft], true);

    const rotation = new CallbackProperty((time) => {
      // TODO: better fix for the weird bug with rotation
      // https://github.com/CesiumGS/cesium/issues/2487

      const orientationNow = velocityOrientation.getValue(time);

      if (!orientationNow) {
        return 0;
      }

      const hpr = HeadingPitchRoll.fromQuaternion(orientationNow);
      return -Math.abs(Math.sin(hpr.heading)) * Math.PI * 0.1;
    }, false);

    return (
      <Fragment key={aircraft}>
        <Entity
          key={aircraft}
          position={aircraftSampledPositions[aircraft]}
          billboard={{ image: 'images/ownship-map.svg', color: entityColor, alignedAxis: velocityVector, rotation }}
          path={{ leadTime: -0.5, trailTime: 60, show: true, width: 10, material: new PolylineDashMaterialProperty({ color: entityColor, gapColor: Color.TRANSPARENT, dashLength: 10 }) }}
        />
        <LabelEntity position={aircraftSampledPositions[aircraft]} callsign={aircraft} receiving={receivingMap?.[aircraft] ?? false} selected={selected} />
      </Fragment>
    )
  }

  const renderAllAircraft = () => {
    return configFile.ownships.map((aircraft) => renderAircraft(aircraft, aircraft === selectedAircraftCallsign))
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
}
export default function MapPanel({ aircraft, radios, selectedAircraftCallsign }: MapPanelProps) {
  const startTime = useMemo(() => JulianDate.now(), []);
  const mapProjection = useMemo(() => new WebMercatorProjection(Ellipsoid.WGS84), []);
  const creditContainer = useMemo(() => new DocumentFragment() as any, []);

  return (
      <Viewer
        sceneMode={SceneMode.SCENE2D}
        mapProjection={mapProjection}
        fullscreenButton={false}
        animation={false}
        timeline={false}
        infoBox={false}
        selectionIndicator={false}
        creditContainer={creditContainer}
        creditDisplay={undefined}
        msaaSamples={4}
        style={{ height: '100%' }}
      >
        <Clock startTime={startTime} currentTime={JulianDate.now()} clockStep={ClockStep.SYSTEM_CLOCK_MULTIPLIER} shouldAnimate />
        <ConfigureCesium />

        <Entities aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} />
      </Viewer>
  )
}
