// Core state
const state = {
  steps: [],
  currentIndex: -1,
  playing: false,
  timerId: null,
  speed: 1,
  mode: "simple",
};

// DOM references
const els = {};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function initDomRefs() {
  Object.assign(els, {
    messageInput: $("#messageInput"),
    appProtocol: $("#appProtocol"),
    transportProtocol: $("#transportProtocol"),
    speedRange: $("#speedRange"),
    btnPlay: $("#btnPlay"),
    btnPause: $("#btnPause"),
    btnNext: $("#btnNext"),
    btnPrev: $("#btnPrev"),
    btnReset: $("#btnReset"),
    modeButtons: $all(".toggle-btn"),
    presetButtons: $all(".preset-btn"),
    pduStructure: $("#pduStructure"),
    pduMeta: $("#pduMeta"),
    pduToken: $("#pduToken"),
    pduTokenLabel: $("#pduToken .pdu-token-label"),
    pduTokenSub: $("#pduToken .pdu-token-sub"),
    bitsStream: $("#bitsStream"),
    progressFill: $("#progressFill"),
    stepStatus: $("#stepStatus"),
    senderStackLayers: $all('#senderStack .stack-layer'),
    receiverStackLayers: $all('#receiverStack .stack-layer'),
    flowLayerLabels: $all(".flow-layer-label"),
    receiverMessage: $("#receiverMessage"),
    receiverStatus: $("#receiverStatus"),
    statusPills: $all(".status-pill"),
    logContainer: $("#logContainer"),
    btnClearLog: $("#btnClearLog"),
    currentPduLabel: $("#currentPduLabel"),
    modeToggleSimple: document.querySelector('.toggle-btn[data-mode="simple"]'),
    modeToggleAdvanced: document.querySelector('.toggle-btn[data-mode="advanced"]'),
    layerInsightTitle: $("#layerInsightTitle"),
    layerInsightMapping: $("#layerInsightMapping"),
    layerInsightPoints: $("#layerInsightPoints"),
  });
}

// Utility helpers
function randomPort() {
  return Math.floor(1024 + Math.random() * (65535 - 1024));
}

