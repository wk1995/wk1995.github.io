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
  const exportVideoButton = document.getElementById("export-video");
  const selectModeButton = document.getElementById("select-mode");
  const panModeButton = document.getElementById("pan-mode");
  const zoomControl = document.getElementById("zoom-control");
  const zoomValue = document.getElementById("zoom-value");
  const panControl = document.getElementById("pan-control");
  const panValue = document.getElementById("pan-value");
  const cutSelectionButton = document.getElementById("cut-selection");
  const splitPlayheadButton = document.getElementById("split-playhead");
  const scopeSelectedButton = document.getElementById("scope-selected");
  const scopeAllButton = document.getElementById("scope-all");
  const selectedTrackLabel = document.getElementById("selected-track-label");

  const trackColors = ["#1e90ff", "#36c98d", "#f59e0b", "#f97373", "#a78bfa", "#22d3ee"];

  let tracks = [];
  let maxDuration = 0;
  let playhead = 0;
  let animationFrame = 0;
  let playbackContext = null;
  let zoomLevel = 1;
  let viewStart = 0;
  let editMode = "select";
  let selectionStart = null;
  let selectionEnd = null;
  let dragState = null;
  let selectedTrackId = null;
  let editScope = "selected";

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getVisibleDuration() {
    if (!maxDuration) {
      return 0;
    }

    return maxDuration / zoomLevel;
  }

  function getMaxViewStart() {
    return Math.max(0, maxDuration - getVisibleDuration());
  }

  function clampViewStart(value) {
    return clamp(value, 0, getMaxViewStart());
  }

  function getSelectionRange() {
    if (selectionStart === null || selectionEnd === null) {
      return null;
    }

    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);

    if (end - start < 0.05) {
      return null;
    }

    return {
      start: clamp(start, 0, maxDuration),
      end: clamp(end, 0, maxDuration),
    };
  }

  function getSelectedTrack() {
    return tracks.find(function (track) {
      return track.id === selectedTrackId;
    }) || null;
  }

  function getTargetTracks() {
    if (editScope === "all") {
      return tracks;
    }

    const selectedTrack = getSelectedTrack();
    return selectedTrack ? [selectedTrack] : [];
  }

  function updateScopeButtons() {
    scopeSelectedButton.classList.toggle("is-active", editScope === "selected");
    scopeAllButton.classList.toggle("is-active", editScope === "all");
  }

  function updateEditControls() {
    const maxViewStart = getMaxViewStart();
    const hasTracks = tracks.length > 0;
    const selectedTrack = getSelectedTrack();

    zoomControl.disabled = !hasTracks;
    panControl.disabled = !hasTracks || zoomLevel <= 1;
    splitPlayheadButton.disabled = !hasTracks || (editScope === "selected" && !selectedTrack);
    cutSelectionButton.disabled = !getSelectionRange() || (editScope === "selected" && !selectedTrack);
    zoomControl.value = zoomLevel.toString();
    zoomValue.textContent = `${zoomLevel.toFixed(2)}x`;
    panControl.max = maxViewStart.toFixed(2);
    panControl.step = maxDuration > 60 ? "0.1" : "0.01";
    panControl.value = viewStart.toFixed(2);
    panValue.textContent = formatTime(viewStart);
    selectedTrackLabel.textContent = selectedTrack ? `已选：${selectedTrack.file.name}` : "未选择音轨";
    updateScopeButtons();
  }

  function setEditMode(mode) {
    editMode = mode;
    selectModeButton.classList.toggle("is-active", mode === "select");
    panModeButton.classList.toggle("is-active", mode === "pan");
    canvas.classList.toggle("is-panning", mode === "pan");
  }

  function timeFromCanvasX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return clamp(viewStart + clamp(ratio, 0, 1) * getVisibleDuration(), 0, maxDuration);
  }

  function getTrackIndexFromClientY(clientY) {
    if (!tracks.length) {
      return -1;
    }

    const rect = canvas.getBoundingClientRect();
    const ratio = (window.devicePixelRatio || 1);
    const y = (clientY - rect.top) * ratio;
    const height = canvas.height;
    const rulerHeight = 30 * ratio;
    const trackAreaHeight = Math.max(1, height - rulerHeight);
    const gap = Math.max(8 * ratio, height * 0.018);
    const trackHeight = (trackAreaHeight - gap * (tracks.length - 1)) / tracks.length;

    if (y < rulerHeight) {
      return -1;
    }

    const relativeY = y - rulerHeight;
    const index = Math.floor(relativeY / (trackHeight + gap));
    const trackTop = index * (trackHeight + gap);

    if (index < 0 || index >= tracks.length || relativeY < trackTop || relativeY > trackTop + trackHeight) {
      return -1;
    }

    return index;
  }

  function isSupportedSource(file) {
    const extensionPattern = /\.(aac|aif|aiff|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm)$/i;
    return file.type.startsWith("audio/") || file.type.startsWith("video/") || extensionPattern.test(file.name);
  }

  function updateProjectDuration() {
    maxDuration = tracks.length
      ? Math.max.apply(null, tracks.map(function (track) { return track.duration; }))
      : 0;
    if (maxDuration === 0) {
      zoomLevel = 1;
      viewStart = 0;
      selectionStart = null;
      selectionEnd = null;
      selectedTrackId = null;
    } else {
      if (selectedTrackId && !getSelectedTrack()) {
        selectedTrackId = tracks[0] ? tracks[0].id : null;
      }
      zoomLevel = clamp(zoomLevel, 1, Number(zoomControl.max));
      viewStart = clampViewStart(viewStart);
    }
    duration.textContent = formatTime(maxDuration);
    fileMeta.textContent = tracks.length ? `总时长 ${formatTime(maxDuration)}` : "--";
    updateEditControls();
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
      background: styles.getPropertyValue("--bg").trim() || "#0c1018",
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

  function renderWaveformFrame(targetCanvas, current, options) {
    const frameOptions = options || {};
    const frameViewStart = frameOptions.viewStart === undefined ? viewStart : frameOptions.viewStart;
    const frameVisibleDuration = frameOptions.visibleDuration === undefined
      ? getVisibleDuration()
      : frameOptions.visibleDuration;
    const frameSelection = frameOptions.selection === undefined ? getSelectionRange() : frameOptions.selection;
    const context = targetCanvas.getContext("2d");
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const ratio = targetCanvas === canvas ? window.devicePixelRatio || 1 : Math.max(1, width / 1080);
    const colors = getCanvasColors();
    const trackCount = tracks.length;
    const rulerHeight = 30 * ratio;
    const trackAreaHeight = Math.max(1, height - rulerHeight);
    const gap = Math.max(8 * ratio, height * 0.018);
    const trackHeight = trackCount ? (trackAreaHeight - gap * (trackCount - 1)) / trackCount : trackAreaHeight;
    const progressX = frameVisibleDuration > 0
      ? Math.max(0, Math.min(width, width * ((current - frameViewStart) / frameVisibleDuration)))
      : 0;

    context.fillStyle = colors.background;
    context.fillRect(0, 0, width, height);

    if (!trackCount) {
      context.fillStyle = colors.border;
      context.fillRect(0, height / 2, width, 1);
      return;
    }

    context.fillStyle = "rgba(255,255,255,0.04)";
    context.fillRect(0, 0, width, rulerHeight);
    context.fillStyle = colors.border;
    context.fillRect(0, rulerHeight, width, Math.max(1, ratio));

    const visibleEnd = frameViewStart + frameVisibleDuration;
    const roughTickCount = 8;
    const rawTickStep = frameVisibleDuration / roughTickCount;
    const tickBase = Math.pow(10, Math.floor(Math.log10(Math.max(0.001, rawTickStep))));
    const tickStep = [1, 2, 5, 10].map(function (multiplier) {
      return multiplier * tickBase;
    }).find(function (step) {
      return step >= rawTickStep;
    }) || rawTickStep;
    const firstTick = Math.ceil(frameViewStart / tickStep) * tickStep;

    context.font = `${11 * ratio}px Segoe UI, Microsoft YaHei, sans-serif`;
    for (let tick = firstTick; tick <= visibleEnd; tick += tickStep) {
      const x = ((tick - frameViewStart) / frameVisibleDuration) * width;
      context.fillStyle = colors.border;
      context.fillRect(x, rulerHeight - 10 * ratio, Math.max(1, ratio), 10 * ratio);
      context.fillStyle = colors.muted;
      context.fillText(formatTime(tick), x + 4 * ratio, 18 * ratio);
    }

    tracks.forEach(function (track, trackIndex) {
      const top = rulerHeight + trackIndex * (trackHeight + gap);
      const centerY = top + trackHeight / 2;
      const labelX = 14 * ratio;
      const labelY = top + 22 * ratio;

      context.fillStyle = track.id === selectedTrackId
        ? "rgba(30,144,255,0.12)"
        : trackIndex % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)";
      context.fillRect(0, top, width, trackHeight);
      if (track.id === selectedTrackId) {
        context.strokeStyle = "rgba(30,144,255,0.6)";
        context.lineWidth = Math.max(1, ratio);
        context.strokeRect(0, top, width, trackHeight);
      }
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

      const secondsPerPeak = track.duration / track.peaks.length;
      const barWidth = Math.max(1, Math.ceil(width / Math.max(1, frameVisibleDuration / secondsPerPeak)));

      track.peaks.forEach(function (peak, index) {
        const peakStart = index * secondsPerPeak;
        const peakEnd = peakStart + secondsPerPeak;

        if (peakEnd < frameViewStart || peakStart > visibleEnd) {
          return;
        }

        const x = Math.floor(((peakStart - frameViewStart) / frameVisibleDuration) * width);
        const barHeight = Math.max(2 * ratio, peak * trackHeight * 0.68);
        const y = centerY - barHeight / 2;

        context.globalAlpha = track.muted || track.volume === 0 ? 0.24 : 0.45 + Math.min(1, track.volume) * 0.55;
        context.fillStyle = x <= progressX ? track.color : colors.muted;
        context.fillRect(x, y, barWidth, barHeight);
        context.globalAlpha = 1;
      });

      if (track.duration < visibleEnd) {
        const waveformWidth = Math.max(0, ((track.duration - frameViewStart) / frameVisibleDuration) * width);
        context.fillStyle = "rgba(0,0,0,0.12)";
        context.fillRect(waveformWidth, top, width - waveformWidth, trackHeight);
      }

      if (track.splits && track.splits.length) {
        track.splits.forEach(function (splitTime) {
          if (splitTime < frameViewStart || splitTime > visibleEnd) {
            return;
          }

          const splitX = ((splitTime - frameViewStart) / frameVisibleDuration) * width;
          context.strokeStyle = "rgba(245, 158, 11, 0.9)";
          context.lineWidth = Math.max(1, ratio);
          context.beginPath();
          context.moveTo(splitX, top + 6 * ratio);
          context.lineTo(splitX, top + trackHeight - 6 * ratio);
          context.stroke();
        });
      }
    });

    if (frameSelection) {
      const selectedX = ((frameSelection.start - frameViewStart) / frameVisibleDuration) * width;
      const selectedWidth = ((frameSelection.end - frameSelection.start) / frameVisibleDuration) * width;
      context.fillStyle = "rgba(30, 144, 255, 0.16)";
      context.fillRect(selectedX, rulerHeight, selectedWidth, height - rulerHeight);
      context.strokeStyle = "rgba(30, 144, 255, 0.76)";
      context.lineWidth = Math.max(1, ratio);
      context.strokeRect(selectedX, rulerHeight, selectedWidth, height - rulerHeight);
    }

    context.fillStyle = colors.foreground;
    context.fillRect(progressX, 0, Math.max(2, ratio), height);
  }

  function drawWaveform() {
    updateCanvasHeight();
    resizeCanvas();
    renderWaveformFrame(canvas, getCurrentPlayhead());
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
    zoomLevel = 1;
    viewStart = 0;
    selectionStart = null;
    selectionEnd = null;
    dragState = null;
    selectedTrackId = null;
    editScope = "selected";
    trackList.innerHTML = "";
    exportMixButton.disabled = true;
    exportVideoButton.disabled = true;
    updateEditControls();
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
      item.classList.toggle("is-selected", track.id === selectedTrackId);
      item.addEventListener("click", function () {
        selectedTrackId = track.id;
        updateEditControls();
        renderTrackControls();
        drawWaveform();
      });

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
      splits: [],
      sourceNode: null,
      gainNode: null,
      panNode: null,
      color: trackColors[index % trackColors.length],
    };
  }

  function cutAudioBuffer(audioBuffer, start, end) {
    const sampleRate = audioBuffer.sampleRate;
    const channelCount = audioBuffer.numberOfChannels;
    const startSample = clamp(Math.floor(start * sampleRate), 0, audioBuffer.length);
    const endSample = clamp(Math.floor(end * sampleRate), 0, audioBuffer.length);
    const removedSamples = Math.max(0, endSample - startSample);

    if (!removedSamples) {
      return audioBuffer;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const nextLength = Math.max(1, audioBuffer.length - removedSamples);
    const nextBuffer = audioContext.createBuffer(channelCount, nextLength, sampleRate);

    for (let channel = 0; channel < channelCount; channel += 1) {
      const source = audioBuffer.getChannelData(channel);
      const target = nextBuffer.getChannelData(channel);
      target.set(source.subarray(0, Math.min(startSample, nextLength)), 0);
      if (startSample < nextLength) {
        target.set(source.subarray(endSample), startSample);
      }
    }

    audioContext.close();
    return nextBuffer;
  }

  function resetTrackSourceFromBuffer(track) {
    const wavBlob = encodeWav(track.buffer);
    const nextUrl = URL.createObjectURL(wavBlob);

    track.audio.pause();
    track.audio.removeAttribute("src");
    track.audio.load();
    URL.revokeObjectURL(track.url);

    track.url = nextUrl;
    track.audio = new Audio();
    track.audio.preload = "metadata";
    track.audio.src = nextUrl;
    track.duration = track.buffer.duration;
    track.peaks = buildPeaks(track.buffer);
    track.splits = (track.splits || [])
      .filter(function (splitTime) { return splitTime < track.duration; })
      .map(function (splitTime) { return clamp(splitTime, 0, track.duration); });
    track.sourceNode = null;
    track.gainNode = null;
    track.panNode = null;
    updateTrackAudioProperties(track);
  }

  function cutSelection() {
    const range = getSelectionRange();
    const targetTracks = getTargetTracks();

    if (!range) {
      setStatus("请先在波形区域拖出要剪切的时间选区。");
      return;
    }

    if (!targetTracks.length) {
      setStatus("请先选择一条音轨，或切换为全部音轨。");
      return;
    }

    pauseTracks();
    targetTracks.forEach(function (track) {
      track.buffer = cutAudioBuffer(track.buffer, range.start, range.end);
      track.splits = (track.splits || [])
        .filter(function (splitTime) {
          return splitTime < range.start || splitTime > range.end;
        })
        .map(function (splitTime) {
          return splitTime > range.end ? splitTime - (range.end - range.start) : splitTime;
        });
      resetTrackSourceFromBuffer(track);
    });

    const removedDuration = range.end - range.start;
    playhead = clamp(range.start, 0, Math.max(0, maxDuration - removedDuration));
    selectionStart = null;
    selectionEnd = null;
    updateProjectDuration();
    renderTrackControls();
    setStatus(`已剪切 ${formatTime(removedDuration)} 的选区。`);
    drawWaveform();
  }

  function splitAtPlayhead() {
    const targetTracks = getTargetTracks();

    if (!targetTracks.length) {
      setStatus("请先选择一条音轨，或切换为全部音轨。");
      return;
    }

    targetTracks.forEach(function (track) {
      if (playhead <= 0 || playhead >= track.duration) {
        return;
      }

      const splitTime = Number(playhead.toFixed(2));
      if (!track.splits.some(function (existing) { return Math.abs(existing - splitTime) < 0.03; })) {
        track.splits.push(splitTime);
        track.splits.sort(function (left, right) { return left - right; });
      }
    });

    renderTrackControls();
    updateEditControls();
    setStatus(`已在 ${formatTime(playhead)} 标记分割点。`);
    drawWaveform();
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

  function getSupportedVideoMimeType() {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];

    return types.find(function (type) {
      return MediaRecorder.isTypeSupported(type);
    }) || "";
  }

  async function exportWaveformVideo() {
    if (!tracks.length || !maxDuration) {
      setStatus("没有可导出的视频内容。");
      return;
    }

    if (!window.MediaRecorder || !canvas.captureStream) {
      setStatus("当前浏览器不支持 canvas 视频录制。");
      return;
    }

    const frameRate = 30;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1280;
    exportCanvas.height = Math.min(1080, Math.max(720, tracks.length * 180));
    const stream = exportCanvas.captureStream(frameRate);
    const mimeType = getSupportedVideoMimeType();
    const chunks = [];

    exportMixButton.disabled = true;
    exportVideoButton.disabled = true;
    setStatus("正在导出波形视频，时长与工程时长一致...");

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);
      const finished = new Promise(function (resolve, reject) {
        recorder.addEventListener("dataavailable", function (event) {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        });
        recorder.addEventListener("stop", resolve);
        recorder.addEventListener("error", function (event) {
          reject(event.error || new Error("视频导出失败。"));
        });
      });

      renderWaveformFrame(exportCanvas, 0, {
        viewStart: 0,
        visibleDuration: maxDuration,
        selection: null,
      });
      recorder.start(1000);

      await new Promise(function (resolve) {
        const startedAt = performance.now();

        function render() {
          const elapsed = (performance.now() - startedAt) / 1000;
          const current = Math.min(maxDuration, elapsed);
          renderWaveformFrame(exportCanvas, current, {
            viewStart: 0,
            visibleDuration: maxDuration,
            selection: null,
          });
          setStatus(`正在导出波形视频：${formatTime(current)} / ${formatTime(maxDuration)}`);

          if (current >= maxDuration) {
            resolve();
            return;
          }

          window.requestAnimationFrame(render);
        }

        window.requestAnimationFrame(render);
      });

      recorder.stop();
      await finished;
      stream.getTracks().forEach(function (track) {
        track.stop();
      });

      const videoBlob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      downloadBlob(videoBlob, "wk1995-music-waveform.webm");
      setStatus(`已导出波形视频：${formatBytes(videoBlob.size)}。`);
    } catch (error) {
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
      setStatus(error.message || "导出波形视频失败。");
    } finally {
      exportMixButton.disabled = !tracks.length;
      exportVideoButton.disabled = !tracks.length;
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
    zoomLevel = 1;
    viewStart = 0;
    selectionStart = null;
    selectionEnd = null;
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
      selectedTrackId = tracks[0] ? tracks[0].id : null;
      trackSummary.textContent = `${tracks.length} 个音轨`;
      updateProjectDuration();
      emptyState.hidden = true;
      playToggle.disabled = false;
      exportMixButton.disabled = false;
      exportVideoButton.disabled = false;
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
      exportVideoButton.disabled = true;
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

  function seekTo(time, shouldResume) {
    playhead = clamp(time, 0, maxDuration);

    tracks.forEach(function (track) {
      track.audio.currentTime = Math.min(playhead, Math.max(0, track.duration - 0.05));

      if (playhead >= track.duration) {
        track.audio.pause();
        return;
      }

      if (shouldResume && track.audio.paused) {
        ensurePlaybackGraph(track);
        track.audio.play().catch(function () {
          return undefined;
        });
      }
    });

    currentTime.textContent = formatTime(playhead);
    drawWaveform();
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
  exportVideoButton.addEventListener("click", exportWaveformVideo);
  cutSelectionButton.addEventListener("click", cutSelection);
  splitPlayheadButton.addEventListener("click", splitAtPlayhead);

  scopeSelectedButton.addEventListener("click", function () {
    editScope = "selected";
    updateEditControls();
  });

  scopeAllButton.addEventListener("click", function () {
    editScope = "all";
    updateEditControls();
  });

  selectModeButton.addEventListener("click", function () {
    setEditMode("select");
  });

  panModeButton.addEventListener("click", function () {
    setEditMode("pan");
  });

  zoomControl.addEventListener("input", function () {
    const previousVisibleDuration = getVisibleDuration();
    const center = viewStart + previousVisibleDuration / 2;
    zoomLevel = Number(zoomControl.value);
    viewStart = clampViewStart(center - getVisibleDuration() / 2);
    updateEditControls();
    drawWaveform();
  });

  panControl.addEventListener("input", function () {
    viewStart = clampViewStart(Number(panControl.value));
    updateEditControls();
    drawWaveform();
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (!maxDuration) {
      return;
    }

    const wasPlaying = tracks.some(function (track) {
      return !track.audio.paused && !track.audio.ended;
    });
    const time = timeFromCanvasX(event.clientX);
    const trackIndex = getTrackIndexFromClientY(event.clientY);

    if (trackIndex >= 0) {
      selectedTrackId = tracks[trackIndex].id;
      renderTrackControls();
      updateEditControls();
    }

    dragState = {
      mode: editMode,
      startX: event.clientX,
      startTime: time,
      initialViewStart: viewStart,
      wasPlaying: wasPlaying,
      moved: false,
    };

    if (editMode === "select") {
      selectionStart = time;
      selectionEnd = time;
    }

    canvas.setPointerCapture(event.pointerId);
    drawWaveform();
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!dragState) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const deltaX = event.clientX - dragState.startX;
    dragState.moved = dragState.moved || Math.abs(deltaX) > 3;

    if (dragState.mode === "pan") {
      const secondsPerPixel = getVisibleDuration() / rect.width;
      viewStart = clampViewStart(dragState.initialViewStart - deltaX * secondsPerPixel);
      updateEditControls();
      drawWaveform();
      return;
    }

    selectionEnd = timeFromCanvasX(event.clientX);
    updateEditControls();
    drawWaveform();
  });

  canvas.addEventListener("pointerup", function (event) {
    if (!dragState) {
      return;
    }

    if (dragState.mode === "select" && !dragState.moved) {
      selectionStart = null;
      selectionEnd = null;
      seekTo(dragState.startTime, dragState.wasPlaying);
    }

    updateEditControls();
    dragState = null;
    canvas.releasePointerCapture(event.pointerId);
    drawWaveform();
  });

  canvas.addEventListener("pointercancel", function () {
    dragState = null;
    updateEditControls();
    drawWaveform();
  });

  canvas.addEventListener("wheel", function (event) {
    if (!maxDuration) {
      return;
    }

    event.preventDefault();
    const focusTime = timeFromCanvasX(event.clientX);
    const nextZoom = clamp(zoomLevel * (event.deltaY < 0 ? 1.18 : 0.85), 1, Number(zoomControl.max));
    const rect = canvas.getBoundingClientRect();
    const focusRatio = rect.width > 0 ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0.5;
    zoomLevel = nextZoom;
    viewStart = clampViewStart(focusTime - getVisibleDuration() * focusRatio);
    updateEditControls();
    drawWaveform();
  });

  window.addEventListener("resize", drawWaveform);
  window.addEventListener("wk:language-change", drawWaveform);
  window.addEventListener("beforeunload", clearTracks);

  setPlayIcon(false);
  setEditMode("select");
  updateEditControls();
  playToggle.disabled = true;
})();
