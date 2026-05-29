(function () {
  const input = document.getElementById("audio-input");
  const dropzone = document.getElementById("dropzone");
  const panel = document.getElementById("player-panel");
  const canvas = document.getElementById("waveform");
  const emptyState = document.getElementById("wave-empty");
  const trackSummary = document.getElementById("track-summary");
  const fileMeta = document.getElementById("file-meta");
  const status = document.getElementById("music-status");
  const playToggle = document.getElementById("play-toggle");
  const playIcon = document.getElementById("play-icon");
  const currentTime = document.getElementById("current-time");
  const duration = document.getElementById("duration");
  const trackList = document.getElementById("track-list");
  const exportMixButton = document.getElementById("export-mix");

  const trackColors = ["#1e90ff", "#36c98d", "#f59e0b", "#f97373", "#a78bfa", "#22d3ee"];

  let tracks = [];
  let maxDuration = 0;
  let playhead = 0;
  let animationFrame = 0;
  let playbackContext = null;

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

  function isSupportedSource(file) {
    const extensionPattern = /\.(aac|aif|aiff|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/i;
    return file.type.startsWith("audio/") || file.type.startsWith("video/") || extensionPattern.test(file.name);
  }

  function updateProjectDuration() {
    maxDuration = tracks.length
      ? Math.max.apply(null, tracks.map(function (track) { return track.duration; }))
      : 0;
    duration.textContent = formatTime(maxDuration);
    fileMeta.textContent = tracks.length ? `总时长 ${formatTime(maxDuration)}` : "--";
  }

  function updateTrackAudioProperties(track) {
    const gain = track.muted ? 0 : track.volume;
    track.audio.volume = track.gainNode ? 1 : gain;

    if (track.gainNode) {
      track.gainNode.gain.value = gain;
    }

    if (track.panNode) {
      track.panNode.pan.value = track.pan;
    }
  }

  function ensurePlaybackGraph(track) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    if (!playbackContext) {
      playbackContext = new AudioContext();
    }

    if (track.sourceNode) {
      updateTrackAudioProperties(track);
      return;
    }

    track.sourceNode = playbackContext.createMediaElementSource(track.audio);
    track.gainNode = playbackContext.createGain();
    track.panNode = playbackContext.createStereoPanner ? playbackContext.createStereoPanner() : null;
    track.sourceNode.connect(track.gainNode);
    if (track.panNode) {
      track.gainNode.connect(track.panNode);
      track.panNode.connect(playbackContext.destination);
    } else {
      track.gainNode.connect(playbackContext.destination);
    }
    updateTrackAudioProperties(track);
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

  function updateCanvasHeight() {
    const height = tracks.length ? Math.min(960, Math.max(260, tracks.length * 112)) : 260;
    canvas.style.height = `${height}px`;
    canvas.parentElement.style.minHeight = `${height}px`;
  }

  function getCurrentPlayhead() {
    const activeTrack = tracks.find(function (track) {
      return !track.audio.paused && !track.audio.ended;
    });

    if (activeTrack) {
      return activeTrack.audio.currentTime;
    }

    return playhead;
  }

  function drawWaveform() {
    updateCanvasHeight();
    resizeCanvas();

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const ratio = window.devicePixelRatio || 1;
    const colors = getCanvasColors();
    const trackCount = tracks.length;
    const gap = Math.max(8 * ratio, height * 0.018);
    const trackHeight = trackCount ? (height - gap * (trackCount - 1)) / trackCount : height;
    const current = getCurrentPlayhead();
    const progressX = maxDuration > 0 ? Math.max(0, Math.min(width, width * (current / maxDuration))) : 0;

    context.clearRect(0, 0, width, height);

    if (!trackCount) {
      context.fillStyle = colors.border;
      context.fillRect(0, height / 2, width, 1);
      return;
    }

    tracks.forEach(function (track, trackIndex) {
      const top = trackIndex * (trackHeight + gap);
      const centerY = top + trackHeight / 2;
      const waveformWidth = maxDuration > 0 ? Math.max(1, width * (track.duration / maxDuration)) : width;
      const labelX = 14 * ratio;
      const labelY = top + 22 * ratio;

      context.fillStyle = trackIndex % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)";
      context.fillRect(0, top, width, trackHeight);
      context.fillStyle = colors.border;
      context.fillRect(0, centerY, width, Math.max(1, ratio));

      context.font = `${12 * ratio}px Segoe UI, Microsoft YaHei, sans-serif`;
      context.fillStyle = colors.foreground;
      context.fillText(`Track ${trackIndex + 1}`, labelX, labelY);
      context.fillStyle = colors.muted;
      context.fillText(formatTime(track.duration), labelX, labelY + 17 * ratio);

      if (!track.peaks.length) {
        return;
      }

      const barGap = Math.max(1, Math.floor(waveformWidth / track.peaks.length / 3));
      const barWidth = Math.max(1, Math.floor(waveformWidth / track.peaks.length) - barGap);

      track.peaks.forEach(function (peak, index) {
        const x = Math.floor((index / track.peaks.length) * waveformWidth);
        const barHeight = Math.max(2 * ratio, peak * trackHeight * 0.68);
        const y = centerY - barHeight / 2;

        context.globalAlpha = track.muted || track.volume === 0 ? 0.24 : 0.45 + Math.min(1, track.volume) * 0.55;
        context.fillStyle = x <= progressX ? track.color : colors.muted;
        context.fillRect(x, y, barWidth, barHeight);
        context.globalAlpha = 1;
      });

      if (waveformWidth < width) {
        context.fillStyle = "rgba(0,0,0,0.12)";
        context.fillRect(waveformWidth, top, width - waveformWidth, trackHeight);
      }
    });

    context.fillStyle = colors.foreground;
    context.fillRect(progressX, 0, Math.max(2, ratio), height);
  }

  function updateProgress() {
    playhead = Math.min(maxDuration, getCurrentPlayhead());
    currentTime.textContent = formatTime(playhead);
    drawWaveform();

    if (tracks.some(function (track) { return !track.audio.paused && !track.audio.ended; })) {
      animationFrame = requestAnimationFrame(updateProgress);
      return;
    }

    setPlayIcon(false);
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

  function clearTracks() {
    cancelAnimationFrame(animationFrame);
    tracks.forEach(function (track) {
      track.audio.pause();
      track.audio.removeAttribute("src");
      track.audio.load();
      URL.revokeObjectURL(track.url);
    });
    tracks = [];
    maxDuration = 0;
    playhead = 0;
    trackList.innerHTML = "";
    exportMixButton.disabled = true;
    if (playbackContext) {
      playbackContext.close();
      playbackContext = null;
    }
    setPlayIcon(false);
  }

  function createPropertyControl(options) {
    const label = document.createElement("label");
    label.className = "music-property-control";

    const labelText = document.createElement("span");
    labelText.textContent = options.label;

    const range = document.createElement("input");
    range.type = "range";
    range.min = options.min.toString();
    range.max = options.max.toString();
    range.value = options.value.toString();
    range.setAttribute("aria-label", options.ariaLabel);

    const value = document.createElement("span");
    value.className = "music-property-value";

    function updateValue() {
      const numericValue = Number(range.value);
      value.textContent = options.format
        ? options.format(numericValue)
        : `${numericValue}${options.suffix}`;
      options.onInput(numericValue);
    }

    range.addEventListener("input", updateValue);
    updateValue();
    label.append(labelText, range, value);

    return label;
  }

  function renderTrackControls() {
    trackList.innerHTML = "";

    tracks.forEach(function (track, index) {
      const item = document.createElement("div");
      item.className = "music-track-item";

      const swatch = document.createElement("span");
      swatch.className = "music-track-swatch";
      swatch.style.backgroundColor = track.color;

      const copy = document.createElement("div");
      copy.className = "music-track-copy";

      const name = document.createElement("strong");
      name.textContent = track.file.name;

      const meta = document.createElement("span");
      meta.textContent = `Track ${index + 1} · ${formatBytes(track.file.size)} · ${formatTime(track.duration)}`;

      const controls = document.createElement("div");
      controls.className = "music-track-controls";

      const muteLabel = document.createElement("label");
      muteLabel.className = "music-track-toggle";

      const muteInput = document.createElement("input");
      muteInput.type = "checkbox";
      muteInput.checked = track.muted;
      muteInput.setAttribute("aria-label", `${track.file.name} 静音`);

      const muteText = document.createElement("span");
      muteText.textContent = "静音";

      muteInput.addEventListener("change", function () {
        track.muted = muteInput.checked;
        updateTrackAudioProperties(track);
        drawWaveform();
      });

      muteLabel.append(muteInput, muteText);

      const volumeControl = createPropertyControl({
        label: "音量",
        min: 0,
        max: 150,
        value: Math.round(track.volume * 100),
        suffix: "%",
        ariaLabel: `${track.file.name} 音量`,
        onInput: function (value) {
          track.volume = value / 100;
          updateTrackAudioProperties(track);
          drawWaveform();
        },
      });

      const panControl = createPropertyControl({
        label: "声像",
        min: -100,
        max: 100,
        value: Math.round(track.pan * 100),
        suffix: "",
        ariaLabel: `${track.file.name} 左右声像`,
        format: function (value) {
          if (value === 0) {
            return "居中";
          }
          return value < 0 ? `左 ${Math.abs(value)}` : `右 ${value}`;
        },
        onInput: function (value) {
          track.pan = value / 100;
          updateTrackAudioProperties(track);
        },
      });

      controls.append(muteLabel, volumeControl, panControl);

      copy.append(name, meta);
      copy.append(controls);
      item.append(swatch, copy);
      trackList.append(item);
    });
  }

  async function createTrack(file, index) {
    const audioBuffer = await decodeAudio(file);
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.src = url;
    audio.volume = 1;

    return {
      id: `${Date.now()}-${index}`,
      file: file,
      url: url,
      audio: audio,
      buffer: audioBuffer,
      duration: audioBuffer.duration,
      peaks: buildPeaks(audioBuffer),
      volume: 1,
      muted: false,
      pan: 0,
      sourceNode: null,
      gainNode: null,
      panNode: null,
      color: trackColors[index % trackColors.length],
    };
  }

  function writeString(view, offset, string) {
    for (let index = 0; index < string.length; index += 1) {
      view.setUint8(offset + index, string.charCodeAt(index));
    }
  }

  function encodeWav(audioBuffer) {
    const channelCount = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const sampleCount = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = channelCount * bytesPerSample;
    const buffer = new ArrayBuffer(44 + sampleCount * blockAlign);
    const view = new DataView(buffer);
    const channels = [];

    for (let channel = 0; channel < channelCount; channel += 1) {
      channels.push(audioBuffer.getChannelData(channel));
    }

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + sampleCount * blockAlign, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, "data");
    view.setUint32(40, sampleCount * blockAlign, true);

    let offset = 44;
    for (let index = 0; index < sampleCount; index += 1) {
      for (let channel = 0; channel < channelCount; channel += 1) {
        const sample = Math.max(-1, Math.min(1, channels[channel][index]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += bytesPerSample;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function exportMixedTrack() {
    const mixableTracks = tracks.filter(function (track) {
      return !track.muted && track.volume > 0;
    });

    if (!mixableTracks.length) {
      setStatus("没有可导出的非静音音轨。");
      return;
    }

    const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    if (!OfflineAudioContext) {
      setStatus("当前浏览器不支持离线混音导出。");
      return;
    }

    exportMixButton.disabled = true;
    setStatus("正在混合导出 WAV...");

    try {
      const sampleRate = Math.max.apply(null, mixableTracks.map(function (track) {
        return track.buffer.sampleRate;
      }));
      const renderLength = Math.max(1, Math.ceil(maxDuration * sampleRate));
      const offlineContext = new OfflineAudioContext(2, renderLength, sampleRate);

      mixableTracks.forEach(function (track) {
        const source = offlineContext.createBufferSource();
        const gain = offlineContext.createGain();
        const panner = offlineContext.createStereoPanner ? offlineContext.createStereoPanner() : null;

        source.buffer = track.buffer;
        gain.gain.value = track.volume;
        source.connect(gain);
        if (panner) {
          panner.pan.value = track.pan;
          gain.connect(panner);
          panner.connect(offlineContext.destination);
        } else {
          gain.connect(offlineContext.destination);
        }
        source.start(0);
      });

      const renderedBuffer = await offlineContext.startRendering();
      const wavBlob = encodeWav(renderedBuffer);
      downloadBlob(wavBlob, "wk1995-music-mix.wav");
      setStatus(`已导出混音 WAV：${formatBytes(wavBlob.size)}。`);
    } catch (error) {
      setStatus(error.message || "导出混音失败。");
    } finally {
      exportMixButton.disabled = !tracks.length;
    }
  }

  async function loadFiles(fileList) {
    const files = Array.from(fileList || []).filter(isSupportedSource);

    if (!files.length) {
      setStatus("请选择音频或视频文件。");
      return;
    }

    clearTracks();
    panel.hidden = false;
    emptyState.hidden = false;
    emptyState.textContent = "正在解析音频波形";
    playToggle.disabled = true;
    trackSummary.textContent = `正在加载 ${files.length} 个音轨`;
    fileMeta.textContent = files.map(function (file) { return formatBytes(file.size); }).join(" · ");
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    setStatus("正在读取音频文件...");
    drawWaveform();

    const loadedTracks = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        setStatus(`正在解析第 ${index + 1}/${files.length} 个文件...`);
        loadedTracks.push(await createTrack(files[index], index));
      }

      tracks = loadedTracks;
      trackSummary.textContent = `${tracks.length} 个音轨`;
      updateProjectDuration();
      emptyState.hidden = true;
      playToggle.disabled = false;
      exportMixButton.disabled = false;
      renderTrackControls();
      setStatus("所有音轨波形已生成。");
      drawWaveform();
    } catch (error) {
      loadedTracks.forEach(function (track) {
        track.audio.pause();
        URL.revokeObjectURL(track.url);
      });
      tracks = [];
      emptyState.textContent = "无法解析音频文件";
      setStatus(error.message || "无法解析文件中的音频。");
      playToggle.disabled = true;
      exportMixButton.disabled = true;
      drawWaveform();
    }
  }

  function pauseTracks() {
    tracks.forEach(function (track) {
      track.audio.pause();
    });
    setPlayIcon(false);
    cancelAnimationFrame(animationFrame);
    playhead = getCurrentPlayhead();
    drawWaveform();
  }

  async function playTracks() {
    if (!tracks.length) {
      return;
    }

    if (playhead >= maxDuration) {
      playhead = 0;
    }

    setPlayIcon(true);

    tracks.forEach(ensurePlaybackGraph);

    if (playbackContext && playbackContext.state === "suspended") {
      await playbackContext.resume();
    }

    await Promise.all(
      tracks.map(function (track) {
        track.audio.currentTime = Math.min(playhead, Math.max(0, track.duration - 0.05));

        if (playhead >= track.duration) {
          return Promise.resolve();
        }

        return track.audio.play().catch(function () {
          return undefined;
        });
      })
    );

    cancelAnimationFrame(animationFrame);
    updateProgress();
  }

  input.addEventListener("change", function (event) {
    loadFiles(event.target.files);
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
    loadFiles(event.dataTransfer.files);
  });

  playToggle.addEventListener("click", function () {
    if (tracks.some(function (track) { return !track.audio.paused && !track.audio.ended; })) {
      pauseTracks();
      return;
    }

    playTracks();
  });

  exportMixButton.addEventListener("click", exportMixedTrack);

  canvas.addEventListener("click", function (event) {
    if (!maxDuration) {
      return;
    }

    const wasPlaying = tracks.some(function (track) {
      return !track.audio.paused && !track.audio.ended;
    });
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    playhead = ratio * maxDuration;

    tracks.forEach(function (track) {
      track.audio.currentTime = Math.min(playhead, Math.max(0, track.duration - 0.05));

      if (playhead >= track.duration) {
        track.audio.pause();
        return;
      }

      if (wasPlaying && track.audio.paused) {
        ensurePlaybackGraph(track);
        track.audio.play().catch(function () {
          return undefined;
        });
      }
    });

    currentTime.textContent = formatTime(playhead);
    drawWaveform();
  });

  window.addEventListener("resize", drawWaveform);
  window.addEventListener("wk:language-change", drawWaveform);
  window.addEventListener("beforeunload", clearTracks);

  setPlayIcon(false);
  playToggle.disabled = true;
})();
