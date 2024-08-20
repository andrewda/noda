import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node'
import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import path from 'path'
import EventEmitter from 'events';
import { encode } from 'punycode';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Number of channels per streamdeck
const kStreamDeckChannels = 4;

// Image dimensions
const kButtonSize = 120;

const IMAGES = {
  'monitor': {
    'on': await sharp(path.resolve(__dirname, 'buttons/Headphones On.jpg')).resize(kButtonSize, kButtonSize).raw().toBuffer(),
    'off': await sharp(path.resolve(__dirname, 'buttons/Headphones Off.jpg')).resize(kButtonSize, kButtonSize).raw().toBuffer(),
  },
  'transmit': {
    'on': await sharp(path.resolve(__dirname, 'buttons/Microphone On.jpg')).resize(kButtonSize, kButtonSize).raw().toBuffer(),
    'off': await sharp(path.resolve(__dirname, 'buttons/Microphone Off.jpg')).resize(kButtonSize, kButtonSize).raw().toBuffer(),
  },
};

const ownshipIcon = await loadImage(path.resolve(__dirname, 'ownship.png'));
const volumeIcon = await loadImage(path.resolve(__dirname, 'volume.png'));

function wrapNumber(num, min, max) {
  const rangeSize = max - min;
  return (((num - min) % rangeSize) + rangeSize) % rangeSize + min;
}

class CommunicationPanelManager {
  _steamDeckManager;
  _channels;

  get channels() {
    return this._channels;
  }

  set channels(channels) {
    this._channels = channels;
    setImmediate(() => this.updateState());
  }

  /**
   *
   * @param {number} numChannels Number of channels
   */
  constructor(numChannels) {
    this._steamDeckManager = new StreamDeckManager();

    const randomNumberBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    this.channels = new Array(numChannels).fill(null).map(() => ({ callsign: `HMT${randomNumberBetween(100, 9999)}`, frequency: 123.075, monitor: true, volume: 0.75, receiving: false }));
    this.transmitChannel = null;

    this.channels[0].receiving = true;

    this._steamDeckManager.on('ready', () => this.updateState());

    this._steamDeckManager.on('monitor:toggle', ({ channelIndex }) => {
      this.channels[channelIndex].monitor = !this.channels[channelIndex].monitor;
      this.updateState();
    });

    this._steamDeckManager.on('transmit:on', ({ channelIndex }) => {
      this.transmitChannel = channelIndex;
      this.updateState();
    });

    this._steamDeckManager.on('transmit:off', ({ channelIndex }) => {
      if (this.transmitChannel === channelIndex) {
        this.transmitChannel = null;
      }
      this.updateState();
    });

    this._steamDeckManager.on('volume:change', ({ channelIndex, delta }) => {
      const kStep = 0.025;
      this.channels[channelIndex].volume = Math.max(0, Math.min(1, this.channels[channelIndex].volume + delta * kStep));

      this.updateState();
    });

    this._steamDeckManager.on('frequency:change', ({ channelIndex, delta }) => {
      let kStep = 25;

      // If turning quickly, accelerate
      if (Math.abs(delta) > 3) {
        kStep = 250;
      }

      const amount = delta * kStep;

      this.channels[channelIndex].frequency = wrapNumber(this.channels[channelIndex].frequency * 1000 + amount, 118000, 136000) / 1000;

      this.updateState();
    });
  }

  async updateState() {
    await this._steamDeckManager.draw(this.channels, this.transmitChannel);
  }
}

class StreamDeckManager extends EventEmitter {
  _devices;
  _knobSelectedState = {};

  constructor(devices = null) {
    super();
    this._initDevices(devices);
  }

  _getButtonDetais(deviceIndex, keyIndex) {
    const deviceChannelIndex = keyIndex % kStreamDeckChannels;
    const buttonType = keyIndex < kStreamDeckChannels ? 'monitor' : 'transmit';
    const channelIndex = deviceChannelIndex + deviceIndex * kStreamDeckChannels;

    return { channelIndex, buttonType };
  }

  _getEncoderDetais(deviceIndex, encoderIndex) {
    const channelIndex = encoderIndex + deviceIndex * kStreamDeckChannels;

    return { channelIndex };
  }

  _handleKeyDown = (deviceIndex, keyIndex) => {
    const { channelIndex, buttonType } = this._getButtonDetais(deviceIndex, keyIndex);

    switch (buttonType) {
      case 'monitor':
        this.emit('monitor:toggle', { channelIndex });
        break;
      case 'transmit':
        this.emit('transmit:on', { channelIndex });
        break;
    }
  }

  _handleKeyUp = (deviceIndex, keyIndex) => {
    const { channelIndex, buttonType } = this._getButtonDetais(deviceIndex, keyIndex);

    switch (buttonType) {
      case 'transmit':
        this.emit('transmit:off', { channelIndex });
        break;
    }
  }

  _handleEncoderTurn = (deviceIndex, encoderIndex, amount) => {
    const { channelIndex } = this._getEncoderDetais(deviceIndex, encoderIndex);

    const editedField = this._knobSelectedState[channelIndex] ?? 'volume';
    this.emit(`${editedField}:change`, { channelIndex, delta: amount });
  }

