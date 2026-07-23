class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedBlob = null;
    this.isRecording = false;
  }

  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start() {
    if (!this.isSupported()) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordedBlob = null;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Recording started...');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recorder is not active.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Create blob from chunks
        // Check standard MIME types, fallback to audio/webm or audio/wav
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
        
        this.recordedBlob = new Blob(this.audioChunks, { type: mimeType });
        this.isRecording = false;
        
        // Stop all tracks on the stream to release microphone
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        console.log('Recording stopped. Blob created with size:', this.recordedBlob.size);
        resolve(this.recordedBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  getBlob() {
    return this.recordedBlob;
  }

  getFile(filename = 'elder_recording.webm') {
    if (!this.recordedBlob) return null;
    return new File([this.recordedBlob], filename, { type: this.recordedBlob.type });
  }

  clear() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordedBlob = null;
    this.isRecording = false;
  }
}

// Make it globally accessible
window.voiceRecorder = new VoiceRecorder();
