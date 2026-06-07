(function () {
  const preview = document.getElementById("camera-preview");
  const empty = document.getElementById("camera-empty");
  const status = document.getElementById("camera-status");
  const recordBadge = document.getElementById("record-badge");
  const recordingTime = document.getElementById("recording-time");
  const recordingSize = document.getElementById("recording-size");
  const cameraDevice = document.getElementById("camera-device");
  const recordFormat = document.getElementById("record-format");
  const recordAudio = document.getElementById("record-audio");
  const startCameraButton = document.getElementById("start-camera");
  const launchAndroidButton = document.getElementById("launch-android-app");
  const androidLaunchStatus = document.getElementById("android-launch-status");
  const stopCameraButton = document.getElementById("stop-camera");
  const startRecordingButton = document.getElementById("start-recording");
  const stopRecordingButton = document.getElementById("stop-recording");
  const discardRecordingButton = document.getElementById("discard-recording");
  const saveRecordingButton = document.getElementById("save-recording");
  const fileNamePreview = document.getElementById("file-name-preview");
  const saveSupport = document.getElementById("save-support");
  const permissionState = document.getElementById("permission-state");

  const formats = [
    {
      label: "WebM VP9 + Opus (.webm)",
      mimeType: "video/webm;codecs=vp9,opus",
      extension: "webm",
    },
    {
      label: "WebM VP8 + Opus (.webm)",
      mimeType: "video/webm;codecs=vp8,opus",
      extension: "webm",
    },
    {
      label: "WebM (.webm)",
      mimeType: "video/webm",
      extension: "webm",
    },
    {
      label: "MP4 H.264 + AAC (.mp4)",
      mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      extension: "mp4",
    },
    {
      label: "MP4 (.mp4)",
      mimeType: "video/mp4",
      extension: "mp4",
    },
  ];

  let stream = null;
  let recorder = null;
  let chunks = [];
  let recordedBlob = null;
  let recordingStartedAt = 0;
  let recordingTimer = 0;
  let recordedFileName = "";
  const androidBridgeOrigin = "http://127.0.0.1:18080";

  function setStatus(message, type) {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  }

  function setAndroidLaunchStatus(message, type) {
    if (!androidLaunchStatus) {
      return;
    }

    androidLaunchStatus.textContent = message;
    androidLaunchStatus.classList.toggle("is-error", type === "error");
    androidLaunchStatus.classList.toggle("is-success", type === "success");
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function getTimestamp() {
    const now = new Date();
    const parts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "_",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ];

    return parts.join("");
  }

  function getSelectedFormat() {
    const selected = formats.find(function (format) {
      return format.mimeType === recordFormat.value;
    });

    return selected || formats[0];
  }

  function getBaseMimeType(mimeType) {
    return mimeType.split(";")[0];
  }

  function updateFileNamePreview() {
    const selectedFormat = getSelectedFormat();
    fileNamePreview.textContent = recordedFileName || `record_video_${getTimestamp()}.${selectedFormat.extension}`;
  }

  function updateControls() {
    const hasStream = Boolean(stream);
    const isRecording = recorder && recorder.state === "recording";
    const hasRecording = Boolean(recordedBlob);
    const hasFormat = Boolean(recordFormat.value);

    startCameraButton.disabled = isRecording;
    stopCameraButton.disabled = !hasStream || isRecording;
    startRecordingButton.disabled = !hasStream || isRecording || !hasFormat;
    stopRecordingButton.disabled = !isRecording;
    discardRecordingButton.disabled = isRecording || !hasRecording;
    saveRecordingButton.disabled = isRecording || !hasRecording;
    cameraDevice.disabled = !hasStream || isRecording;
    recordFormat.disabled = isRecording || !hasFormat;
    recordAudio.disabled = isRecording;
  }

  function populateFormats() {
    recordFormat.innerHTML = "";

    if (!window.MediaRecorder) {
      setStatus("当前浏览器不支持 MediaRecorder，无法录制摄像头画面。", "error");
      updateControls();
      return;
    }

    const supportedFormats = formats.filter(function (format) {
      return MediaRecorder.isTypeSupported(format.mimeType);
    });

    supportedFormats.forEach(function (format) {
      const option = document.createElement("option");
      option.value = format.mimeType;
      option.textContent = format.label;
      recordFormat.appendChild(option);
    });

    if (!supportedFormats.length) {
      setStatus("当前浏览器没有可用的视频录制格式。", "error");
    }

    saveSupport.textContent = window.showSaveFilePicker
      ? "支持系统保存位置选择"
      : "当前浏览器会使用下载保存";
    updateControls();
    updateFileNamePreview();
  }

  async function refreshDeviceList() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(function (device) {
      return device.kind === "videoinput";
    });
    const activeDeviceId = stream && stream.getVideoTracks()[0]
      ? stream.getVideoTracks()[0].getSettings().deviceId
      : cameraDevice.value;

    cameraDevice.innerHTML = "";

    if (!cameras.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "未发现摄像头";
      cameraDevice.appendChild(option);
      setStatus("没有检测到可用摄像头，请连接摄像头后重试。", "error");
      return;
    }

    cameras.forEach(function (device, index) {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `摄像头 ${index + 1}`;
      cameraDevice.appendChild(option);
    });

    if (activeDeviceId) {
      cameraDevice.value = activeDeviceId;
    }
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }

    stream = null;
    preview.srcObject = null;
    empty.hidden = false;
    permissionState.textContent = "已关闭";
    updateControls();
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("当前页面无法访问摄像头。请使用 HTTPS 或 localhost，并换用支持摄像头 API 的浏览器。", "error");
      permissionState.textContent = "不支持";
      return;
    }

    stopStream();
    setStatus("正在请求摄像头权限...");
    permissionState.textContent = "请求中";

    const videoConstraint = cameraDevice.value
      ? { deviceId: { exact: cameraDevice.value } }
      : { facingMode: "user" };
    const constraints = {
      video: videoConstraint,
      audio: recordAudio.checked,
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      preview.srcObject = stream;
      empty.hidden = true;
      permissionState.textContent = "已授权";
      await refreshDeviceList();
      setStatus("摄像头已打开，可以开始录像。", "success");
    } catch (error) {
      permissionState.textContent = "失败";
      if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
        setStatus("没有检测到可用摄像头，请连接摄像头后重试。", "error");
      } else if (error.name === "NotAllowedError") {
        setStatus("摄像头或麦克风权限被拒绝，请在浏览器权限设置中允许访问。", "error");
      } else {
        setStatus(`摄像头打开失败：${error.message || error.name}`, "error");
      }
    } finally {
      updateControls();
    }
  }

  function startTimer() {
    window.clearInterval(recordingTimer);
    recordingStartedAt = Date.now();
    recordingTime.textContent = "00:00";
    recordingSize.textContent = "正在录制";
    recordingTimer = window.setInterval(function () {
      const elapsed = Math.floor((Date.now() - recordingStartedAt) / 1000);
      recordingTime.textContent = formatTime(elapsed);
    }, 300);
  }

  function stopTimer() {
    window.clearInterval(recordingTimer);
    recordingTimer = 0;
  }

  function startRecording() {
    if (!stream) {
      setStatus("请先打开摄像头。", "error");
      return;
    }

    const selectedFormat = getSelectedFormat();
    recordedBlob = null;
    recordedFileName = "";
    chunks = [];

    try {
      recorder = new MediaRecorder(stream, { mimeType: selectedFormat.mimeType });
    } catch (error) {
      setStatus(`无法使用所选格式录制：${error.message || error.name}`, "error");
      updateControls();
      return;
    }

    recorder.addEventListener("dataavailable", function (event) {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", function () {
      stopTimer();
      recordedBlob = new Blob(chunks, { type: selectedFormat.mimeType });
      recordedFileName = `record_video_${getTimestamp()}.${selectedFormat.extension}`;
      recordingSize.textContent = formatBytes(recordedBlob.size);
      recordBadge.hidden = true;
      setStatus("录制完成。点击“选择地址并保存”保存文件。", "success");
      updateFileNamePreview();
      updateControls();
    });

    recorder.start(1000);
    recordBadge.hidden = false;
    startTimer();
    setStatus("正在录制摄像头画面与声音...");
    updateControls();
  }

  function stopRecording() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  function discardRecording() {
    recordedBlob = null;
    recordedFileName = "";
    chunks = [];
    recordingTime.textContent = "00:00";
    recordingSize.textContent = "未录制";
    updateFileNamePreview();
    setStatus("已丢弃上一段录像。");
    updateControls();
  }

  async function saveRecording() {
    if (!recordedBlob) {
      return;
    }

    const selectedFormat = getSelectedFormat();
    const fileName = recordedFileName || `record_video_${getTimestamp()}.${selectedFormat.extension}`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: selectedFormat.label,
              accept: {
                [getBaseMimeType(recordedBlob.type || selectedFormat.mimeType)]: [`.${selectedFormat.extension}`],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(recordedBlob);
        await writable.close();
        setStatus(`已保存：${fileName}`, "success");
        return;
      } catch (error) {
        if (error.name === "AbortError") {
          setStatus("已取消保存。");
          return;
        }

        setStatus(`保存失败，已切换为浏览器下载：${error.message || error.name}`, "error");
      }
    }

    const url = URL.createObjectURL(recordedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function launchAndroidApp() {
    if (!launchAndroidButton) {
      return;
    }

    launchAndroidButton.disabled = true;
    setAndroidLaunchStatus("正在通过本地 bridge 启动 Android App...");

    try {
      const response = await fetch(`${androidBridgeOrigin}/launch-app`, {
        method: "POST",
      });
      const payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !payload.ok) {
        throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
      }

      setAndroidLaunchStatus("已发送启动命令，手机 App 会自动开始推流。", "success");
      setStatus("Android 手机摄像头已通过本地 bridge 启动。", "success");
    } catch (error) {
      setAndroidLaunchStatus(`启动失败：${error.message}`, "error");
      setStatus("无法启动 Android 手机摄像头。请确认 bridge 正在运行且 ADB 已授权。", "error");
    } finally {
      launchAndroidButton.disabled = false;
    }
  }

  if (launchAndroidButton) {
    launchAndroidButton.addEventListener("click", launchAndroidApp);
  }
  startCameraButton.addEventListener("click", startCamera);
  stopCameraButton.addEventListener("click", function () {
    stopStream();
    setStatus("摄像头已关闭。");
  });
  startRecordingButton.addEventListener("click", startRecording);
  stopRecordingButton.addEventListener("click", stopRecording);
  discardRecordingButton.addEventListener("click", discardRecording);
  saveRecordingButton.addEventListener("click", saveRecording);
  recordFormat.addEventListener("change", updateFileNamePreview);
  cameraDevice.addEventListener("change", startCamera);
  recordAudio.addEventListener("change", function () {
    if (stream) {
      startCamera();
    }
  });

  window.addEventListener("beforeunload", stopStream);

  populateFormats();
  updateControls();
})();