function randomIp() {
  return `${10 + Math.floor(Math.random() * 200)}.${Math.floor(
    Math.random() * 255
  )}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
}

function randomMac() {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0");
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function randomSeq() {
  return Math.floor(Math.random() * 1_000_000);
}

function randomFcs() {
  return Math.floor(Math.random() * 0xffff_ffff)
    .toString(16)
    .padStart(8, "0")
    .toUpperCase();
}

function sampleBits(length = 24) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.random() > 0.5 ? "1" : "0";
  }
  return out;
}

// Layer learning content
const LAYER_LEARN = {
  application: {
    title: "Application Layer (TCP/IP)",
    mapping: "OSI: Application, Presentation, Session (Layers 5–7)",
    points: [
      "Interfaces directly with programs such as web browsers, mail clients, or DNS resolvers.",
      "Chooses the right application protocol (HTTP, HTTPS, FTP, SMTP, DNS, and others).",
      "Defines how messages are formatted so that both ends understand the data.",
    ],
  },
  transport: {
    title: "Transport Layer",
    mapping: "OSI: Transport (Layer 4)",
    points: [
      "Adds source and destination ports so multiple apps can share one IP.",
      "Uses TCP for reliable, ordered delivery or UDP for lightweight, best-effort delivery.",
      "May break data into smaller segments and reassemble them at the receiver.",
    ],
  },
  internet: {
    title: "Internet Layer",
    mapping: "OSI: Network (Layer 3)",
    points: [
      "Adds IP addresses to identify the source and destination hosts.",
      "Routers use this header to choose the next hop across the Internet.",
      "Fields like TTL prevent packets from looping around the network forever.",
    ],
  },
  "data-link": {
    title: "Data Link Layer",
    mapping: "OSI: Data Link (Layer 2)",
    points: [
      "Uses MAC addresses to deliver frames across a single local link or LAN.",
      "Wraps packets in frames and appends a trailer such as an FCS for error checking.",
      "Switches and NICs operate mainly at this layer.",
    ],
  },
  physical: {
    title: "Physical Layer",
    mapping: "OSI: Physical (Layer 1)",
    points: [
      "Turns frames into a stream of bits on a wire, fiber, or through the air.",
      "Defines voltage levels, light pulses, radio frequencies, and connector types.",
      "Bit errors at this layer can cause corrupted frames higher up.",
    ],
  },
};

// Step generation
function buildSteps(message, appProto, transportProto, advanced) {
  const srcPort = randomPort();
  const dstPort = appProto === "HTTP" || appProto === "HTTPS" ? 80 : 53;
  const srcIp = randomIp();
  const dstIp = randomIp();
  const srcMac = randomMac();
  const dstMac = randomMac();
  const seq = randomSeq();
  const ttl = 64;
  const fcs = randomFcs();

  const dataLabel = `"${message}"`;

  const steps = [];
  let idx = 1;

  const push = (layer, side, type, action, pduBefore, pduAfter, meta) => {
    steps.push({
      index: idx++,
      layer,
      side,
      type,
      action,
      pduBefore,
      pduAfter,
      meta,
    });
  };

  // Sender side – encapsulation
  push(
    "application",
    "sender",
    "encapsulation",
    "User entered message at the application layer.",
    "",
    `[Data] ${dataLabel}`,
    `Application protocol: ${appProto}`
  );

  push(
    "application",
    "sender",
    "encapsulation",
    `Application layer prepares data using ${appProto}.`,
    `[Data] ${dataLabel}`,
    `[Data] ${dataLabel}`,
    "No header is added yet; this is still pure user data."
  );

  push(
    "transport",
    "sender",
    "encapsulation",
    `${transportProto} transport header is added, forming a segment.`,
    `[Data] ${dataLabel}`,
    `[${transportProto} Header][Data]`,
    advanced
      ? `Source port: ${srcPort}, Destination port: ${dstPort}, Sequence: ${seq}, Protocol: ${transportProto}`
      : "Ports and reliability information are added to create a segment."
  );

  push(
    "internet",
    "sender",
    "encapsulation",
    "IP header is added, forming a packet.",
    `[${transportProto} Header][Data]`,
    `[IP Header][${transportProto} Header][Data]`,
    advanced
      ? `Source IP: ${srcIp}, Destination IP: ${dstIp}, TTL: ${ttl}, Protocol: ${transportProto}`
      : "Logical IP addresses and routing information are added."
  );

  push(
    "data-link",
    "sender",
    "encapsulation",
    "MAC header and trailer are added, forming a frame.",
    `[IP Header][${transportProto} Header][Data]`,
    `[MAC Header][IP Header][${transportProto} Header][Data][Trailer]`,
    advanced
      ? `Source MAC: ${srcMac}, Destination MAC: ${dstMac}, FCS: ${fcs}`
      : "Physical (MAC) addresses and an error-checking trailer are added."
  );

  push(
    "physical",
    "sender",
    "encapsulation",
    "Frame is converted into a stream of bits for transmission.",
    `[MAC Header][IP Header][${transportProto} Header][Data][Trailer]`,
    "010101... (Bits)",
    "The frame is encoded as electrical, optical, or radio signals."
  );

  // Transmission
  push(
    "physical",
    "network",
    "transmission",
    "Bits travel across the physical medium.",
    "010101... (Bits)",
    "010101... (Bits)",
    "The medium could be copper, fiber, or wireless."
  );

  // Receiver side – decapsulation
  push(
    "physical",
    "receiver",
    "decapsulation",
    "Receiver physical layer senses the incoming bits.",
    "010101... (Bits)",
    "010101... (Bits)",
    "Signals are converted back into a digital bitstream."
  );

  push(
    "data-link",
    "receiver",
    "decapsulation",
    "Data link layer reconstructs the frame and checks FCS.",
    "010101... (Bits)",
    `[MAC Header][IP Header][${transportProto} Header][Data][Trailer]`,
    advanced
      ? `Verifying FCS (${fcs}) and confirming destination MAC ${dstMac}.`
      : "If the frame is valid and addressed here, it is accepted."
  );

  push(
    "data-link",
    "receiver",
    "decapsulation",
    "Data link header and trailer are removed; packet is passed up.",
    `[MAC Header][IP Header][${transportProto} Header][Data][Trailer]`,
    `[IP Header][${transportProto} Header][Data]`,
    "Only the network-layer packet is forwarded."
  );

  push(
    "internet",
    "receiver",
    "decapsulation",
    "Internet layer removes IP header, revealing the segment.",
    `[IP Header][${transportProto} Header][Data]`,
    `[${transportProto} Header][Data]`,
    advanced
      ? `Checks destination IP ${dstIp} and decrements TTL (${ttl} → ${ttl - 1}).`
      : "The packet is confirmed for this host and the IP header is removed."
  );

  push(
    "transport",
    "receiver",
    "decapsulation",
    `${transportProto} header is removed; data is reassembled for the application.`,
    `[${transportProto} Header][Data]`,
    `[Data] ${dataLabel}`,
    advanced
      ? `Ports (${srcPort} → ${dstPort}) and sequence ${seq} are used to deliver data to the correct socket.`
      : "Ports and reliability features ensure the right app receives the data."
  );

  push(
    "application",
    "receiver",
    "decapsulation",
    "Application layer presents the original message to the user.",
    `[Data] ${dataLabel}`,
    `[Data] ${dataLabel}`,
    `Original message reconstructed using ${appProto}.`
  );

  return steps;
}

// Rendering functions
function clearAnimations() {
  els.pduToken.classList.remove("pdu-token--encap", "pdu-token--decap", "pdu-token--across");
}

function setLayerHighlights(layerKey, side) {
  $all(".stack-layer").forEach((el) => el.classList.remove("active"));
  els.flowLayerLabels.forEach((el) => el.classList.remove("active"));

  if (!layerKey) return;

  if (side === "sender" || side === "receiver") {
    const stackSelector =
      side === "sender" ? '#senderStack .stack-layer' : '#receiverStack .stack-layer';
    $all(stackSelector).forEach((el) => {
      if (el.dataset.layer === layerKey) el.classList.add("active");
    });
  } else {
    // network/transmission: highlight physical both ends
    ["sender", "receiver"].forEach((s) => {
      $all(`#${s}Stack .stack-layer`).forEach((el) => {
        if (el.dataset.layer === "physical") el.classList.add("active");
      });
    });
  }

  els.flowLayerLabels.forEach((el) => {
    if (el.dataset.layer === layerKey) el.classList.add("active");
  });
}

