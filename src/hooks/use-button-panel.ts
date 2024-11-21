import { RadioCommunicationBoard } from '@/components/RadioPanel';
import * as StreamDeck from '@elgato-stream-deck/webhid';
import { useCallback, useEffect, useState } from 'react';

export type UseButtonPanelsProps = {
  buttonPanels: StreamDeck.StreamDeckWeb[];
  onTransmitting: (index: number, transmitting: boolean) => void;
  onToggleMonitoring: (index: number) => void;
  radios: Record<string, RadioCommunicationBoard>;
  selectedAircraftCallsign: string | undefined;
}
export const useButtonPanels = ({ buttonPanels, onTransmitting, onToggleMonitoring, radios, selectedAircraftCallsign }: UseButtonPanelsProps) => {
  const bindButtonPanel = useCallback((buttonPanel: StreamDeck.StreamDeckWeb, index: number) => {
    buttonPanel.removeAllListeners();

    buttonPanel.setBrightness(100);

    buttonPanel.on('down', (button) => {
      const row = 1 - button.row;
      const column = 3 - button.column;

      if (row === 0) {
        // Monitoring button
        onToggleMonitoring(column + index * 4);
      } else if (row === 1) {
        // Transmitting button
        onTransmitting(column + index * 4, true);
      }
    });

    buttonPanel.on('up', (button) => {
      const row = 1 - button.row;
      const column = 3 - button.column;

      if (row === 1) {
        // Transmitting button
        onTransmitting(column + index * 4, false);
      }
    });

    // buttonPanel.on('lcdShortPress', (button, { x }) => {
    //   console.log('lcdShortPress', button, pos);
    // });

    // buttonPanel.on('lcdLongPress', (button, pos) => {
    //   console.log('lcdLongPress', button, pos);
    // });
  }, [onTransmitting, onToggleMonitoring]);

  useEffect(() => {
    buttonPanels?.forEach((buttonPanel, index) => bindButtonPanel(buttonPanel, index));
    return () => buttonPanels?.forEach((buttonPanel) => buttonPanel.removeAllListeners());
  }, [buttonPanels, bindButtonPanel]);

  const getImageFromPath = (imagePath: string) => {
    const img = document.createElement('img');
    img.src = imagePath;
    img.width = 120;
    img.height = 120;
    return img;
  }

  const [imageElements, setImageElements] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    const getImageElements = async () => {
      const [monitorOn, monitorOff, transmitOn, transmitOff, ownship, volume] = await Promise.all([
        getImageFromPath('/images/panel/monitor_on.jpg'),
        getImageFromPath('/images/panel/monitor_off.jpg'),
        getImageFromPath('/images/panel/transmit_on.jpg'),
        getImageFromPath('/images/panel/transmit_off.jpg'),
        getImageFromPath('/images/panel/ownship.png'),
        getImageFromPath('/images/panel/volume.png'),
      ]);
      setImageElements({ monitorOn, monitorOff, transmitOn, transmitOff, ownship, volume });
    }

    getImageElements();
  }, []);

  const drawLcd = async (buttonPanel: StreamDeck.StreamDeckWeb, radios: RadioCommunicationBoard[], selectedAircraftCallsign: string | undefined) => {
    if (!buttonPanel) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 100;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.rotate(Math.PI);
    ctx.translate(-canvas.width, -canvas.height);

    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';

    radios.forEach(({ aircraft, frequency }, idx) => {
      if (aircraft === selectedAircraftCallsign) {
        ctx.fillStyle = '#ff3dff';
      } else {
        ctx.fillStyle = '#ffffff';
      }

      ctx.font = 'bold 32px Roboto Mono';
      ctx.fillText(aircraft ?? 'N/A', 100 + idx * 200, 15);

      ctx.font = '24px Roboto Mono';
      ctx.fillText(frequency, 100 + idx * 200, 15 + 32 + 5);
    });

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    buttonPanel.fillLcd(0, imageData, { format: 'rgba' });

    const buttons = buttonPanel.CONTROLS.filter((control) => control.type === 'button') as StreamDeck.StreamDeckButtonControlDefinitionLcdFeedback[];
    const { width: buttonWidth, height: buttonHeight } = buttonPanel.calculateFillPanelDimensions() ?? {};

    const buttonCanvas = document.createElement('canvas');
    buttonCanvas.width = buttonWidth ?? 0;
    buttonCanvas.height = buttonHeight ?? 0;

    const buttonCtx = buttonCanvas.getContext('2d');
    if (!buttonCtx) return;

    buttonCtx.rotate(Math.PI);
    buttonCtx.translate(-buttonCanvas.width, -buttonCanvas.height);

    buttons.forEach(({ row, column, pixelSize }) => {
      const radio = radios[column];

      let image;
      if (row === 0) {
        image = radio?.monitoring ? imageElements.monitorOn : imageElements.monitorOff;
      } else if (row === 1) {
        image = radio?.transmitting ? imageElements.transmitOn : imageElements.transmitOff;
      }

      if (!image) return;
      buttonCtx.drawImage(image, column * pixelSize.width, row * pixelSize.height, pixelSize.width, pixelSize.height);
    });

    buttonPanel.fillPanelCanvas(buttonCanvas);
  }

  useEffect(() => {
    if (buttonPanels.length < 1) {
      console.log('No button panels found');
      return;
    }

    const leftRadios = Object.values(radios).slice(0, 4);
    const rightRadios = Object.values(radios).slice(4);

    drawLcd(buttonPanels[0], leftRadios, selectedAircraftCallsign);
    drawLcd(buttonPanels[1], rightRadios, selectedAircraftCallsign);
  }, [buttonPanels, radios, selectedAircraftCallsign]);
}