  _handleEncoderClick = (deviceIndex, encoderIndex) => {
    const { channelIndex } = this._getEncoderDetais(deviceIndex, encoderIndex);
    this._knobSelectedState[channelIndex] = this._knobSelectedState[channelIndex] === 'frequency' ? 'volume' : 'frequency';

    // Force a redraw
    this.draw(null, null);
  }

  async _initDevices(devices) {
    if (devices) {
      this._devices = devices;
    } else {
      const deviceInfo = await listStreamDecks();
      this._devices = await Promise.all(deviceInfo.map(({ path }) => openStreamDeck(path)));
    }

    this._devices.forEach((device, index) => {
      device.setBrightness(75);
      device.on('up', (keyIndex) => this._handleKeyUp(index, keyIndex));
      device.on('down', (keyIndex) => this._handleKeyDown(index, keyIndex));
      device.on('rotateRight', (encoderIndex, amount) => this._handleEncoderTurn(index, encoderIndex, amount));
      device.on('rotateLeft', (encoderIndex, amount) => this._handleEncoderTurn(index, encoderIndex, amount * -1));
      device.on('encoderDown', (encoderIndex) => this._handleEncoderClick(index, encoderIndex));
    });

    this.emit('ready');
  }

  async _drawButton(channel, buttonType, image) {
    const deviceIndex = Math.floor(channel / kStreamDeckChannels);
    const deviceChannelIndex = channel % kStreamDeckChannels;
    const keyIndex = deviceChannelIndex + (buttonType === 'monitor' ? 0 : kStreamDeckChannels);

    await this._devices[deviceIndex].fillKeyBuffer(keyIndex, image).catch((e) => console.error('Fill failed:', e));
  }

  async _drawChannel(channel, monitor, transmit) {
    const monitorImage = IMAGES.monitor[monitor ? 'on' : 'off'];
    const transmitImage = IMAGES.transmit[transmit ? 'on' : 'off'];
    await this._drawButton(channel, 'monitor', monitorImage);
    await this._drawButton(channel, 'transmit', transmitImage);
  }

  async _drawLcd(channel, { callsign, frequency, volume, receiving }) {
    const knobState = this._knobSelectedState[channel] ?? 'volume';

    const deviceChannelIndex = channel % kStreamDeckChannels;
    const offset = (deviceChannelIndex - 1.5) * 20;

    const canvas = createCanvas(200, 100);
    const ctx = canvas.getContext('2d');

    // Adjust center to align with keys
    const adjustedCenter = canvas.width / 2 + offset;

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const { width: callsignWidth } = ctx.measureText(callsign);
    ctx.fillText(callsign, adjustedCenter, 32);

    // Draw ownship icon on left side
    ctx.drawImage(ownshipIcon, adjustedCenter - callsignWidth / 2 - 16 - 4, 16);

    // Draw green circle on right side
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(adjustedCenter + callsignWidth / 2 + 8 + 4, 24, 6, 0, 2 * Math.PI);

    if (receiving) {
      ctx.fill();
    }

    // Stroke around green circle in gray
    ctx.strokeStyle = '#bab7ab';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = knobState === 'frequency' ? '#00A9A9' : '#bab7ab';
    ctx.textAlign = 'center';
    ctx.fillText(frequency.toFixed(3), adjustedCenter, 56);

    const volumeBarLength = canvas.width * 0.4;
    const volumeBarStart = adjustedCenter - (volumeBarLength / 2) + (volumeIcon.width + 8) / 2;

    ctx.fillStyle = knobState === 'volume' ? '#00A9A9' : '#bab7ab';
    ctx.fillRect(volumeBarStart, 72, volumeBarLength * volume, 8);

    ctx.strokeStyle = '#bab7ab';
    ctx.lineWidth = 1;
    ctx.strokeRect(volumeBarStart, 72, volumeBarLength, 8);

    ctx.drawImage(volumeIcon, volumeBarStart - volumeIcon.width - 8, 72 - volumeIcon.height / 2 + 2);

    const image = await sharp(canvas.toBuffer())
      .flatten({ background: '#000000' })
      .resize(canvas.width, canvas.height)
      .raw()
      .toBuffer();

    const deviceIndex = Math.floor(channel / kStreamDeckChannels);
    await this._devices[deviceIndex].fillEncoderLcd(deviceChannelIndex, image, { format: 'rgb' }).catch((e) => console.error('Fill failed:', e));
  }

  async draw(channelStates, transmitChannel) {
    if (!this._devices) return;

    if (!channelStates && !transmitChannel) {
      channelStates = this._lastChannelStates;
      transmitChannel = this._lastTransmitChannel;
    }

    this._lastChannelStates = channelStates;
    this._lastTransmitChannel = transmitChannel;

    Object.entries(channelStates).map(async ([channel, state]) => {
      await this._drawChannel(channel, state.monitor, transmitChannel === parseInt(channel));
      await this._drawLcd(channel, state);
    });
  }
}

const panel = new CommunicationPanelManager(8);