function renderPduBlocks(step) {
  const container = els.pduStructure;
  container.innerHTML = "";

  const parts = [];

  if (step.pduAfter.includes("MAC Header")) {
    parts.push({ label: "MAC Header", cls: "pdu-block--datalink" });
  }
  if (step.pduAfter.includes("IP Header")) {
    parts.push({ label: "IP Header", cls: "pdu-block--internet" });
  }
  if (step.pduAfter.includes("TCP") || step.pduAfter.includes("UDP")) {
    parts.push({ label: `${els.transportProtocol.value} Header`, cls: "pdu-block--transport" });
  } else if (step.pduAfter.includes("Header]") && step.layer === "transport") {
    parts.push({
      label: `${els.transportProtocol.value} Header`,
      cls: "pdu-block--transport",
    });
  }

  if (step.pduAfter.includes("Data")) {
    parts.push({ label: "Data", cls: "pdu-block--data" });
  }
  if (step.pduAfter.includes("Trailer")) {
    parts.push({ label: "Trailer", cls: "pdu-block--trailer" });
  }
  if (step.layer === "physical" || step.pduAfter.includes("Bits")) {
    parts.length = 0;
    parts.push({ label: "Bits", cls: "pdu-block--bits" });
  }

  if (parts.length === 0) {
    parts.push({ label: "Data", cls: "pdu-block--data" });
  }

  parts.forEach((p) => {
    const div = document.createElement("div");
    div.className = `pdu-block ${p.cls}`;
    div.textContent = p.label;
    container.appendChild(div);
  });
}

function renderMeta(step) {
  const before = step.pduBefore || "N/A";
  const after = step.pduAfter || "N/A";
  const meta = step.meta || "";
  els.pduMeta.innerHTML = `<div><strong>Before:</strong> ${before}</div>
    <div><strong>After:</strong> ${after}</div>
    <div style="margin-top:4px;">${meta}</div>`;
}

