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

const LENS_OPTIONS = [
  { value: "",   label: "Not set" },
  { value: "fN", label: "Narrow (older models)" },
  { value: "fM", label: "Medium (older models)" },
  { value: "fW", label: "Wide" },
  { value: "fL", label: "Linear" },
  { value: "fS", label: "Superview" },
  { value: "fV", label: "HyperView (H11-13)" },
  { value: "fH", label: "Horizontal Level + Linear (H9-13)" },
  { value: "fX", label: "SuperMax Wide (Max Lens Mod)" },
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

function intervalToLabs(interval) {
  return `00;${String(interval).padStart(2, "0")}R`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation
  const [page, setPage] = useState("boot"); // boot | schedule | uploadTest | reset

  // Schedule settings
  const [days, setDays] = useState(ALL_DAYS);
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [interval, setInterval] = useState(20);
  const [lens, setLens] = useState("fW");

  // Upload settings
  const [upload, setUpload] = useState(true);
  const [uploadTime, setUploadTime] = useState("19:05");
  const [uploadTimeout, setUploadTimeout] = useState("");

  // Power save settings
  const [screenTimeout1m, setScreenTimeout1m] = useState(true);
  const [lcd10, setLcd10] = useState(false);
  const [voiceOff, setVoiceOff] = useState(false);
  const [ledsOff, setLedsOff] = useState(false);

  // Boot settings
  const [gpsSync, setGpsSync] = useState(true);
  const [enableTusb, setEnableTusb] = useState(true);
  const [enableFast, setEnableFast] = useState(true);

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

  // Guard: uploadTest page requires upload enabled
  useEffect(() => {
    if (!upload && page === "uploadTest") setPage("schedule");
  }, [upload, page]);

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

  function buildPowerSaveCommands() {
    const optionParts = [];
    if (screenTimeout1m) optionParts.push("S1");
    if (lcd10)           optionParts.push("B1");
    if (ledsOff)         optionParts.push("D0");

    const commands = [];
    if (optionParts.length) commands.push(`o${optionParts.join("")}`);
    if (voiceOff)          commands.push("v0");
    return commands;
  }

  function generateBootScript() {
    let script = "";
    if (enableTusb) script += "*TUSB=1";
    if (enableFast) script += "*FAST=1";
    script += "dP";
    if (gpsSync) script += "*SYNC=1";
    script += '*BOOT="!Lsch"';
    return script;
  }

  function generateScheduleScript() {
    const wakeTime = addMinutes(start, -1);
    const stopTime = addMinutes(end, 1);
    const dayFilter = buildDayFilter();
    const powerSaveCommands = buildPowerSaveCommands();

    let script = `!SAVEsch=>${wakeTime}<${stopTime}+`;
    if (dayFilter) script += dayFilter;
    script += `!1N`;
    if (lens) script += `+${lens}`;
    if (powerSaveCommands.length) script += `+${powerSaveCommands.join("+")}`;
    script += `+!S+!1N+!${intervalToLabs(interval)}`;

    if (upload) {
      const timeoutSuffix = uploadTimeout ? String(uploadTimeout) : "";
      script += `~!${uploadTime}U${timeoutSuffix}+!${start}R`;
    } else {
      script += `!${start}R`;
    }

    return script;
  }

  function generateUploadTestScript() {
    return '"Upload Test"+!5U';
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
    if (page === "uploadTest") return generateUploadTestScript();
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
            <input type="checkbox" checked={enableTusb} onChange={(e) => setEnableTusb(e.target.checked)} />{" "}
            Enable USB Power Support
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={enableFast} onChange={(e) => setEnableFast(e.target.checked)} />{" "}
            Enable Fast Boot
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={gpsSync} onChange={(e) => setGpsSync(e.target.checked)} />{" "}
            Enable GPS clock sync
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
          <input type="number" min="1" value={interval} onChange={(e) => setInterval(Number(e.target.value))} style={styles.input} />
        </div>

        {/* Lens */}
        <div style={fieldGrid}>
          <label style={styles.label}>Lens / FOV</label>
          <select value={lens} onChange={(e) => setLens(e.target.value)} style={styles.select}>
            {LENS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
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

        {/* Power save */}
        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={screenTimeout1m} onChange={(e) => setScreenTimeout1m(e.target.checked)} />{" "}
            Screen auto-off after 1 minute (oS1)
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={lcd10} onChange={(e) => setLcd10(e.target.checked)} />{" "}
            LCD brightness 10% (oB1)
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={voiceOff} onChange={(e) => setVoiceOff(e.target.checked)} />{" "}
            Voice commands off (v0)
          </label>
        </div>

        <div style={styles.checkboxRow}>
          <label>
            <input type="checkbox" checked={ledsOff} onChange={(e) => setLedsOff(e.target.checked)} />{" "}
            All LEDs off (oD0)
          </label>
        </div>

        <div style={styles.note}>
          SCHEDULE saves the script into <code>sch</code> using <code>!SAVEsch=...</code>.
        </div>
      </>
    );
  }

  function renderUploadTestControls() {
    return (
      <div style={styles.note}>
        This page generates a non-persistent QR code to trigger an upload now.
      </div>
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
    if (page === "uploadTest") return renderUploadTestControls();
    return renderResetControls();
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>👵🏼&nbsp;&nbsp;&nbsp;azdòra QR</h1>

      <div style={styles.tabs}>
        <button style={page === "boot"     ? styles.activeTab : styles.tab} onClick={() => setPage("boot")}>1. BOOT</button>
        <button style={page === "schedule" ? styles.activeTab : styles.tab} onClick={() => setPage("schedule")}>2. SCHEDULE</button>
        {upload && (
          <button style={page === "uploadTest" ? styles.activeTab : styles.tab} onClick={() => setPage("uploadTest")}>3. UPLOAD TEST</button>
        )}
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
    marginBottom: 20,
    color: "#ffffff",
    fontWeight: "700",
  },
  tabs: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
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
};
