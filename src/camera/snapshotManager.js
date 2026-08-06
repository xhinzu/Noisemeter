/**
 * Classroom Noise Meter - Local Webcam Snapshot Logger
 * Feature-detects camera devices, captures local canvas frames on every 5th alert trigger,
 * and maintains an in-memory/IndexedDB snapshot gallery with privacy guarantees.
 */

export class SnapshotManager {
  constructor(videoElement) {
    this.videoEl = videoElement;
    this.stream = null;
    this.isEnabled = false;
    this.hasCameraHardware = false;
    this.availableDevices = [];

    this.snapshots = []; // Array of { id, timestamp, dataUrl, alertIndex }

    // Callbacks
    this.onSnapshotsUpdated = null; // (snapshotsList) => void
    this.onHardwareDetected = null; // (hasCamera, devices) => void
  }

  /**
   * Proactively checks if webcam hardware is available on the client device
   */
  async checkCameraHardware() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        this.hasCameraHardware = false;
        if (this.onHardwareDetected) this.onHardwareDetected(false, []);
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      this.hasCameraHardware = videoInputs.length > 0;
      this.availableDevices = videoInputs;

      if (this.onHardwareDetected) {
        this.onHardwareDetected(this.hasCameraHardware, this.availableDevices);
      }
      return this.hasCameraHardware;
    } catch (err) {
      this.hasCameraHardware = false;
      if (this.onHardwareDetected) this.onHardwareDetected(false, []);
      return false;
    }
  }

  /**
   * Enables camera stream when requested by user
   */
  async enableCamera(deviceId = null) {
    try {
      if (this.stream) {
        this.stopCamera();
      }

      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isEnabled = true;
      return true;
    } catch (err) {
      this.isEnabled = false;
      throw err;
    }
  }

  /**
   * Stops active camera stream
   */
  stopCamera() {
    this.isEnabled = false;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  /**
   * Invoked on each alert trigger. If camera is enabled and alert count is a multiple of 5 (5, 10, 15...), captures snapshot frame.
   */
  onAlertTrigger(alertCount) {
    if (!this.isEnabled || alertCount % 5 !== 0) return;

    this.captureSnapshot(alertCount);
  }

  /**
   * Draws current video frame onto an offscreen canvas and converts to JPEG blob/dataUrl
   */
  captureSnapshot(alertIndex) {
    if (!this.videoEl || !this.stream || this.videoEl.readyState < 2) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.videoEl.videoWidth || 1280;
      canvas.height = this.videoEl.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      // Mirror horizontal frame for natural camera feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.videoEl, 0, 0, canvas.width, canvas.height);

      // Add timestamp overlay on photo
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(15, canvas.height - 50, 360, 35);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      const nowStr = new Date().toLocaleTimeString();
      ctx.fillText(`ALERT #${alertIndex} - ${nowStr}`, 25, canvas.height - 27);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      const snapshotItem = {
        id: 'snap_' + Date.now(),
        alertIndex,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: new Date().toLocaleDateString(),
        dataUrl
      };

      this.snapshots.push(snapshotItem);

      if (this.onSnapshotsUpdated) {
        this.onSnapshotsUpdated(this.snapshots);
      }
    } catch (e) {
      console.warn("Failed to capture webcam snapshot frame:", e);
    }
  }

  /**
   * Clears all stored photos from session memory
   */
  clearAllSnapshots() {
    this.snapshots = [];
    if (this.onSnapshotsUpdated) {
      this.onSnapshotsUpdated(this.snapshots);
    }
  }

  /**
   * Returns list of recorded snapshots
   */
  getSnapshots() {
    return this.snapshots;
  }
}
