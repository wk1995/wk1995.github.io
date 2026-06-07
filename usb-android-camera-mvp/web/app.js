(function () {
  const stream = document.getElementById("camera-stream");
  const empty = document.getElementById("empty-state");
  const status = document.getElementById("status");
  const launchButton = document.getElementById("launch-button");
  const startButton = document.getElementById("start-button");
  const stopButton = document.getElementById("stop-button");
  const switchButton = document.getElementById("switch-button");
  const snapshotButton = document.getElementById("snapshot-button");

  const BRIDGE_ORIGIN = "http://127.0.0.1:18080";

  function cameraUrl() {
    return `${BRIDGE_ORIGIN}/camera?t=${Date.now()}`;
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function start() {
    empty.classList.remove("is-hidden");
    stream.src = cameraUrl();
    setStatus("正在连接 Android 摄像头视频流...");
  }

  function stop() {
    stream.removeAttribute("src");
    empty.classList.remove("is-hidden");
    setStatus("已停止显示。Android App 可继续推流。");
  }

  async function launchApp() {
    try {
      setStatus("正在通过 ADB 启动 Android App...");
      const response = await fetch(`${BRIDGE_ORIGIN}/launch-app`, { method: "POST" });
      const payload = await response.json().catch(function () {
        return {};
      });
      if (!response.ok || !payload.ok) {
        throw new Error(payload.detail || payload.error || `HTTP ${response.status}`);
      }
      setStatus("Android App 已启动，正在等待推流...");
      window.setTimeout(start, 1200);
    } catch (error) {
      setStatus(`启动失败：${error.message}`, true);
    }
  }

  async function switchCamera() {
    try {
      const response = await fetch(`${BRIDGE_ORIGIN}/switch`, { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus("已请求 Android App 切换前后摄像头。");
      start();
    } catch (error) {
      setStatus(`切换失败：${error.message}`, true);
    }
  }

  function snapshot() {
    const link = document.createElement("a");
    link.href = `${BRIDGE_ORIGIN}/snapshot?t=${Date.now()}`;
    link.download = `android_camera_${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus("已请求保存截图。");
  }

  async function checkBridge() {
    try {
      const response = await fetch(`${BRIDGE_ORIGIN}/health`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus("桥接程序在线。点击开始显示画面。");
    } catch (_error) {
      setStatus("桥接程序未连接。请在 Windows 上运行 bridge/bridge.js。", true);
    }
  }

  stream.addEventListener("load", function () {
    empty.classList.add("is-hidden");
    setStatus("视频流已连接。");
  });

  stream.addEventListener("error", function () {
    empty.classList.remove("is-hidden");
    setStatus("视频流不可用。确认 Android App 已启动推流，ADB forward 已建立。", true);
  });

  startButton.addEventListener("click", start);
  launchButton.addEventListener("click", launchApp);
  stopButton.addEventListener("click", stop);
  switchButton.addEventListener("click", switchCamera);
  snapshotButton.addEventListener("click", snapshot);

  checkBridge();
})();
