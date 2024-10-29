import { useCallback, useEffect, useMemo, useState } from 'react';
import { toCanvas } from 'html-to-image';
import * as StreamDeck from '@elgato-stream-deck/webhid';
import { RadioCommunicationBoard } from '@/components/RadioPanel';

export type UseButtonPanelsProps = {
  onTransmitting: (index: number, transmitting: boolean) => void;
  onToggleMonitoring: (index: number) => void;
  radios: Record<string, RadioCommunicationBoard>;
}
export const useButtonPanels = ({ onTransmitting, onToggleMonitoring, radios }: UseButtonPanelsProps) => {
  const [buttonPanels, setButtonPanels] = useState<StreamDeck.StreamDeckWeb[]>([]);

  useEffect(() => {
    const getButtonPanels = async () => {
      const buttonPanels = await StreamDeck.getStreamDecks();

      buttonPanels.forEach((buttonPanel, index) => bindButtonPanel(buttonPanel, index));
      setButtonPanels(buttonPanels);
    };

    getButtonPanels();

    return () => {
      buttonPanels.forEach((buttonPanel) => buttonPanel.close());
    }
  }, []);

  const bindButtonPanel = useCallback((buttonPanel: StreamDeck.StreamDeckWeb, index: number) => {
    buttonPanel.removeAllListeners();

    buttonPanel.on('down', (button) => {
      console.log('down', button);
      if (button.row === 0) {
        // Monitoring button
        onToggleMonitoring(button.column + index * 4);
      } else if (button.row === 1) {
        // Transmitting button
        onTransmitting(button.column + index * 4, true);
      }
    });

    buttonPanel.on('up', (button) => {
      if (button.row === 1) {
        // Transmitting button
        onTransmitting(button.column + index * 4, false);
      }
    });
  }, [onTransmitting, onToggleMonitoring]);

  useEffect(() => {
    buttonPanels?.forEach((buttonPanel, index) => bindButtonPanel(buttonPanel, index));
    return () => buttonPanels?.forEach((buttonPanel) => buttonPanel.removeAllListeners());
  }, [buttonPanels, bindButtonPanel]);

  const getCanvasFromImage = (imagePath: string) => {
    return new Promise<HTMLCanvasElement>((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 120;

      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      const img = new Image();
      img.src = imagePath;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
    });
  }

  const imageElements = useMemo(() => ({
    monitor: {
      on: getCanvasFromImage('/images/panel/monitor_on.jpg'),
      off: getCanvasFromImage('/images/panel/monitor_off.jpg'),
    },
    transmit: {
      on: getCanvasFromImage('/images/panel/transmit_on.jpg'),
      off: getCanvasFromImage('/images/panel/transmit_off.jpg'),
    },
    ownship: getCanvasFromImage('/images/panel/ownship.png'),
    volume: getCanvasFromImage('/images/panel/volume.png'),
  }), []);

  const drawButton = async (buttonPanel: StreamDeck.StreamDeckWeb, keyIndex: number, image: HTMLCanvasElement) => {
    buttonPanel.fillKeyCanvas(keyIndex, image);
  }

  // const drawLcd = async   (localIndex: number, { aircraft, frequency, receiving }: RadioCommunicationBoard) => {
  //   const offset = (localIndex - 1.5) * 20;

  //   // const canvas = createCanvas(200, 100);
  //   const canvas = document.createElement('canvas');
  //   canvas.width = 200;
  //   canvas.height = 100;

  //   const ctx = canvas.getContext('2d');

  //   if (!ctx) return;

  //   const identifier = aircraft ?? 'N/A';

  //   // Adjust center to align with keys
  //   const adjustedCenter = canvas.width / 2 + offset;

  //   ctx.font = 'bold 22px monospace';
  //   ctx.fillStyle = '#ffffff';
  //   ctx.textAlign = 'center';
  //   const { width: callsignWidth } = ctx.measureText(identifier);
  //   ctx.fillText(identifier, adjustedCenter, 32);

  //   // Draw ownship icon on left side
  //   ctx.drawImage(ownshipIcon, adjustedCenter - callsignWidth / 2 - 16 - 4, 16);

  //   // Draw green circle on right side
  //   ctx.fillStyle = '#00ff00';
  //   ctx.beginPath();
  //   ctx.arc(adjustedCenter + callsignWidth / 2 + 8 + 4, 24, 6, 0, 2 * Math.PI);

  //   if (receiving) {
  //     ctx.fill();
  //   }

  //   // Stroke around green circle in gray
  //   ctx.strokeStyle = '#bab7ab';
  //   ctx.lineWidth = 2;
  //   ctx.stroke();

  //   ctx.font = 'bold 16px monospace';
  //   ctx.fillStyle = knobState === 'frequency' ? '#00A9A9' : '#bab7ab';
  //   ctx.textAlign = 'center';
  //   ctx.fillText(frequency.toFixed(3), adjustedCenter, 56);

  //   const volumeBarLength = canvas.width * 0.4;
  //   const volumeBarStart = adjustedCenter - (volumeBarLength / 2) + (volumeIcon.width + 8) / 2;

  //   ctx.fillStyle = knobState === 'volume' ? '#00A9A9' : '#bab7ab';
  //   ctx.fillRect(volumeBarStart, 72, volumeBarLength * volume, 8);

  //   ctx.strokeStyle = '#bab7ab';
  //   ctx.lineWidth = 1;
  //   ctx.strokeRect(volumeBarStart, 72, volumeBarLength, 8);

  //   ctx.drawImage(volumeIcon, volumeBarStart - volumeIcon.width - 8, 72 - volumeIcon.height / 2 + 2);

  //   const image = await sharp(canvas.toBuffer())
  //     .flatten({ background: '#000000' })
  //     .resize(canvas.width, canvas.height)
  //     .raw()
  //     .toBuffer();

  //   const deviceIndex = Math.floor(channel / kStreamDeckChannels);
  //   await this._devices[deviceIndex].fillEncoderLcd(deviceChannelIndex, image, { format: 'rgb' }).catch((e) => console.error('Fill failed:', e));
  // }

  useEffect(() => {
    // Render stuff

    if (buttonPanels.length < 2) {
      console.log('No button panels found');
      return;
    }

    buttonPanels[0].setBrightness(100);
    buttonPanels[1].setBrightness(100);

    Object.values(radios)?.forEach(async ({ aircraft, frequency, monitoring, transmitting }, idx) => {
      if (idx < 4) {
        drawButton(buttonPanels[0], idx, monitoring ? await imageElements.monitor.on : await imageElements.monitor.off);
        drawButton(buttonPanels[0], idx + 4, transmitting ? await imageElements.transmit.on : await imageElements.transmit.off);
      } else {
        drawButton(buttonPanels[1], idx - 4, monitoring ? await imageElements.monitor.on : await imageElements.monitor.off);
        drawButton(buttonPanels[1], idx - 4 + 4, transmitting ? await imageElements.transmit.on : await imageElements.transmit.off);
      }
    });
  }, [buttonPanels, radios]);
}
