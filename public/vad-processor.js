class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.vadThreshold = 0.01; // Sensitivity threshold
    this.vadSilenceDuration = 300; // milliseconds
    this.speaking = false;
    this.silenceStart = 0;
    this.sampleRate = sampleRate;
    this.bufferSize = 128; // Number of samples per process call
    this.port.onmessage = (event) => {
      if (event.data.type === 'setThreshold') {
        this.vadThreshold = event.data.threshold;
      }
      if (event.data.type === 'setSilenceDuration') {
        this.vadSilenceDuration = event.data.duration;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += Math.abs(channelData[i]);
      }
      const average = sum / channelData.length;

      if (average > this.vadThreshold) {
        if (!this.speaking) {
          this.speaking = true;
          this.port.postMessage({ type: 'voiceStart' });
        }
        this.silenceStart = 0;
      } else {
        if (this.speaking) {
          this.silenceStart += (channelData.length / this.sampleRate) * 1000;
          if (this.silenceStart > this.vadSilenceDuration) {
            this.speaking = false;
            this.port.postMessage({ type: 'voiceStop' });
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('vad-processor', VADProcessor);