function renderLayerInsight(step) {
  const info = LAYER_LEARN[step.layer];
  if (!info) {
    els.layerInsightTitle.textContent = "No layer selected";
    els.layerInsightMapping.textContent =
      "Click Play or select a layer from the stack to see more details.";
    els.layerInsightPoints.innerHTML = "";
    return;
  }

  els.layerInsightTitle.textContent = info.title;
  els.layerInsightMapping.textContent = info.mapping;
  els.layerInsightPoints.innerHTML = "";
  info.points.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    els.layerInsightPoints.appendChild(li);
  });
}

function setReceiverStatus(status) {
  const map = {
    waiting: "Waiting",
    receiving: "Receiving",
    processing: "Processing",
    delivered: "Delivered",
  };
  els.receiverStatus.textContent = map[status] || "Waiting";
  els.statusPills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.status === status);
  });
}

function logStep(step) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.dataset.step = `#${step.index}`;
  const layerLabel = step.layer.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  entry.innerHTML = `
    <div class="log-entry-layer">${layerLabel} &mdash; ${step.type}</div>
    <div class="log-entry-action">${step.action}</div>
    <div class="log-entry-meta"><strong>PDU:</strong> ${step.pduAfter}</div>
  `;

  els.logContainer.appendChild(entry);
  els.logContainer.scrollTop = els.logContainer.scrollHeight;
}

function resetLog() {
  els.logContainer.innerHTML = "";
}

function renderStep(index, options = { log: true }) {
  if (!state.steps.length || index < 0 || index >= state.steps.length) return;

  state.currentIndex = index;
  const step = state.steps[index];

  clearAnimations();

  // PDU token positioning and styling based on side/type
  if (step.side === "sender") {
    els.pduToken.style.top = "16%";
    els.pduToken.style.left = "50%";
    els.pduTokenSub.textContent = "Sender";
    els.pduToken.classList.add("pdu-token--encap");
  } else if (step.side === "receiver") {
    els.pduToken.style.top = "84%";
    els.pduToken.style.left = "50%";
    els.pduTokenSub.textContent = "Receiver";
    els.pduToken.classList.add("pdu-token--decap");
  } else if (step.side === "network") {
    els.pduToken.style.top = "50%";
    els.pduToken.style.left = "10%";
    els.pduTokenSub.textContent = "On the wire";
    els.pduToken.classList.add("pdu-token--across");
  }

  els.pduTokenLabel.textContent =
    step.layer === "physical" || step.pduAfter.includes("Bits")
      ? "Bits"
      : step.layer === "data-link"
      ? "Frame"
      : step.layer === "internet"
      ? "Packet"
      : step.layer === "transport"
      ? "Segment"
      : "Data";

  els.currentPduLabel.textContent = els.pduTokenLabel.textContent;

  if (step.layer === "physical") {
    els.bitsStream.classList.add("visible");
    els.bitsStream.querySelector("span").textContent = sampleBits(48);
  } else {
    els.bitsStream.classList.remove("visible");
  }

  setLayerHighlights(step.layer, step.side);
  renderPduBlocks(step);
  renderMeta(step);
  renderLayerInsight(step);

  els.stepStatus.textContent = `Step ${step.index} / ${state.steps.length} — ${step.action}`;
  const progress = (step.index / state.steps.length) * 100;
  els.progressFill.style.width = `${progress}%`;

  if (options.log) {
    logStep(step);
  }

  // Receiver status & message
  if (step.side === "network") {
    setReceiverStatus("receiving");
  } else if (step.side === "receiver") {
    setReceiverStatus("processing");
  }

  if (step.layer === "application" && step.side === "receiver") {
    setReceiverStatus("delivered");
    const original = state.steps[0]?.pduAfter || "";
    const msgMatch = original.match(/"(.*)"/);
    const msg = msgMatch ? msgMatch[1] : "Unknown message";
    els.receiverMessage.textContent = msg;
    els.receiverMessage.classList.add("delivered");
  } else if (index === 0) {
    els.receiverMessage.textContent = "No message received yet.";
    els.receiverMessage.classList.remove("delivered");
  }
}

function stopPlayback() {
  state.playing = false;
  if (state.timerId !== null) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
}

function scheduleNext() {
  if (!state.playing) return;
  const delay = state.speed === 0 ? 1300 : state.speed === 1 ? 800 : 400;

  state.timerId = setTimeout(() => {
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.steps.length) {
      renderStep(nextIndex);
      scheduleNext();
    } else {
      stopPlayback();
    }
  }, delay);
}

