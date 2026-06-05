import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const ALL_DAYS = DAYS.map((d) => d.value);
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const CAMERA_OPTIONS = [
  { value: "hero10", label: "HERO10 Black" },
  { value: "hero11", label: "HERO11 Black" },
  { value: "hero11mini", label: "HERO11 Black Mini" },
  { value: "hero12", label: "HERO12 Black" },
  { value: "hero13", label: "HERO13 Black" },
];

const ALL_CAMERAS = ["hero10", "hero11", "hero11mini", "hero12", "hero13"];

const LENS_OPTIONS = [
  { value: "",   label: "Not set", compatible: ALL_CAMERAS },

  // Photo / timelapse lenses only
  { value: "fN", label: "Narrow", compatible: ["hero10"] },
  { value: "fW", label: "Wide", compatible: ALL_CAMERAS },
  { value: "fL", label: "Linear", compatible: ALL_CAMERAS },
];

const RESET_OPTIONS = [
  { value: "metadata", label: "Reset Labs metadata + reboot" },
  { value: "presets",  label: "Reset presets" },
  { value: "wifi",     label: "Reset Wi-Fi credentials" },
  { value: "factory",  label: "Factory reset" },
  { value: "format",   label: "Format SD card" },
];

const RESET_INFO = {
  metadata: {
    title: "Reset Labs metadata + reboot",
    text: "Clears permanent GoPro Labs features/metadata only (BOOT). Normal camera settings are not affected and media is untouched.",
  },
  presets: {
    title: "Reset presets",
    text: "Resets all camera presets to their default values and removes any custom presets.",
  },
  wifi: {
    title: "Reset Wi‑Fi / connections",
    text: "Resets wireless connections and paired-device connection state back to default settings.",
  },
  factory: {
    title: "Factory reset",
    text: "Resets the camera to out-of-box settings, but keeps permanent GoPro Labs features/metadata (BOOT) and the currently installed firmware version.",
  },
  format: {
    title: "Format SD card",
    text: "Deletes all files from the SD card. Any saved script files stored on the SD card will be removed so you will need to re-upload the SCHEDULE.",
  },
};

const QUICK_TOOL_GROUPS = [
  {
    label: "Upload",
    options: [
      { value: "__upload_now__", label: "Upload now" },
    ],
  },
  {
    label: "Beeps",
    options: [
      { value: "oV0", label: "Muted (oV0)" },
      { value: "oV1", label: "10% volume (oV1)" },
      { value: "oV3", label: "30% volume (oV3)" },
      { value: "oV7", label: "70% volume (oV7)" },
      { value: "oV9", label: "100% volume (oV9)" },
    ],
  },
  {
    label: "Rear LCD Brightness",
    options: [
      { value: "oB0", label: "0% brightness (oB0)" },
      { value: "oB1", label: "10% brightness (oB1)" },
      { value: "oB4", label: "40% brightness (oB4)" },
      { value: "oB7", label: "70% brightness (oB7)" },
      { value: "oB9", label: "100% brightness (oB9)" },
    ],
  },
  {
    label: "Screen Saver",
    options: [
      { value: "oS1", label: "Off in 1 minute (oS1)" },
    ],
  },
  {
    label: "Front LCD",
    options: [
      { value: "oF0", label: "Off (oF0)" },
      { value: "oFU", label: "UI info only (oFU)" },
      { value: "oFF", label: "Full image (oFF)" },
      { value: "oFC", label: "Cropped image (oFC)" },
      { value: "oFN", label: "Never turn off (oFN)" },
      { value: "oFM", label: "Match rear screen (oFM)" },
      { value: "oF1", label: "Off in 1 minute (oF1)" },
      { value: "oF2", label: "Off in 2 minutes (oF2)" },
      { value: "oF3", label: "Off in 3 minutes (oF3)" },
      { value: "oF5", label: "Off in 5 minutes (oF5)" },
    ],
  },
  {
    label: "Voice Commands",
    options: [
      { value: "v0", label: "Off (v0)" },
    ],
  },
  {
    label: "LEDs",
    options: [
      { value: "oD0", label: "All LEDs off (oD0)" },
    ],
  },
];


// ─── Pure utilities ───────────────────────────────────────────────────────────

function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m + minutes, 0, 0);
  return d.toTimeString().slice(0, 5);
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function isHero13(cameraModel) {
  return cameraModel === "hero13";
}

function buildHero13AlignedRepeat(interval) {
  const hours = Math.floor(interval / 60);
  const minutes = interval % 60;
  return `!${pad2(hours)};${pad2(minutes)}R`;
}

