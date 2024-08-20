import * as d3 from 'd3';
import { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import Ownship from '../../public/images/ownship.svg';
import { AircraftStateBoard } from './C2Panel';
import { MonitorIndicator, RadioCommunicationBoard } from './RadioPanel';

type TimelinePanelProps = {
  aircraft: Array<AircraftStateBoard> | undefined,
  radios: Array<RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined;
  onSelectAircraft: (aircraftCallsign: string | undefined) => void;
}
export default function TimelinePanel({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: TimelinePanelProps) {
  const { width, height, ref } = useResizeDetector();

  const timeStart = 0;
  const timeEnd = 3600;

  // const data = [
  //   { line: 1, aircraft: 'N71346', start: timeStart, end: timeEnd, times: [0, 1300, 2600] },
  //   { line: 2, aircraft: 'N71346', start: timeStart, end: timeEnd, times: [215, 345, 490, 1400, 2450] },
  //   { line: 3, aircraft: 'N71346', start: 500, end: timeEnd, times: [1125, 1250, 2375, 2500] },
  //   { line: 4, aircraft: 'N71346', start: timeStart, end: 2500, times: [130, 290, 1120, 2180] },
  //   // { line: 5, start: timeStart, end: 2500, times: [130, 290, 1120, 2180] },
  //   // { line: 6, start: timeStart, end: 2500, times: [130, 290, 1120, 2180] },
  //   // { line: 7, start: timeStart, end: 2500, times: [130, 290, 1120, 2180] },
  // ];

  const data = aircraft?.map((aircraftStateBoard, i) => ({
    line: i + 1,
    aircraft: aircraftStateBoard.callsign,
    selected: aircraftStateBoard.callsign === selectedAircraftCallsign,
    receiving: radios?.find((radio) => radio.aircraft === aircraftStateBoard.callsign)?.receiving ?? false,
    start: 0,
    end: 3600,
    times: [0, 1300, 2600],
  })) ?? [];

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
    .domain([0, data.length + 1])
    .range([0, containerHeight]);

  const yDom = d3.scaleLinear()
    .domain([0, data.length + 1])
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
      .attr('transform', `translate(0,${containerHeight - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat((d: any) => d === 0 ? 'Now' : `+${Math.floor(d / 60)} min`).tickValues([0, 600, 1200, 1800, 2400, 3000, 3600]));

    data.forEach((d, i) => {
      svg.append('line')
        .attr('x1', x(d.start))
        .attr('y1', y(d.line))
        .attr('x2', x(d.end))
        .attr('y2', y(d.line))
        .attr('class', `line ${d.selected ? 'selected' : ''}`);

      d.times.forEach((time, i2) => {
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
              .text('SHEDD');
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });
      });

      if (d.start > timeStart) {
        const anchorName = `--anchor-${i}-start`;

        container.append('img')
          .attr('src', 'images/airport.svg')
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
              .text(`Origin Airport!`);
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });

      }

      if (d.end < timeEnd) {
        const anchorName = `--anchor-${i}-end`;

        container.append('img')
          .attr('src', 'images/airport.svg')
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
              .text(`Arrival Airport!`);
          })
          .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
          });
      }

    });

    return () => {
      container.selectAll('*').remove();
    };
  }, [data, width, height]);

  return <div className='w-full h-full flex flex-row bg-zinc-900'>
    <div className="relative w-full basis-32 flex-shrink-0">
      {data.map((d, i) =>
        <div key={i} className="h-6 flex items-center gap-2 self-stretch absolute cursor-pointer hover:brightness-75" style={{top: yDom(i + 1) - 12, right: 0}} onClick={() => onSelectAircraft(d.aircraft)}>
          <Ownship width={18} height={18} />
          <div className={`font-mono text-sm ${d.selected ? 'text-fuchsia-400' : 'text-gray-200'}`}>{d.aircraft}</div>
          <MonitorIndicator receive={d.receiving} className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
    <div id='timeline-container' className="relative w-full flex-shrink flex-grow" ref={ref}></div>
  </div>;
}
