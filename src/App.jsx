import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";


export default function App() {
  const [page, setPage] = useState("boot"); // boot | schedule | reset

  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("19:00");
  const [upload, setUpload] = useState(true);
  const [interval, setInterval] = useState(20);
  const [uploadTime, setUploadTime] = useState("19:05");
  const [gpsSync, setGpsSync] = useState(true);
  const [enableTusb, setEnableTusb] = useState(true);
  const [enableFast, setEnableFast] = useState(true);
  const [lens, setLens] = useState("fW");
  const [resetType, setResetType] = useState("metadata");
  const [uploadTimeout, setUploadTimeout] = useState("");

  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    if (!upload) return;

    const minimumUploadTime = addMinutes(end, 5);
    const minimumUploadMinutes = timeToMinutes(minimumUploadTime);
    const uploadMinutes = timeToMinutes(uploadTime);

    // Keep upload time always at least 5 minutes after end time
    if (!uploadTime || uploadMinutes < minimumUploadMinutes) {
      setUploadTime(minimumUploadTime);
    }
  }, [end, upload, uploadTime]);

  useEffect(() => {
    if (!upload && page === "uploadTest") {
      setPage("schedule");
    }
  }, [upload, page]);

  function generateBootScript() {
    let script = "";

    if (enableTusb) {
      script += "*TUSB=1";
    }

    if (enableFast) {
      script += "*FAST=1";
    }

    script += "dP";

    if (gpsSync) {
      script += "*SYNC=1";
    }

    script += '*BOOT="!Lsch"';
    return script;
  }

  function generateScheduleScript() {
    const wakeTime = addMinutes(start, -1);
    const stopTime = addMinutes(end, 1);

    let script = `!SAVEsch=>${wakeTime}<${stopTime}+!1N`;

    if (lens) {
      script += `+${lens}`;
    }

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
    return "\"Upload Test\"+!5U";
  }

  function generateResetScript() {
    switch (resetType) {
      case "metadata":
        return "!RESET!1OR";
      case "presets":
        return "!PRESET";
      case "wifi":
        return "!WRESET";
      case "factory":
        return "!FRESET";
      case "format":
        return "!FORMAT";
      default:
        return "!RESET!1OR";
    }
  }

  function getResetInfo() {
    switch (resetType) {
      case "metadata":
        return {
          title: "Reset Labs metadata + reboot",
          text: "Clears permanent GoPro Labs features/metadata only. Normal camera settings are not affected and media is untouched. this is the safest reset for removing persistent Labs behavior such as BOOT-linked metadata features.",
        };

      case "presets":
        return {
          title: "Reset presets",
          text: "Resets all camera presets to their default values and removes any custom presets.",
        };

      case "wifi":
        return {
          title: "Reset Wi‑Fi / connections",
          text: "Resets wireless connections and paired-device connection state back to default settings.",
        };

      case "factory":
        return {
          title: "Factory reset",
          text: "Resets the camera to out-of-box settings, but keeps the currently installed firmware version.",
        };

      case "format":
        return {
          title: "Format SD card",
          text: "Deletes all files from the SD card. Any saved script files stored on the SD card will be removed.",
        };

      default:
        return {
          title: "Reset Labs metadata + reboot",
          text: "Clears permanent GoPro Labs features/metadata only. Normal camera settings are not affected and media is untouched.",
        };
    }
  }

  function generateScript() {
    if (page === "boot") return generateBootScript();
    if (page === "schedule") return generateScheduleScript();
    if (page === "uploadTest") return generateUploadTestScript();
    return generateResetScript();
  }

  function renderScheduleControls() {
    return (
      <>
        
        <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>

          <label style={styles.label}>Start Time</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={styles.timeInput}
          />
        </div>

        <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>
          <label style={styles.label}>End Time</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={styles.timeInput}
          />
        </div>

        <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>
          <label style={styles.label}>Interval (minutes)</label>
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            style={styles.input}
          />
        </div>
        <div style={styles.checkboxRow}>
          <label>
            <input
              type="checkbox"
              checked={upload}
              onChange={(e) => setUpload(e.target.checked)}
            />{" "}
            Enable upload
          </label>
        </div>
        {upload && (
          <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>
            <label style={styles.label}>Upload Time</label>
            <input
              type="time"
              value={uploadTime}
              onChange={(e) => setUploadTime(e.target.value)}
              style={styles.timeInput}
            />
          </div>
        )}
        {upload && (
          <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>
            <label style={styles.label}>Upload Timeout (minutes)</label>
            <input
              type="number"
              min="1"
              value={uploadTimeout}
              onChange={(e) => setUploadTimeout(e.target.value)}
              style={styles.input}
            />
          </div>
        )}
      </>
    );
  }

function renderPageControls() {
  if (page === "boot") {
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

        <div style={styles.note}>
          BOOT only programs the persistent startup behavior.
          It does <strong>not</strong> save the schedule body.
        </div>
      </>
    );
  }

  if (page === "schedule") {
    return (
      <>
        {renderScheduleControls()}
        <div style={styles.note}>
          SCHEDULE saves the script into <code>sch</code> using{" "}
          <code>!SAVEsch=...</code>.
        </div>
      </>
    );
  }

  if (page === "uploadTest") {
    return (
      <>
        <div style={styles.note}>
          This page generates a non-persistent QR code to trigger an upload now.
        </div>
      </>
    );
  }

  const resetInfo = getResetInfo();

  return (
    <>
      <div style={{...styles.field, gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0, 1fr)",}}>
        <label style={styles.label}>Reset Type</label>
        <select
          value={resetType}
          onChange={(e) => setResetType(e.target.value)}
          style={styles.select}
        >
          <option value="metadata">Reset Labs metadata + reboot</option>
          <option value="presets">Reset presets</option>
          <option value="wifi">Reset Wi-Fi credentials</option>
          <option value="factory">Factory reset</option>
          <option value="format">Format SD card</option>
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

  function getTitle() {
    return "👵🏼\u00A0\u00A0\u00A0azdòra QR";
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{getTitle()}</h1>

      <div style={styles.tabs}>
        <button
          style={page === "boot" ? styles.activeTab : styles.tab}
          onClick={() => setPage("boot")}
        >
          1. BOOT
        </button>

        <button
          style={page === "schedule" ? styles.activeTab : styles.tab}
          onClick={() => setPage("schedule")}
        >
          2. SCHEDULE
        </button>

        {upload && (
          <button
            style={page === "uploadTest" ? styles.activeTab : styles.tab}
            onClick={() => setPage("uploadTest")}
          >
            3. UPLOAD TEST
          </button>
        )}

        <button
          style={page === "reset" ? styles.resetActiveTab : styles.resetTab}
          onClick={() => setPage("reset")}
        >
          RESET
        </button>

      </div>

      <div style={styles.panel}>{renderPageControls()}</div>

      <h3>Generated Script</h3>
      <textarea
        rows={1}
        readOnly
        value={generateScript()}
        style={styles.textarea}
      />

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
        <div style={styles.footerNote}>
          With love. Marco.
        </div>

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

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    maxWidth: 900,
    margin: "0 auto",
    backgroundColor: "#292929",
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
    boxSizing: "border-box",
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
    boxSizing: "border-box",
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
    boxSizing: "border-box",
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
    boxSizing: "border-box",
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
    boxSizing: "border-box",
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
