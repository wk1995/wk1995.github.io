(function () {
  const preview = document.getElementById("camera-preview");
  const androidPreview = document.getElementById("android-preview");
  const empty = document.getElementById("camera-empty");
  const status = document.getElementById("camera-status");
  const recordBadge = document.getElementById("record-badge");
  const recordingTime = document.getElementById("recording-time");
  const recordingSize = document.getElementById("recording-size");
  const cameraDevice = document.getElementById("camera-device");
  const recordFormat = document.getElementById("record-format");
  const recordAudio = document.getElementById("record-audio");
  const startCameraButton = document.getElementById("start-camera");
  const stopCameraButton = document.getElementById("stop-camera");
  const startRecordingButton = document.getElementById("start-recording");
  const stopRecordingButton = document.getElementById("stop-recording");
  const discardRecordingButton = document.getElementById("discard-recording");
  const saveRecordingButton = document.getElementById("save-recording");
  const fileNamePreview = document.getElementById("file-name-preview");
  const saveSupport = document.getElementById("save-support");
  const permissionState = document.getElementById("permission-state");

  const ANDROID_DEVICE_VALUE = "__usb_android_camera__";
  const ANDROID_BRIDGE_ORIGIN = "http://127.0.0.1:18080";
  const ANDROID_TIMEOUT_MS = 15000;
  const ANDROID_POLL_MS = 650;

  const formats = [
    { label: "WebM VP9 + Opus (.webm)", mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { label: "WebM VP8 + Opus (.webm)", mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { label: "WebM (.webm)", mimeType: "video/webm", extension: "webm" },
    { label: "MP4 H.264 + AAC (.mp4)", mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
    { label: "MP4 (.mp4)", mimeType: "video/mp4", extension: "mp4" },
  ];

  let stream = null;
  let recorder = null;
  let chunks = [];
  let recordedBlob = null;
  let recordingStartedAt = 0;
  let recordingTimer = 0;
  let recordedFileName = "";
  let androidActive = false;
  let androidLoading = false;
  let androidRunId = 0;

  function setStatus(message, type) {
    status.textContent = message || "";
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  }

  function setEmptyState(title, body, isLoading) {
    const titleNode = empty.querySelector("strong");
    const bodyNode = empty.querySelector("span");

    if (titleNode) {
      titleNode.textContent = title;
    }
    if (bodyNode) {
      bodyNode.textContent = body;
    }
    empty.classList.toggle("is-loading", Boolean(isLoading));
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

  function delay(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function getTimestamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "_",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join("");
  }

  function getSelectedFormat() {
    return formats.find(function (format) {
      return format.mimeType === recordFormat.value;
    }) || formats[0];
  }

  function getBaseMimeType(mimeType) {
    return mimeType.split(";")[0];
  }

  function isAndroidSelected() {
    return cameraDevice.value === ANDROID_DEVICE_VALUE;
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
    const androidSelected = isAndroidSelected();

    startCameraButton.disabled = isRecording || androidSelected || androidLoading;
    stopCameraButton.disabled = (!hasStream && !androidActive && !androidLoading) || isRecording;
    startRecordingButton.disabled = !hasStream || isRecording || !hasFormat || androidSelected || androidActive || androidLoading;
    stopRecordingButton.disabled = !isRecording;
    discardRecordingButton.disabled = isRecording || !hasRecording;
    saveRecordingButton.disabled = isRecording || !hasRecording;
    cameraDevice.disabled = isRecording;
    recordFormat.disabled = isRecording || !hasFormat || androidSelected || androidActive || androidLoading;
    recordAudio.disabled = isRecording || androidSelected || androidActive || androidLoading;
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

  function addCameraOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    cameraDevice.appendChild(option);
  }

  async function refreshDeviceList() {
    const previousValue = cameraDevice.value;
    const activeDeviceId = stream && stream.getVideoTracks()[0]
      ? stream.getVideoTracks()[0].getSettings().deviceId
      : previousValue;

    cameraDevice.innerHTML = "";
    addCameraOption("", "默认摄像头");
    addCameraOption(ANDROID_DEVICE_VALUE, "USB Android 手机摄像头");

    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      cameraDevice.value = previousValue === ANDROID_DEVICE_VALUE ? ANDROID_DEVICE_VALUE : "";
      updateControls();
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const targetValue = cameraDevice.value || previousValue;
    const cameras = devices.filter(function (device) {
      return device.kind === "videoinput";
    });

    if (!cameras.length) {
      cameraDevice.options[0].textContent = "未发现本机摄像头";
    } else {
      cameras.forEach(function (device, index) {
        addCameraOption(device.deviceId, device.label || `摄像头 ${index + 1}`);
      });
    }

    const hasPreviousValue = Array.from(cameraDevice.options).some(function (option) {
      return option.value === targetValue;
    });

    if (activeDeviceId && activeDeviceId !== ANDROID_DEVICE_VALUE) {
      cameraDevice.value = activeDeviceId;
    } else if (hasPreviousValue) {
      cameraDevice.value = targetValue;
    } else {
      cameraDevice.value = "";
    }

    updateControls();
  }

  function stopLocalStream() {
    if (stream) {
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
    stream = null;
    preview.srcObject = null;
  }

  function stopAndroidPreview() {
    androidRunId += 1;
    androidLoading = false;
    androidActive = false;
    if (androidPreview) {
      androidPreview.hidden = true;
      androidPreview.removeAttribute("src");
    }
  }

  function showLocalPreview() {
    stopAndroidPreview();
    preview.hidden = false;
    empty.classList.remove("is-loading");
  }

  function showAndroidPreview() {
    preview.hidden = true;
    if (androidPreview) {
      androidPreview.hidden = false;
      androidPreview.src = `${ANDROID_BRIDGE_ORIGIN}/camera?t=${Date.now()}`;
    }
    androidActive = true;
    androidLoading = false;
    empty.hidden = true;
    empty.classList.remove("is-loading");
    permissionState.textContent = "Android 已连接";
    recordingSize.textContent = "MJPEG 实时流";
  }

  function resetEmptyForLocal() {
    setEmptyState(
      "等待摄像头授权",
      "点击“打开摄像头”后浏览器会请求摄像头与麦克风权限。",
      false
    );
  }

  function stopStream() {
    stopLocalStream();
    stopAndroidPreview();
    preview.hidden = false;
    empty.hidden = false;
    resetEmptyForLocal();
    permissionState.textContent = "已关闭";
    recordingSize.textContent = "未录制";
    updateControls();
  }

  async function startCamera() {
    if (isAndroidSelected()) {
      startAndroidCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("当前页面无法访问摄像头。请使用 HTTPS 或 localhost，并换用支持摄像头 API 的浏览器。", "error");
      permissionState.textContent = "不支持";
      return;
    }

    showLocalPreview();
    stopLocalStream();
    empty.hidden = false;
    resetEmptyForLocal();
    setStatus("正在请求摄像头权限...");
    permissionState.textContent = "请求中";

    const videoConstraint = cameraDevice.value
      ? { deviceId: { exact: cameraDevice.value } }
      : { facingMode: "user" };

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: recordAudio.checked,
      });
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

  async function startAndroidCamera() {
    const runId = androidRunId + 1;
    androidRunId = runId;
    androidLoading = true;
    androidActive = false;
    stopLocalStream();
    if (androidPreview) {
      androidPreview.hidden = true;
      androidPreview.removeAttribute("src");
    }
    preview.hidden = true;
    empty.hidden = false;
    setEmptyState(
      "正在连接 USB Android 摄像头",
      "正在通过本地 bridge 启动手机 App，并等待第一帧画面。",
      true
    );
    permissionState.textContent = "Android 连接中";
    recordingSize.textContent = "等待 Android 视频流";
    setStatus("正在启动 Android App 并等待摄像头流...");
    updateControls();

    try {
      const launchResponse = await fetch(`${ANDROID_BRIDGE_ORIGIN}/launch-app`, { method: "POST" });
      const launchPayload = await launchResponse.json().catch(function () {
        return {};
      });
      if (!launchResponse.ok || !launchPayload.ok) {
        throw new Error(launchPayload.detail || launchPayload.error || `HTTP ${launchResponse.status}`);
      }

      await waitForAndroidFrame(runId);
      if (runId !== androidRunId || !isAndroidSelected()) {
        return;
      }

      showAndroidPreview();
      setStatus("已获取 Android 摄像头流。", "success");
    } catch (error) {
      if (runId !== androidRunId) {
        return;
      }
      androidLoading = false;
      androidActive = false;
      empty.hidden = false;
      setEmptyState(
        "Android 摄像头连接失败",
        "没有在超时时间内获取到 Android 摄像头画面，可切换到其他摄像头设备。",
        false
      );
      permissionState.textContent = "Android 失败";
      recordingSize.textContent = "未录制";
      setStatus(`Android 摄像头启动失败：${error.message}`, "error");
    } finally {
      if (runId === androidRunId) {
        updateControls();
      }
    }
  }

  async function waitForAndroidFrame(runId) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < ANDROID_TIMEOUT_MS) {
      if (runId !== androidRunId || !isAndroidSelected()) {
        throw new Error("已取消 Android 摄像头连接。");
      }

      try {
        const response = await fetch(`${ANDROID_BRIDGE_ORIGIN}/android-health?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload && payload.hasFrame) {
            return;
          }
        }
      } catch (_error) {
        // Keep polling until timeout; the bridge or Android app may still be starting.
      }

      await delay(ANDROID_POLL_MS);
    }

    throw new Error(`超时 ${Math.round(ANDROID_TIMEOUT_MS / 1000)} 秒，未获取到 Android 摄像头流数据。`);
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
  cameraDevice.addEventListener("change", function () {
    if (isAndroidSelected()) {
      startAndroidCamera();
      return;
    }

    stopStream();
    showLocalPreview();
    resetEmptyForLocal();
    setStatus("已切换到本机摄像头。点击“打开摄像头”开始预览。");
    permissionState.textContent = "未请求";
    updateControls();
  });
  recordAudio.addEventListener("change", function () {
    if (stream) {
      startCamera();
    }
  });
  window.addEventListener("beforeunload", stopStream);

  populateFormats();
  refreshDeviceList();
  updateControls();
})();
