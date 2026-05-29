(function () {
  const input = document.getElementById("audio-input");
  const dropzone = document.getElementById("dropzone");
  const panel = document.getElementById("player-panel");
  const player = document.getElementById("audio-player");
  const canvas = document.getElementById("waveform");
  const emptyState = document.getElementById("wave-empty");
  const fileName = document.getElementById("file-name");
  const fileMeta = document.getElementById("file-meta");
  const status = document.getElementById("music-status");
  const playToggle = document.getElementById("play-toggle");
  const playIcon = document.getElementById("play-icon");
  const currentTime = document.getElementById("current-time");
  const duration = document.getElementById("duration");

  let objectUrl = "";
  let peaks = [];
  let audioDuration = 0;
  let animationFrame = 0;

  function setStatus(message) {
    status.textContent = message || "";
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "--";
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

  function setPlayIcon(isPlaying) {
    playToggle.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
    playIcon.innerHTML = isPlaying
      ? '<path d="M7 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Zm10 0a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z"></path>'
      : '<path d="M8 5.8c0-.74.82-1.18 1.43-.77l8.34 5.72a.92.92 0 0 1 0 1.5l-8.34 5.72A.92.92 0 0 1 8 17.2V5.8Z"></path>';
  }

  function getCanvasColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: styles.getPropertyValue("--accent").trim() || "#1e90ff",
      foreground: styles.getPropertyValue("--fg").trim() || "#f2f5ff",
      muted: styles.getPropertyValue("--fg-muted").trim() || "#b0b8cc",
      border: styles.getPropertyValue("--border").trim() || "rgba(255,255,255,0.08)",
    };
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  }

  function drawWaveform() {
    resizeCanvas();

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const colors = getCanvasColors();
    const progress = audioDuration > 0 ? player.currentTime / audioDuration : 0;
    const progressX = Math.max(0, Math.min(width, width * progress));

    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.border;
    context.fillRect(0, centerY, width, 1);

    if (!peaks.length) {
      return;
    }

    const barGap = Math.max(1, Math.floor(width / peaks.length / 3));
    const barWidth = Math.max(1, Math.floor(width / peaks.length) - barGap);

    peaks.forEach(function (peak, index) {
      const x = Math.floor((index / peaks.length) * width);
      const barHeight = Math.max(2, peak * height * 0.88);
      const y = centerY - barHeight / 2;

      context.fillStyle = x <= progressX ? colors.accent : colors.muted;
      context.fillRect(x, y, barWidth, barHeight);
    });

    context.fillStyle = colors.foreground;
    context.fillRect(progressX, 0, Math.max(2, window.devicePixelRatio || 1), height);
  }

  function updateProgress() {
    currentTime.textContent = formatTime(player.currentTime);
    drawWaveform();

    if (!player.paused && !player.ended) {
      animationFrame = requestAnimationFrame(updateProgress);
    }
  }

  function buildPeaks(audioBuffer) {
    const channelCount = audioBuffer.numberOfChannels;
    const sampleCount = audioBuffer.length;
    const displayBars = Math.min(1200, Math.max(240, Math.floor(canvas.getBoundingClientRect().width * 1.5)));
    const blockSize = Math.max(1, Math.floor(sampleCount / displayBars));
    const nextPeaks = [];
    let maxPeak = 0;

    for (let i = 0; i < displayBars; i += 1) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, sampleCount);
      let sum = 0;
      let samples = 0;

      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        for (let j = start; j < end; j += 1) {
          sum += Math.abs(data[j]);
          samples += 1;
        }
      }

      const peak = samples ? sum / samples : 0;
      maxPeak = Math.max(maxPeak, peak);
      nextPeaks.push(peak);
    }

    return nextPeaks.map(function (peak) {
      return maxPeak ? Math.sqrt(peak / maxPeak) : 0;
    });
  }

  async function decodeAudio(file) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      throw new Error("当前浏览器不支持 Web Audio API。");
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext();

    try {
      return await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      audioContext.close();
    }
  }

  async function loadFile(file) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setStatus("请选择音频文件。");
      return;
    }

    panel.hidden = false;
    emptyState.hidden = false;
    playToggle.disabled = true;
    peaks = [];
    audioDuration = 0;
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    fileName.textContent = file.name;
    fileMeta.textContent = formatBytes(file.size);
    setStatus("正在读取音频文件...");
    drawWaveform();

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    objectUrl = URL.createObjectURL(file);
    player.src = objectUrl;
    player.load();

    try {
      const audioBuffer = await decodeAudio(file);
      audioDuration = audioBuffer.duration;
      peaks = buildPeaks(audioBuffer);
      duration.textContent = formatTime(audioDuration);
      fileMeta.textContent = `${formatBytes(file.size)} · ${formatTime(audioDuration)}`;
      emptyState.hidden = true;
      playToggle.disabled = false;
      setStatus("波形已生成。");
      drawWaveform();
    } catch (error) {
      emptyState.textContent = "无法解析该音频文件";
      setStatus(error.message || "无法解析该音频文件。");
      playToggle.disabled = false;
    }
  }

  input.addEventListener("change", function (event) {
    loadFile(event.target.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", function (event) {
    loadFile(event.dataTransfer.files[0]);
  });

  playToggle.addEventListener("click", function () {
    if (!player.src) {
      return;
    }

    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  });

  player.addEventListener("loadedmetadata", function () {
    if (Number.isFinite(player.duration) && player.duration > 0) {
      audioDuration = player.duration;
      duration.textContent = formatTime(player.duration);
    }
  });

  player.addEventListener("play", function () {
    setPlayIcon(true);
    cancelAnimationFrame(animationFrame);
    updateProgress();
  });

  player.addEventListener("pause", function () {
    setPlayIcon(false);
    cancelAnimationFrame(animationFrame);
    drawWaveform();
  });

  player.addEventListener("ended", function () {
    setPlayIcon(false);
    cancelAnimationFrame(animationFrame);
    updateProgress();
  });

  player.addEventListener("timeupdate", function () {
    if (player.paused) {
      updateProgress();
    }
  });

  canvas.addEventListener("click", function (event) {
    if (!audioDuration) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    player.currentTime = ratio * audioDuration;
    updateProgress();
  });

  window.addEventListener("resize", drawWaveform);
  window.addEventListener("wk:language-change", drawWaveform);
  window.addEventListener("beforeunload", function () {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  });

  setPlayIcon(false);
  playToggle.disabled = true;
})();