// Controls
function handlePlay() {
  if (!state.steps.length) {
    prepareSimulation();
  }
  if (!state.steps.length) return;
  state.playing = true;
  if (state.currentIndex < 0 || state.currentIndex >= state.steps.length - 1) {
    resetLog();
    renderStep(0);
  }
  scheduleNext();
}

function handlePause() {
  stopPlayback();
}

function handleNext() {
  stopPlayback();
  if (!state.steps.length) {
    prepareSimulation();
  }
  if (!state.steps.length) return;
  const next = Math.min(state.currentIndex + 1, state.steps.length - 1);
  renderStep(next);
}

function handlePrev() {
  stopPlayback();
  if (!state.steps.length) return;
  const prev = Math.max(state.currentIndex - 1, 0);
  renderStep(prev, { log: false });
}

function handleReset() {
  stopPlayback();
  state.steps = [];
  state.currentIndex = -1;
  resetLog();
  setLayerHighlights(null, null);
  clearAnimations();
  els.bitsStream.classList.remove("visible");
  els.receiverMessage.textContent = "No message received yet.";
  els.receiverMessage.classList.remove("delivered");
  setReceiverStatus("waiting");
  els.pduStructure.innerHTML = '<div class="pdu-block pdu-block--data">Data</div>';
  els.pduMeta.textContent = "";
  els.pduTokenLabel.textContent = "Data";
  els.pduTokenSub.textContent = "Sender";
  els.pduToken.style.top = "16%";
  els.pduToken.style.left = "50%";
  els.currentPduLabel.textContent = "Data";
  els.stepStatus.textContent = "Step 0 / 0 — Ready";
  els.progressFill.style.width = "0%";
  els.layerInsightTitle.textContent = "No layer selected yet";
  els.layerInsightMapping.textContent =
    "Click Play or a layer in the stack to see how it maps between TCP/IP and OSI.";
  els.layerInsightPoints.innerHTML = "";
}

function handleSpeedChange() {
  const v = Number(els.speedRange.value);
  state.speed = v;
}

function handlePresetClick(e) {
  const msg = e.currentTarget.dataset.preset;
  els.messageInput.value = msg;
}

function handleModeToggle(e) {
  const btn = e.currentTarget;
  const mode = btn.dataset.mode;
  state.mode = mode;
  els.modeButtons.forEach((b) => b.classList.toggle("active", b === btn));
  if (state.steps.length) {
    // rebuild steps keeping current message and protocols
    const message = els.messageInput.value.trim() || "Hello, Server!";
    state.steps = buildSteps(
      message,
      els.appProtocol.value,
      els.transportProtocol.value,
      state.mode === "advanced"
    );
    handleReset();
  }
}

function prepareSimulation() {
  const message = els.messageInput.value.trim() || "Hello, Server!";
  const appProto = els.appProtocol.value;
  const transportProto = els.transportProtocol.value;
  const advanced = state.mode === "advanced";

  handleReset();
  state.steps = buildSteps(message, appProto, transportProto, advanced);
}

function initEvents() {
  els.btnPlay.addEventListener("click", handlePlay);
  els.btnPause.addEventListener("click", handlePause);
  els.btnNext.addEventListener("click", handleNext);
  els.btnPrev.addEventListener("click", handlePrev);
  els.btnReset.addEventListener("click", handleReset);
  els.speedRange.addEventListener("input", handleSpeedChange);
  els.presetButtons.forEach((btn) => btn.addEventListener("click", handlePresetClick));
  els.modeButtons.forEach((btn) => btn.addEventListener("click", handleModeToggle));
  els.btnClearLog.addEventListener("click", resetLog);

  // Click on layers to jump to nearest step for that layer (teaching aid)
  $all(".stack-layer").forEach((layerEl) => {
    layerEl.addEventListener("click", () => {
      if (!state.steps.length) return;
      const layer = layerEl.dataset.layer;
      const side = layerEl.dataset.side;
      const match = state.steps.find(
        (s) => s.layer === layer && (side ? s.side === side : true)
      );
      if (match) {
        renderStep(match.index - 1);
      }
    });
  });
}

function init() {
  initDomRefs();
  initEvents();
  handleReset();
}

document.addEventListener("DOMContentLoaded", init);

