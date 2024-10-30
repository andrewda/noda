import * as d3 from 'd3';
import { useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as turf from '@turf/turf';
import Ownship from '../../public/images/ownship.svg';
import { AircraftStateBoard } from './C2Panel';
import { MonitorIndicator, RadioCommunicationBoard } from './RadioPanel';

type TimelinePanelProps = {
  aircraft: Record<string, AircraftStateBoard> | undefined,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: (aircraftCallsign: string | undefined) => void;
}
export default function TimelinePanel({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: TimelinePanelProps) {
  const { width, height, ref } = useResizeDetector();

  const timeStart = 0;
  const timeEnd = 3600 / 2;

  const timelines = useMemo(() => {
    return Object.values(aircraft ?? {}).map((aircraftStateBoard, i) => {
      const position = aircraftStateBoard.position.toReversed();
      const waypointNames = aircraftStateBoard.flightPlan?.slice(Math.max(aircraftStateBoard.flightPlanIndex - 1, 0));
      const waypointPositions = aircraftStateBoard.flightPlanPos?.slice(Math.max(aircraftStateBoard.flightPlanIndex - 1, 0)).map((pos) => pos.toReversed());

      if (waypointPositions.length < 2) {
        return {
          line: i + 1,
          aircraft: aircraftStateBoard.callsign,
          flightPhase: aircraftStateBoard.flightPhase,
          start: 0,
          end: 0,
          times: [],
          departureAirport: aircraftStateBoard.departureAirport,
          arrivalAirport: aircraftStateBoard.arrivalAirport,
        }
      }

      const lineString = turf.lineString(waypointPositions);
      const slicedLineString = turf.lineSlice(position, waypointPositions[waypointPositions.length - 1], lineString);

      const distance = turf.length(slicedLineString, { units: 'kilometers' });
      // const airspeedKph = aircraftStateBoard.tas * 1.852;
      const airspeedKph = Math.max(aircraftStateBoard.tas, 130) * 1.852;
      const endTimeSeconds = (distance / airspeedKph) * 3600;

      const waypointTimes = waypointPositions.slice(0, -2).map((pos, i) => {
        const nearestPoint = turf.nearestPointOnLine(slicedLineString, pos, { units: 'kilometers' });
        return { label: waypointNames[i].replace(/_/g, ' '), time: (nearestPoint.properties.location / airspeedKph) * 3600 };
      }).filter(({time}) => time > 0);

      return {
        line: i + 1,
        aircraft: aircraftStateBoard.callsign,
        flightPhase: aircraftStateBoard.flightPhase,
        start: 0,
        end: endTimeSeconds,
        times: waypointTimes,
        departureAirport: aircraftStateBoard.departureAirport,
        arrivalAirport: aircraftStateBoard.arrivalAirport,
      }
    });
  }, [aircraft]);

  const margin = { top: 0, right: 24, bottom: 16, left: 24 };
  const containerWidth = (width ?? 0) - margin.left - margin.right;
  const containerHeight = (height ?? 0) - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain([timeStart, timeEnd])
    .range([0, containerWidth]);

  const xDom = d3.scaleLinear()
    .domain([timeStart, timeEnd])
    .range([margin.left, containerWidth + margin.left]);

  const y = d3.scaleLinear()
    .domain([0, timelines.length + 1])
    .range([0, containerHeight]);

  const yDom = d3.scaleLinear()
    .domain([0, timelines.length + 1])
    .range([margin.top, containerHeight + margin.top]);

  useEffect(() => {
    const iconSize = 24;

    const container = d3.select('#timeline-container');

    const svg = container.append('svg')
      .attr('width', containerWidth + margin.left + margin.right)
      .attr('height', containerHeight + margin.top + margin.bottom)
      .append('g')
      .style('transform', `translate(${margin.left}px,${margin.top}px)`);

    svg.append('g')
      .attr('class', 'xAxis')
      .attr('transform', `translate(0,${containerHeight - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((d: any) => d === 0 ? 'Now' : `+${Math.floor(d / 60)} min`).tickValues([0, 1, 2, 3, 4, 5, 6].map((d) => timeEnd * (d/6))));

    d3.selectAll('g.xAxis g.tick')
      .append('line')
      .attr('class', 'gridline')
      .attr('x1', 0)
      .attr('y1', -(containerHeight - margin.top - margin.bottom - 20))
      .attr('x2', 0)
      .attr('y2', 0)
      .attr('stroke', '#525252')
      .attr('stroke-dasharray','4');

    timelines.forEach((d, i) => {
      svg.append('line')
        .attr('x1', x(d.start))
        .attr('y1', y(d.line))
        .attr('x2', x(Math.min(d.end, timeEnd)))
        .attr('y2', y(d.line))
        .attr('class', `line ${d.aircraft === selectedAircraftCallsign ? 'selected' : ''}`);

      d.times.forEach(({ label, time }, i2) => {
        if (time > timeEnd) return;

        const anchorName = `--anchor-${i}-${i2}`;

        container.append('img')
          .attr('src', 'images/fix.svg')
          .style('position', 'absolute')
          .style('left', `${xDom(time) - iconSize / 2}px`)  // Adjust to center the icon
          .style('top', `${yDom(d.line) - iconSize / 2}px`)
          .style('width', `${iconSize}px`)
          .style('height', `${iconSize}px`)
          .style('anchor-name', anchorName)
          .on('mouseover', (event) => {
            d3.select('body').append('div')
              .attr('class', 'tooltip')
              .style('visibility', 'visible')
              .style('position-anchor', anchorName)
              .text(label);
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });
      });

      if (d.start > timeStart) {
        const anchorName = `--anchor-${i}-start`;

        container.append('img')
          .attr('src', 'images/airport_white.svg')
          .style('position', 'absolute')
          .style('left', `${xDom(d.start) - iconSize / 2}px`)  // Adjust to center the icon
          .style('top', `${yDom(d.line) - iconSize / 2}px`)
          .style('width', `${iconSize}px`)
          .style('height', `${iconSize}px`)
          .style('anchor-name', anchorName)
          .on('mouseover', (event, time) => {
            d3.select('body').append('div')
              .attr('class', 'tooltip')
              .style('visibility', 'visible')
              .style('position-anchor', anchorName)
              .text(d.departureAirport);
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });
      }

      if (d.end < timeEnd) {
        const anchorName = `--anchor-${i}-end`;

        container.append('img')
          .attr('src', 'images/airport_white.svg')
          .style('position', 'absolute')
          .style('left', `${x(d.end) - iconSize / 2 + margin.left}px`)  // Adjust to center the icon
          .style('top', `${y(d.line) - iconSize / 2 + margin.top}px`)
          .style('width', `${iconSize}px`)
          .style('height', `${iconSize}px`)
          .style('anchor-name', anchorName)
          .on('mouseover', (event, time) => {
            d3.select('body').append('div')
              .attr('class', 'tooltip')
              .style('visibility', 'visible')
              .style('position-anchor', anchorName)
              .text(d.arrivalAirport);
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });
      }
    });

    return () => {
      container.selectAll('*').remove();
      d3.selectAll('.tooltip').remove();
    };
  }, [timelines, selectedAircraftCallsign, width, height]);

  return <div className="w-full h-full flex flex-row bg-neutral-900">
    <div className="relative w-full basis-32 flex-shrink-0">
      {timelines.map(({ aircraft, flightPhase }, i) => {
        let aircraftColor = 'text-gray-200';
        if (flightPhase <= 2 || flightPhase >= 10) {
          // Aircraft on the ground
          aircraftColor = 'text-gray-400/60';
        }
        if (aircraft === selectedAircraftCallsign) {
          aircraftColor = 'text-fuchsia-400';
        }

        return <div key={i} className={`h-6 flex items-center gap-2 self-stretch absolute cursor-pointer hover:brightness-75 ${aircraftColor}`} style={{top: yDom(i + 1) - 12, right: 0}} onClick={() => onSelectAircraft(aircraft)}>
          <Ownship width={18} height={18} />
          <div className="font-mono text-sm">{aircraft}</div>
          <MonitorIndicator receive={radios?.[i]?.receiving ?? false} className="w-3.5 h-3.5" />
        </div>
      })}
    </div>
    <div id="timeline-container" className="relative w-full min-w-0 flex-shrink flex-grow" ref={ref}></div>
  </div>;
}
