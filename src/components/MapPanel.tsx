import { useEffect, useRef, useState } from 'react';

import { Feature } from 'ol';
import OlMap from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls } from 'ol/control';
import { click } from 'ol/events/condition';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { circular } from 'ol/geom/Polygon';
import { Select } from 'ol/interaction';
import { Image as ImageLayer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import LayerGroup from 'ol/layer/Group';
import { fromLonLat, transformExtent } from 'ol/proj';
import { ImageStatic, Vector as VectorSource, XYZ } from 'ol/source';
import { Fill, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { AircraftStateBoard } from './C2Panel';
import { RadioCommunicationBoard } from './RadioPanel';
import { Combobox } from './ui/combobox';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

import 'ol/ol.css'; // Import OpenLayers CSS
import { boundingExtent, containsCoordinate } from 'ol/extent';

// Opacity Slider Component
const OpacitySlider = ({ opacity, setOpacity }: { opacity: number, setOpacity: (opacity: number) => void }) => (
  <div
    style={{
      width: 180,
      height: 'fit-content',
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: '8px',
      paddingBottom: '12px',
      borderRadius: '4px',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75em',
    }}
  >
    <Label>Radar Opacity</Label>
    <Slider defaultValue={[opacity * 100]} onValueChange={([value]: number[]) => setOpacity(value / 100)} />
  </div>
);

// Base Layer Picker Component
const BaseLayerPicker = ({ map }: { map: OlMap }) => {
  const [selectedLayer, setSelectedLayer] = useState('Simple Dark');

  const onChange = (value: string) => {
    setSelectedLayer(value);

    console.log(map.getLayers());
    map.getLayers().forEach((layer) => {
      if (layer instanceof LayerGroup) {
        layer.getLayers().forEach((lyr) => {
          lyr.setVisible(lyr.get('title') === value || lyr.get('title') === 'Simple Dark');
        });
      }
    });
  };

  return (
    <div
      style={{
        width: 180,
        height: 'fit-content',
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '8px',
        borderRadius: '4px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75em',
      }}
    >
      <Label>Base Layer</Label>
      <Combobox label="Base Layer" options={[{ label: 'Simple Dark', value: 'Simple Dark' }, { label: 'Aerial', value: 'Aerial' }, { label: 'VFR Sectional', value: 'VFR Sectional' }, { label: 'IFR Chart', value: 'IFR Chart' }]} defaultValue={selectedLayer} onValueChange={onChange} />
    </div>
  );
};

interface MapPanelProps {
  aircraft: Record<string, AircraftStateBoard> | undefined,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  weather: string | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
}

// Main MapPanel Component
const MapPanel = ({
  aircraft,
  weather,
  radios,
  selectedAircraftCallsign,
  onSelectAircraft,
}: MapPanelProps) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<OlMap>();
  const [opacity, setOpacity] = useState(0.25);

  // Create vector sources and layers with useRef
  const aircraftVectorSource = useRef(new VectorSource());
  const aircraftVectorLayer = useRef(
    new VectorLayer({
      source: aircraftVectorSource.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
  );

  const selectedAircraftVectorSource = useRef(new VectorSource());
  const selectedAircraftVectorLayer = useRef(
    new VectorLayer({
      source: selectedAircraftVectorSource.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
  );

  const ringsVectorSource = useRef(new VectorSource());
  const ringsVectorLayer = useRef(
    new VectorLayer({
      source: ringsVectorSource.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
  );

  const flightPlanVectorSource = useRef(new VectorSource());
  const flightPlanVectorLayer = useRef(
    new VectorLayer({
      source: flightPlanVectorSource.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      declutter: 'obstacle',
    })
  );

  // Aircraft trails
  const aircraftTrailsRef = useRef(new Map());
  const aircraftTrailsVectorSource = useRef(new VectorSource());
  const aircraftTrailsVectorLayer = useRef(
    new VectorLayer({
      source: aircraftTrailsVectorSource.current,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    })
  );

  // Weather layer ref
  const weatherLayerRef = useRef<ImageLayer<ImageStatic>>();

  // Update map view when selected aircraft changes
  useEffect(() => {
    const selectedAircraft = aircraft?.[selectedAircraftCallsign ?? ''];
    const view = map?.getView();

    if (!map || !view || !selectedAircraft) return;

    const extent = view.calculateExtent();
    const aircraftPosition = fromLonLat(selectedAircraft.position.toReversed());

    if (!containsCoordinate(extent, aircraftPosition)) {
      const center = view.getCenter()!;
      const newExtent = boundingExtent([center, aircraftPosition]);

      view.fit(newExtent, {
        padding: [200, 200, 100, 100],
        duration: 400,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAircraftCallsign])

  useEffect(() => {
    // Initialize map with base layers
    const mapboxAccessToken = 'pk.eyJ1IjoiYW5kcmV3ZGEiLCJhIjoiY2p3dGpkbXF0M2VtazN6bjBndml6MDgxYyJ9.nBlrcPQG1vXt1Jo3etUaEw'; // Replace with your Mapbox token

    const baseLayers = [
      new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxAccessToken}`,
          tileSize: 512,
          maxZoom: 22,
        }),
        visible: true,
        properties: { title: 'Simple Dark' },
      }),
      new TileLayer({
        source: new XYZ({
          url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxAccessToken}`,
          tileSize: 512,
          maxZoom: 22,
        }),
        visible: false,
        properties: { title: 'Aerial' },
      }),
      new TileLayer({
        source: new XYZ({
          url: 'https://r2dassonville.github.io/faa-geo/tiles/current/sectional/{z}/{x}/{-y}.webp',
          projection: 'EPSG:3857',
          tileSize: 256,
          maxZoom: 11,
          minZoom: 0,
          crossOrigin: 'anonymous',
        }),
        visible: false,
        properties: { title: 'VFR Sectional' },
      }),
      new TileLayer({
        source: new XYZ({
          url: 'https://r2dassonville.github.io/faa-geo/tiles/current/ifrlo/{z}/{x}/{-y}.webp',
          projection: 'EPSG:3857',
          tileSize: 256,
          maxZoom: 11,
          minZoom: 0,
          crossOrigin: 'anonymous',
        }),
        visible: false,
        properties: { title: 'IFR Chart' },
      }),
    ];

    const baseLayerGroup = new LayerGroup({
      layers: baseLayers,
    });

    const initialMap = new OlMap({
      target: mapElement.current ?? undefined,
      layers: [baseLayerGroup],
      view: new View({
        center: fromLonLat([-95, 37]), // Center of USA
        zoom: 4,
      }),
      controls: defaultControls({ attribution: false, rotate: false, zoom: false }),
    });

    // Add vector layers to the map
    initialMap.addLayer(ringsVectorLayer.current);
    initialMap.addLayer(flightPlanVectorLayer.current);
    initialMap.addLayer(aircraftTrailsVectorLayer.current); // Add the trails layer
    initialMap.addLayer(aircraftVectorLayer.current);
    initialMap.addLayer(selectedAircraftVectorLayer.current); // Add the selected aircraft layer last

    // Click Interaction
    const selectClick = new Select({
      condition: click,
      layers: [aircraftVectorLayer.current, selectedAircraftVectorLayer.current],
    });

    initialMap.addInteraction(selectClick);

    selectClick.on('select', (event) => {
      console.log(event.selected);
      const selectedFeatures = event.selected;
      if (selectedFeatures.length > 0) {
        const selectedFeature = selectedFeatures[0];
        const aircraftItem = selectedFeature.get('aircraft');
        if (aircraftItem) {
          console.log(aircraftItem);
          onSelectAircraft?.(aircraftItem.callsign);
        }
      } else {
        console.log('no feature selected');
        onSelectAircraft?.(undefined);
      }
    });

    setMap(initialMap);

    // Cleanup
    return () => {
      initialMap.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    // Update Weather Layer
    if (weather) {
      const extent = transformExtent(
        [-127.45, 40.55, -107.27, 50.20],
        'EPSG:4326',
        map.getView().getProjection()
      );

      if (weatherLayerRef.current) {
        // Update existing weather layer
        weatherLayerRef.current.setSource(new ImageStatic({
          url: `/weather/radar_${weather}.png`,
          imageExtent: extent,
          interpolate: false,
        }));
        weatherLayerRef.current.setOpacity(opacity);
      } else {
        // Create new weather layer
        weatherLayerRef.current = new ImageLayer({
          source: new ImageStatic({
            url: `/weather/radar_${weather}.png`,
            imageExtent: extent,
            interpolate: false,
          }),
          opacity,
        });
        const layers = map.getLayers();
        layers.insertAt(1, weatherLayerRef.current);
        // map.addLayer(weatherLayerRef.current);
      }
    } else {
      // Remove weather layer if it exists
      if (weatherLayerRef.current) {
        map.removeLayer(weatherLayerRef.current);
        weatherLayerRef.current = undefined;
      }
    }
  }, [map, weather, opacity]);

  useEffect(() => {
    if (!map) return;

    // Update Aircraft Features
    const aircraftSource = aircraftVectorSource.current;
    const selectedAircraftSource = selectedAircraftVectorSource.current;
    const aircraftTrailsSource = aircraftTrailsVectorSource.current;

    aircraftSource.clear();
    selectedAircraftSource.clear();
    aircraftTrailsSource.clear();

    const now = Date.now();
    const cutoffTime = now - 60000; // 60 seconds

    const callsignsPresent = new Set();

    Object.values(aircraft || {}).forEach((aircraftItem) => {
      const callsign = aircraftItem.callsign;
      callsignsPresent.add(callsign);

      const coords = fromLonLat([aircraftItem.position[1], aircraftItem.position[0]]);
      const point = new Point(coords);

      const receiving = radios?.[callsign]?.receiving || false;
      const selected = callsign === selectedAircraftCallsign;

      const altitudeText = Math.round(aircraftItem.altitude / 100).toString().padStart(3, '0')
      const airspeedText = Math.round(aircraftItem.tas).toString().padStart(3, '0')

      const aircraftLabelStyle = new Style({
        text: new Text({
          text: `${aircraftItem.callsign}\n${altitudeText}/${airspeedText}`,
          font: 'bold 12px "Roboto Mono"',
          fill: new Fill({ color: selected ? 'black' : 'white' }),
          backgroundFill: new Fill({ color: selected ? '#ff3dff' : 'black' }),
          padding: [4, 6, 2, 6],
          offsetY: -25,
          offsetX: 35,
          overflow: true,
        }),
        image: new CircleStyle({
          radius: 3,
          fill: new Fill({ color: receiving ? '#00d30a' : 'transparent' }),
          // stroke: new Stroke({ color: 'black', width: 1 }),
          displacement: [62, 1]
        }),
      });

      // Create aircraft dot style
      const aircraftDotStyle = new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: selected ? 'magenta' : 'lightgrey' }),
          stroke: new Stroke({ color: 'black', width: 1 }),
        }),
      });

      const feature = new Feature({ geometry: point, aircraft: aircraftItem });
      feature.setStyle((feature, resolution) => {
        // console.log(resolution);
        // aircraftLabelStyle.getText()?.setScale(Math.min(1, 1 / resolution));
        return [aircraftDotStyle, aircraftLabelStyle];
      });

      if (selected) {
        selectedAircraftSource.addFeature(feature);
      } else {
        aircraftSource.addFeature(feature);
      }

      // Update aircraft trail
      let positionsArray: { position: number[], timestamp: number }[] = aircraftTrailsRef.current.get(callsign);
      if (!positionsArray) {
        positionsArray = [];
      }
      // Append the new position
      positionsArray.push({ position: aircraftItem.position, timestamp: now });

      // Remove positions older than 60 seconds
      positionsArray = positionsArray.filter((p) => p.timestamp >= cutoffTime);

      // Update the map
      aircraftTrailsRef.current.set(callsign, positionsArray);

      // Now create a LineString feature if there are at least two positions
      if (positionsArray.length >= 2) {
        const coordinates = positionsArray.map((p) =>
          fromLonLat([p.position[1], p.position[0]])
        );
        const lineFeature = new Feature({
          geometry: new LineString(coordinates),
        });

        lineFeature.setStyle(
          new Style({
            stroke: new Stroke({ color: 'yellow', width: 4 }),
          })
        );

        aircraftTrailsSource.addFeature(lineFeature);
      }
    });

    // Remove entries for aircraft no longer present
    // @ts-ignore
    for (const callsign of aircraftTrailsRef.current.keys()) {
      if (!callsignsPresent.has(callsign)) {
        aircraftTrailsRef.current.delete(callsign);
      }
    }

    // Update Rings and Flight Plan for Selected Aircraft
    const ringsSource = ringsVectorSource.current;
    const flightPlanSource = flightPlanVectorSource.current;

    ringsSource.clear();
    flightPlanSource.clear();

    if (selectedAircraftCallsign && aircraft?.[selectedAircraftCallsign]) {
      const selectedAircraft = aircraft[selectedAircraftCallsign];
      const latlon = [
        selectedAircraft.position[1],
        selectedAircraft.position[0],
      ];

      // Rings
      const innerCircle = new Feature({
        geometry: circular(latlon, 10 * 1852, 64).transform('EPSG:4326', 'EPSG:3857'),
      });
      const outerCircle = new Feature({
        geometry: circular(latlon, 20 * 1852, 64).transform('EPSG:4326', 'EPSG:3857'),
      });

      innerCircle.setStyle(
        new Style({
          stroke: new Stroke({ color: 'red', width: 3 }),
          // fill: new Fill({ color: 'rgba(255, 0, 0, 0.1)' }),
        })
      );
      outerCircle.setStyle(
        new Style({
          stroke: new Stroke({ color: 'blue', width: 3 }),
          // fill: new Fill({ color: 'rgba(0, 0, 255, 0.1)' }),
        })
      );

      ringsSource.addFeatures([innerCircle, outerCircle]);

      // Flight Plan
      if (selectedAircraft.flightPlanPos?.length > 0) {
        const coordinates = selectedAircraft.flightPlanPos.map(([lat, lon]) =>
          fromLonLat([lon, lat])
        );

        const flightPlanFeature = new Feature({
          geometry: new LineString(coordinates),
        });

        flightPlanFeature.setStyle(
          new Style({
            stroke: new Stroke({ color: 'lightgrey', width: 3, lineDash: [10, 10] }),
          })
        );

        flightPlanSource.addFeature(flightPlanFeature);

        // Waypoint Labels
        selectedAircraft.flightPlan?.slice(0, -1).forEach((waypointName, index) => {
          if (index < selectedAircraft.flightPlanPos.length) {
            const [lat, lon] = selectedAircraft.flightPlanPos[index];
            const coord = fromLonLat([lon, lat]);

            const waypointFeature = new Feature({ geometry: new Point(coord) });

            waypointFeature.setStyle(
              new Style({
                text: new Text({
                  text: waypointName.replace(/_/g, ' '),
                  font: 'bold 10px "Roboto Mono"',
                  fill: new Fill({ color: 'black' }),
                  backgroundFill: new Fill({ color: 'rgba(163, 163, 163, 1)' }),
                  padding: [4, 4, 2, 4],
                  overflow: true,
                }),
                zIndex: 2,
              }),
            );

            flightPlanSource.addFeature(waypointFeature);
          }
        });
      }
    }
  }, [aircraft, radios, selectedAircraftCallsign, map]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapElement} style={{ width: '100%', height: '100%' }}></div>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, display: 'flex', gap: '0.75em' }}>
        <OpacitySlider opacity={opacity} setOpacity={setOpacity} />
        {map && <BaseLayerPicker map={map} />}
      </div>
    </div>
  );
};

export default MapPanel;
