# Deluge SysEx file API (research)

Researched 2026-11-07. Goal: let Delugr browse/edit the Deluge SD card live over USB MIDI, as a second storage backend next to File System Access. Status: research only, nothing implemented.

## Sources

- Protocol doc: https://delugecommunity.com/development/deluge/sysexprotocolnotes/ (source: `website/src/content/docs/development/deluge/SysExProtocolNotes.md` in DelugeFirmware)
- Firmware handler: `src/deluge/storage/smsysex.cpp` in https://github.com/SynthstromAudible/DelugeFirmware (read at commit `4cdf490`, 2026-11-05)
- Reference client: https://github.com/SynthstromAudible/DelugeWeb, `midilib/lib/` (`FileRoutines.js`, `JsonReplyHandler.js`, `mididriver.js`), used by `vuefinder`

## Requirements

- Community firmware with the sysex file API. Which version added it is not documented; check the firmware changelog / git history before relying on a minimum version.
- Web MIDI with `navigator.requestMIDIAccess({ sysex: true })`. Permission prompt; Chromium-focused (Delugr is Chromium-only already).

## Framing

`F0 00 21 7B 01 <cmd> <seq> <json> [00 <7-bit packed binary>] F7`

- `cmd`: `0x06` = JSON request, `0x07` = JSON reply.
- `seq`: message ID, `(sid << 3) | n`, `n` in 1..7. Reply echoes it. Seq 0 reserved for device-initiated messages (unused).
- JSON body: `{"<verb>": {...}}`. Reply: `{"^<verb>": {...}}`.
- Binary payload (only `read`/`write`): 7 bytes → 8 bytes. First byte holds high bits of the next 7; those 7 bytes have the high bit cleared. 1024 B block ≈ 1176 B encoded.

## Sessions

- Send `{"session": {"tag": "<uuid>"}}` first. Reply: `sid`, `tag`, `midBase`, `midMin`, `midMax` (e.g. sid 1 → midBase 8, midMin 9, midMax 15).
- Up to 15 sessions (`MAX_SYSEX_SESSIONS`), reclaimed LRU. Each session has 7 message IDs (`SYSEX_MSGID_MAX`) → **max 7 requests in flight per session**. (Doc's "wraps 1 to 127" is wrong; firmware is 1–7.)

## Commands

| Verb | Params | Reply fields | Notes |
|---|---|---|---|
| `session` | `tag?` | `sid, tag, midBase, midMin, midMax` | |
| `ping` | — | — | Connection check / keepalive |
| `dir` | `path?` (default `/`), `offset?`, `lines?` (default 20, **max 25**) | `list[], err` | Page by `offset` until empty `list` |
| `open` | `path`, `write` (0 read, 1 create, 2 append), `date?`, `time?` | `fid, size, err` | `fid` 0 on error. Write-open creates intermediate dirs |
| `read` | `fid, addr, size?` (**max 1024**) | `fid, addr, size, err` + binary | Empty payload = EOF |
| `write` | `fid, addr, size` (max 1024) + binary | `fid, addr, size, err` | |
| `close` | `fid` | `fid, err` | |
| `delete` | `path` | `err` | File or (empty?) dir |
| `mkdir` | `path, date?, time?` | `path, err` | |
| `rename` | `from, to` | `from, to, err` | |
| `copy` | `from, to, date?, time?` | `from, to, err` | Done on device |
| `move` | `from, to, date?, time?` | `from, to, err` | Rename, or copy+delete |
| `utime` | `path, date, time` | `err` | |

- `dir` entry: `name`, `size` (bytes), `date`, `time` (FAT packed), `attr` (`0x10` dir, `0x20` archive, `0x01` RO, `0x02` hidden, `0x04` system).
- `err`: FatFs `FRESULT` 0 (`FR_OK`) .. 18 (`FR_TOO_MANY_OPEN_FILES`).
- Limits: 4 open files (`MAX_OPEN_FILES`), path ≤ 256 chars, 1024 B block (`blockBufferMax`).

## Firmware behaviour (smsysex.cpp)

- Incoming sysex is queued (`SysExQ`). A scheduler task (`deluge.cpp`, "Handle pending SysEx traffic") handles **one message per run**, every ~0.2 ms min.
- Skipped while `currentlyAccessingCard != 0`, so the firmware itself arbitrates SD access. During playback with SD sample streaming, requests wait → slower, not corrupting (my read; untested).
- `copy` runs the whole file copy inside one task run (loop of 1024 B `f_read`/`f_write`). A large copy may block the main loop → possible audio glitch if playing. Untested.

## Implications for Delugr

- **Scan needs no sample bytes.** Parsing only uses sample name/size/mtime (`processAudioFile` in `src/deluge/fileParsing.ts`), and `dir` gives all of them. Decode FAT date/time → JS Date.
- Only XML gets downloaded at scan time. Samples download on demand (play/waveform: `PlayButton.vue`, `SampleDetails.vue`).
- Rename/move sample → native `rename`/`move`, replacing the copy-via-`showSaveFilePicker` flow in `src/deluge/files.ts`.
- Needs a storage abstraction (list/read/write/delete/rename/mkdir) with FS Access and SysEx backends, or a shim mimicking `FileSystemDirectoryHandle`. Direct handle use today: `fileParsing.ts`, `files.ts`, `PlayButton.vue`, `SampleDetails.vue`, `FileDeletionModal.vue`.
- Write own promise-based TS client rather than importing `midilib` (callback-based JS, 512 B blocks, 1 request in flight, dir 20 lines).

## Performance

No published throughput figures. Estimates only:

- Bus is not the limit (USB full-speed, bulk endpoints). The limit is round-trip latency and one-message-per-task processing.
- `midilib` style (512 B, 1 in flight): guess tens of KB/s. First scan of ~20 MB XML = minutes.
- Improvements: 1024 B blocks (half the round trips), pipeline up to 7 requests per session (removes per-request latency; device still processes serially), `dir` with 25 lines.
- Cache parsed XML in IndexedDB keyed by path + size + mtime; rescans then cost only `dir` listing + changed files.

## Next step: spike

1. Connect, `session`, `ping`.
2. `dir /SYNTHS`, log raw entry fields, decode FAT date/time.
3. Time a 1 MB read at 1, 4 and 7 requests in flight, 1024 B blocks.
4. Repeat 3 while Deluge plays a sample-heavy song; listen for glitches.

## Open questions

- Min firmware version with file API?
- Does `delete` work on non-empty dirs?
- Real throughput, idle vs playing?
- Does a large `copy` cause audible dropouts?

## Ruled out

USB mass storage: not in firmware. `USB_PMSC` in `src/RZA1/usb/USBConnection.c` is leftover Renesas sample naming; only `USB_CFG_PMIDI_USE`/`USB_CFG_HMIDI_USE` enabled, descriptor is MIDI + audio only. Would also lock the Deluge out of its card while mounted.
