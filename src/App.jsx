import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function App() {
  const [page, setPage] = useState("boot"); // boot | schedule | reset

  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("19:00");
  const [upload, setUpload] = useState(true);
  const [interval, setInterval] = useState(2);
  const [uploadTime, setUploadTime] = useState("19:05");
  const [gpsSync, setGpsSync] = useState(true);
  const [enableTusb, setEnableTusb] = useState(true);
  const [enableFast, setEnableFast] = useState(true);
  const [lens, setLens] = useState("fW");
  const [resetType, setResetType] = useState("metadata");

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

    const endMinutes = timeToMinutes(end);
    const uploadMinutes = timeToMinutes(uploadTime);

    // Keep upload time always after end time
    if (!uploadTime || uploadMinutes <= endMinutes) {
      setUploadTime(addMinutes(end, 5));
    }
  }, [end, upload, uploadTime]);

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

    let script = `!SAVEsch=>${wakeTime}<${stopTime}!1N`;

    if (lens) {
      script += `+${lens}`;
    }

    script += `+!S+!1N+!${intervalToLabs(interval)}`;

    if (upload) {
      script += `~!${uploadTime}U+!${start}R`;
    } else {
      script += `~!${start}R`;
    }

    return script;
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

  function generateScript() {
    if (page === "boot") return generateBootScript();
    if (page === "schedule") return generateScheduleScript();
    return generateResetScript();
  }

  function renderScheduleControls() {
    return (
      <>
        <div style={styles.field}>
          <label style={styles.label}>Start Time</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>End Time</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Interval (minutes)</label>
          <input
            type="number"
            min="1"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Lens / FOV</label>
          <select value={lens} onChange={(e) => setLens(e.target.value)}>
            <option value="">Not set</option>
            <option value="fN">Narrow (older models)</option>
            <option value="fM">Medium (older models)</option>
            <option value="fW">Wide</option>
            <option value="fL">Linear</option>
            <option value="fS">Superview</option>
            <option value="fV">HyperView (H11-13)</option>
            <option value="fH">Horizontal Level + Linear (H9-13)</option>
            <option value="fX">SuperMax Wide (Max Lens Mod)</option>
          </select>
        </div>

        <div style={styles.field}>
          <label>
            <input
              type="checkbox"
              checked={upload}
              onChange={(e) => setUpload(e.target.checked)}
            />{" "}
            Upload after schedule ends
          </label>
        </div>

        {upload && (
          <div style={styles.field}>
            <label style={styles.label}>Upload Time</label>
            <input
              type="time"
              value={uploadTime}
              onChange={(e) => setUploadTime(e.target.value)}
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
          <div style={styles.field}>
            <label>
              <input
                type="checkbox"
                checked={enableTusb}
                onChange={(e) => setEnableTusb(e.target.checked)}
              />{" "}
              Enable USB Power Support
            </label>
          </div>

          <div style={styles.field}>
            <label>
              <input
                type="checkbox"
                checked={enableFast}
                onChange={(e) => setEnableFast(e.target.checked)}
              />{" "}
              Enable Fast Boot
            </label>
          </div>

          <div style={styles.field}>
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

    return (
      <>
        <div style={styles.field}>
          <label style={styles.label}>Reset Type</label>
          <select
            value={resetType}
            onChange={(e) => setResetType(e.target.value)}
          >
            <option value="metadata">Reset Labs metadata + reboot</option>
            <option value="presets">Reset presets</option>
            <option value="wifi">Reset Wi-Fi credentials</option>
            <option value="factory">Factory reset</option>
            <option value="format">Format SD card</option>
          </select>
        </div>

        <div style={styles.note}>
          Use RESET carefully — some options are destructive.
        </div>
      </>
    );
  }

  function getTitle() {
    if (page === "boot") return "GoPro Labs BOOT Programming";
    if (page === "schedule") return "GoPro Labs SCHEDULE Generator";
    return "GoPro Labs RESET QR Code";
  }

  return (
    <div style={styles.container}>
      <h1>{getTitle()}</h1>

      <div style={styles.tabs}>
        <button
          style={page === "reset" ? styles.activeTab : styles.tab}
          onClick={() => setPage("reset")}
        >
          RESET QR Code
        </button>

        <button
          style={page === "boot" ? styles.activeTab : styles.tab}
          onClick={() => setPage("boot")}
        >
          BOOT Programming
        </button>

        <button
          style={page === "schedule" ? styles.activeTab : styles.tab}
          onClick={() => setPage("schedule")}
        >
          SCHEDULE
        </button>
      </div>

      <div style={styles.panel}>{renderPageControls()}</div>

      <h3>Generated Script</h3>
      <textarea
        rows={6}
        cols={100}
        readOnly
        value={generateScript()}
        style={styles.textarea}
      />

      <div style={{ marginTop: 20 }}>
        <QRCodeSVG
          value={generateScript()}
          size={420}
          marginSize={4}
          bgColor="#FFFFFF"
          fgColor="#000000"
          level="M"
        />
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
    background: "#f7f7f7",
    color: "#111",
    cursor: "pointer",
    borderRadius: 6,
  },
  activeTab: {
    padding: "10px 14px",
    border: "1px solid #333",
    background: "#2c12ad",
    color: "#fff",
    cursor: "pointer",
    borderRadius: 6,
  },
  panel: {
    marginBottom: 20,
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#ffffff",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    display: "inline-block",
    width: 160,
  },
  textarea: {
    width: "100%",
    maxWidth: "100%",
    fontFamily: "monospace",
    fontSize: 14,
  },
  note: {
    marginTop: 10,
    padding: 10,
    background: "#fff8dc",
    border: "1px solid #e6d28f",
    borderRadius: 6,
    fontSize: 14,
  },
};