function buildRelativeRepeat(interval, manualDriftSeconds) {
  const totalSeconds = Math.max(1, interval * 60 - Number(manualDriftSeconds || 0));
  return `!${totalSeconds}RQ`;
}

function buildCalculatedBoundaryRepeat(interval) {
  // Assumes a short post-capture pause happened first (e.g. !2N),
  // so we are never exactly on a slot boundary at :00.
  return [
    `=At:N`,
    `=A%${interval}`,
    `=Bt:S`,
    `=C${interval}`,
    `=C-A`,
    `=C*60`,
    `=C-B`,
    `!$CR`,
  ].join("");
}

function buildIntervalRepeat(cameraModel, interval, manualDriftSeconds) {
  if (isHero13(cameraModel)) {
    return buildHero13AlignedRepeat(interval);
  }

  if (interval >= 60) {
    return buildRelativeRepeat(interval, manualDriftSeconds);
  }

  return buildCalculatedBoundaryRepeat(interval);
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
// Navigation
  const [page, setPage] = useState("boot"); // boot | schedule | quickTools | reset

  // Camera selection
  const [cameraModel, setCameraModel] = useState("hero13");

  // Schedule settings
  const [days, setDays] = useState(ALL_DAYS);
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [interval, setInterval] = useState(20);
  const [enforcePhotoMode, setEnforcePhotoMode] = useState(true);
  const [lens, setLens] = useState("fW");
  const [manualDriftSeconds, setManualDriftSeconds] = useState(2);

  // Upload settings
  const [upload, setUpload] = useState(true);
  const [uploadTime, setUploadTime] = useState("19:05");
  const [uploadTimeout, setUploadTimeout] = useState("");

  // Boot settings
  const [gpsSync, setGpsSync] = useState(true);
  const [enableTusb, setEnableTusb] = useState(true);
  const [enableFast, setEnableFast] = useState(true);
  const [setDefaultPhotoMode, setSetDefaultPhotoMode] = useState(true);
  const [loadScheduleOnBoot, setLoadScheduleOnBoot] = useState(true);

  // Quick tools
  const [quickToolCommand, setQuickToolCommand] = useState("__upload_now__");
  const [quickToolPermanent, setQuickToolPermanent] = useState(false);
  const [quickToolUploadTimeout, setQuickToolUploadTimeout] = useState("");

  // Reset settings
  const [resetType, setResetType] = useState("metadata");

  // Responsive layout
  const [isMobile, setIsMobile] = useState(false);

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const media = window.matchMedia("(max-width: 480px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    } else {
      media.addListener(update);
      return () => media.removeListener(update);
    }
  }, []);

  // Keep upload time at least 5 minutes after end time
  useEffect(() => {
    if (!upload) return;
    const minimumUploadTime = addMinutes(end, 5);
    const minimumUploadMinutes = timeToMinutes(minimumUploadTime);
    const uploadMinutes = timeToMinutes(uploadTime);
    if (!uploadTime || uploadMinutes < minimumUploadMinutes) {
      setUploadTime(minimumUploadTime);
    }
  }, [end, upload, uploadTime]);

  // If quick tool is upload, force it to be one-shot (not permanent)
  function isQuickToolUpload() {
    return quickToolCommand === "__upload_now__";
  }

  function quickToolSupportsPermanent() {
    return !isQuickToolUpload();
  }
  
  const filteredLensOptions = LENS_OPTIONS.filter((option) =>
    option.compatible.includes(cameraModel)
  );

  useEffect(() => {
    const allowedValues = LENS_OPTIONS
      .filter((option) => option.compatible.includes(cameraModel))
      .map((option) => option.value);

    if (!allowedValues.includes(lens)) {
      setLens("fW");
    }
  }, [cameraModel, lens]);

  // ─── Event handlers ────────────────────────────────────────────────────────

  function toggleDay(day) {
    setDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort()
    );
  }

  // ─── Script builders ───────────────────────────────────────────────────────

  function buildDayFilter() {
    if (days.length === 7) return "";
    const sorted = [...days].sort();
    const isWeekdays = JSON.stringify(sorted) === JSON.stringify(WEEKDAYS);
    if (isWeekdays) return "=Tt:W=T%6>T1>";
    const conditions = sorted.map((d) => `T==${d}`).join("|");
    return `=Tt:W=(${conditions})>`;
  }

  function buildCaptureCommands() {
    let script = "";

    if (enforcePhotoMode) script += `+mP`;
    if (lens) script += `+${lens}`;

    script += `+!S+!2N`;

    return script;
  }

  function generateBootScript() {
    let script = "";

    if (enableTusb) script += "*TUSB=1";
    if (enableFast) script += "*FAST=1";
    if (setDefaultPhotoMode) script += "dP";
    if (gpsSync) script += "*SYNC=1";
    if (loadScheduleOnBoot) script += '*BOOT="!Lsch"';

    return script;
  }

  function generateScheduleScript() {
    const wakeTime = addMinutes(start, -1);
    const stopTime = addMinutes(end, 1);
    const dayFilter = buildDayFilter();
    const captureCommands = buildCaptureCommands();
    const repeatCommands = buildIntervalRepeat(cameraModel, interval, manualDriftSeconds);

    let script = `!SAVEsch=>${wakeTime}<${stopTime}+`;
    if (dayFilter) script += dayFilter;

    script += `!1N`;
    script += captureCommands;
    script += repeatCommands;

    if (upload) {
      const timeoutSuffix = uploadTimeout ? String(uploadTimeout) : "";
      script += `~!${uploadTime}U${timeoutSuffix}+!${start}R`;
    } else {
      script += `~!${start}R`;
    }

    return script;
  }

  function generateQuickToolScript() {
    if (quickToolCommand === "__upload_now__") {
      const timeoutSuffix = quickToolUploadTimeout ? String(quickToolUploadTimeout) : "";
      return `!5U${timeoutSuffix}`;
    }

    if (quickToolSupportsPermanent()) {
      return quickToolPermanent
        ? `*${quickToolCommand}`
        : quickToolCommand;
    }

    return quickToolCommand;
  }

  function generateResetScript() {
    const map = {
      metadata: "!RESET!1OR",
      presets:  "!PRESET",
      wifi:     "!WRESET",
      factory:  "!FRESET",
      format:   "!FORMAT",
    };
    return map[resetType] ?? "!RESET!1OR";
  }

  function generateScript() {
    if (page === "boot")       return generateBootScript();
    if (page === "schedule")   return generateScheduleScript();
    if (page === "quickTools") return generateQuickToolScript();
    return generateResetScript();
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const fieldGrid = {
    ...styles.field,
    gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",
  };

  function renderBootControls() {
    return (
      <>
        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={enableTusb}
              onChange={(e) => setEnableTusb(e.target.checked)}
            />{" "}
            Enable USB Power Support
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={enableFast}
              onChange={(e) => setEnableFast(e.target.checked)}
            />{" "}
            Enable Fast Boot
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={gpsSync}
              onChange={(e) => setGpsSync(e.target.checked)}
            />{" "}
            Enable GPS clock sync
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={setDefaultPhotoMode}
              onChange={(e) => setSetDefaultPhotoMode(e.target.checked)}
            />{" "}
            Set default Photo Mode (dP)
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={loadScheduleOnBoot}
              onChange={(e) => setLoadScheduleOnBoot(e.target.checked)}
            />{" "}
            Auto-load saved schedule on boot (*BOOT="!Lsch")
          </label>
        </div>

        <div style={styles.note}>
          BOOT only programs the persistent startup behavior.
          It does <strong>not</strong> save the schedule body.
        </div>
      </>
    );
  }

  function renderScheduleControls() {
    return (
      <>
        {/* Days of week */}
        <div style={{ ...styles.field, gridTemplateColumns: "1fr" }}>
          <label style={styles.label}>Days of Week</label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {DAYS.map((d) => (
              <label key={d.value} style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={days.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />{" "}
                {d.label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button style={styles.tab} onClick={() => setDays(WEEKDAYS)}>Weekdays</button>
            <button style={styles.tab} onClick={() => setDays(WEEKEND)}>Weekend</button>
            <button style={styles.tab} onClick={() => setDays(ALL_DAYS)}>All days</button>
          </div>
        </div>

        {/* Time range */}
        <div style={fieldGrid}>
          <label style={styles.label}>Start Time</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={styles.timeInput} />
        </div>

        <div style={fieldGrid}>
          <label style={styles.label}>End Time</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={styles.timeInput} />
        </div>

        <div style={fieldGrid}>
          <label style={styles.label}>Interval (minutes)</label>
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            style={styles.input}
          />
        </div>

        {cameraModel !== "hero13" && interval >= 60 && (
          <div style={fieldGrid}>
            <label style={styles.label}>Drift Compensation (sec)</label>
            <input
              type="number"
              min="0"
              value={manualDriftSeconds}
              onChange={(e) => setManualDriftSeconds(Number(e.target.value))}
              style={styles.input}
            />
          </div>
        )}

        <div style={styles.note}>
          {cameraModel === "hero13" ? (
            <>Using HERO13 clock-aligned timing.</>
          ) : interval >= 60 ? (
            <>Using simple repeat timing with optional drift compensation.</>
          ) : (
            <>Using calculated next-boundary timing for better sub-hour alignment.</>
          )}
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={enforcePhotoMode}
              onChange={(e) => setEnforcePhotoMode(e.target.checked)}
            />{" "}
            Enforce Photo Mode (mP)
          </label>
        </div>

        {/* Lens */}
        <div style={fieldGrid}>
          <label style={styles.label}>Photo Lens / FOV</label>
          <select value={lens} onChange={(e) => setLens(e.target.value)} style={styles.select}>
            {filteredLensOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload */}
        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={upload} onChange={(e) => setUpload(e.target.checked)} />{" "}
            Enable upload
          </label>
        </div>

        {upload && (
          <>
            <div style={fieldGrid}>
              <label style={styles.label}>Upload Time</label>
              <input type="time" value={uploadTime} onChange={(e) => setUploadTime(e.target.value)} style={styles.timeInput} />
            </div>

            <div style={fieldGrid}>
              <label style={styles.label}>Upload Timeout (minutes)</label>
              <input type="number" min="1" value={uploadTimeout} onChange={(e) => setUploadTimeout(e.target.value)} style={styles.input} />
            </div>
          </>
        )}

        <div style={styles.note}>
          SCHEDULE saves the script into <code>sch</code> using <code>!SAVEsch=...</code>.
        </div>
      </>
    );
  }

  function renderQuickToolsControls() {
    return (
      <>
        <div style={fieldGrid}>
          <label style={styles.label}>Quick command</label>
          <select
            value={quickToolCommand}
            onChange={(e) => setQuickToolCommand(e.target.value)}
            style={styles.select}
          >
            {QUICK_TOOL_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {isQuickToolUpload() && (
          <div style={fieldGrid}>
            <label style={styles.label}>Upload Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={quickToolUploadTimeout}
              onChange={(e) => setQuickToolUploadTimeout(e.target.value)}
              style={styles.input}
            />
          </div>
        )}

        {!isQuickToolUpload() && quickToolSupportsPermanent() && (
          <div style={styles.checkboxRow}>
            <label>
              <input
                type="checkbox"
                checked={quickToolPermanent}
                onChange={(e) => setQuickToolPermanent(e.target.checked)}
              />{" "}
              Make command permanent
            </label>
          </div>
        )}

        <div style={styles.note}>
          {isQuickToolUpload() ? (
            <>
              This generates a one-shot upload QR.
              <br />
              It is executed once and is not saved permanently.
            </>
          ) : (
            <>
              This page generates a single utility QR command.
              <br />
              <strong>Unchecked</strong>: execute once only
              <br />
              <strong>Checked</strong>: save as permanent metadata-style command
            </>
          )}
        </div>
      </>
    );
  } 

  function renderResetControls() {
    const resetInfo = RESET_INFO[resetType] ?? RESET_INFO.metadata;
    return (
      <>
        <div style={fieldGrid}>
          <label style={styles.label}>Reset Type</label>
          <select value={resetType} onChange={(e) => setResetType(e.target.value)} style={styles.select}>
            {RESET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.note}>
          <strong>{resetInfo.title}</strong>
          <div style={{ marginTop: 6 }}>{resetInfo.text}</div>
          {(resetType === "factory" || resetType === "format") && (
            <div style={{ marginTop: 10, color: "#8b0000", fontWeight: 600 }}>
              Warning: this option is destructive.
            </div>
          )}
        </div>
      </>
    );
  }

  function renderPageControls() {
    if (page === "boot")       return renderBootControls();
    if (page === "schedule")   return renderScheduleControls();
    if (page === "quickTools") return renderQuickToolsControls();
    return renderResetControls();
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
      <div style={styles.container}>
      <>
        <h1 style={styles.title}>👵🏼&nbsp;azdòra QR</h1>

        <div style={{ ...styles.cameraInline, justifyContent: "center", marginBottom: 16 }}>
          <label style={styles.cameraLabel}></label>
          <select
            value={cameraModel}
            onChange={(e) => setCameraModel(e.target.value)}
            style={styles.cameraSelect}
          >
            {CAMERA_OPTIONS.map((camera) => (
              <option key={camera.value} value={camera.value}>
                {camera.label}
              </option>
            ))}
          </select>
        </div>
      </>

        <div style={styles.tabs}>
        <button style={page === "boot"     ? styles.activeTab : styles.tab} onClick={() => setPage("boot")}>1. BOOT</button>
        <button style={page === "schedule" ? styles.activeTab : styles.tab} onClick={() => setPage("schedule")}>2. SCHEDULE</button>
        <button style={page === "quickTools" ? styles.activeTab : styles.tab} onClick={() => setPage("quickTools")}>QUICK TOOLS</button>

        <button style={page === "reset" ? styles.resetActiveTab : styles.resetTab} onClick={() => setPage("reset")}>RESET</button>
      </div>

      <div style={styles.panel}>{renderPageControls()}</div>

      <h3 style={{ color: "#ffffff" }}>Generated Script</h3>
      <textarea rows={3} readOnly value={generateScript()} style={styles.textarea} />

      <div style={{ marginTop: 20 }}>
        <QRCodeSVG
          value={generateScript()}
          size={isMobile ? 260 : 420}
          marginSize={4}
          bgColor="#FFFFFF"
          fgColor="#000000"
          level="M"
        />
      </div>

      <div style={styles.footer}>
        <div style={styles.footerNote}>From Marco, with love.</div>
        <a
          href="https://gopro.github.io/labs/control/tech/"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.footerLink}
        >
          GoPro Labs documentation
        </a>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 900,
    margin: "0 auto",
  },
title: {
  fontSize: 32,
  margin: 0,
  lineHeight: 1,
  color: "#ffffff",
  fontWeight: "700",
  textAlign: "center",
  marginBottom: 12,
},
  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tab: {
    padding: "10px 14px",
    border: "1px solid #ccc",
    background: "#ffffff",
    color: "#111",
    cursor: "pointer",
    borderRadius: 6,
  },
  activeTab: {
    padding: "10px 14px",
    border: "1px solid #333",
    background: "#421ef5",
    color: "#fff",
    cursor: "pointer",
    borderRadius: 6,
  },
  resetTab: {
    padding: "10px 14px",
    border: "1px solid #d6a0a0",
    background: "#ffffff",
    color: "#8b0000",
    cursor: "pointer",
    borderRadius: 6,
  },
  resetActiveTab: {
    padding: "10px 14px",
    border: "1px solid #8b0000",
    background: "#c62828",
    color: "#fff",
    cursor: "pointer",
    borderRadius: 6,
  },
  panel: {
    width: "100%",
    minWidth: 0,
    marginBottom: 20,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#ffffff",
  },
  field: {
    display: "grid",
    gridTemplateColumns: "180px minmax(0, 1fr)",
    alignItems: "center",
    justifyItems: "start",
    textAlign: "left",
    gap: 12,
    marginBottom: 14,
    width: "100%",
    minWidth: 0,
  },
  label: {
    display: "inline-block",
    fontSize: 14,
    color: "#292929",
  },
  textarea: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    display: "block",
    fontFamily: "monospace",
    fontSize: 14,
    color: "#ffffff",        // ← add this
    backgroundColor: "#585858",  // ← and this, so it's explicit
  },
  note: {
    marginTop: 10,
    padding: 10,
    background: "#fff8dc",
    border: "1px solid #e6d28f",
    color: "#292929",
    borderRadius: 6,
    fontSize: 14,
    whiteSpace: "pre-line",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  },
  select: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    color: "#111",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 14,
    WebkitAppearance: "menulist",
    appearance: "menulist",
  },
  checkboxRow: {
    marginBottom: 14,
    width: "100%",
    textAlign: "left",
    fontSize: 14,
    color: "#292929",
  },
  input: {
    width: "100%",
    minWidth: 0,
    color: "#111",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 14,
  },
  timeInput: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    display: "block",
    color: "#111",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 14,
    WebkitAppearance: "none",
    appearance: "none",
    colorScheme: "light",
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid #555",
    color: "#ddd",
    fontSize: 14,
  },
  footerNote: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
  footerLink: {
    color: "#8ab4ff",
    textDecoration: "none",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  cameraSelectorWrap: {
    display: "flex",
    alignItems: "left",
    gap: 8,
    background: "#ffffff",
    padding: "6px 10px",
    border: "1px solid #ddd",
    borderRadius: 8,
  },
  cameraLabel: {
    fontSize: 13,
    color: "#ffffff",
    whiteSpace: "nowrap",
  },
  cameraSelect: {
    minWidth: 170,
    maxWidth: 220,
    color: "#111",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 14,
    WebkitAppearance: "menulist",
    appearance: "menulist",
  },
  cameraInline: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
  },
};
