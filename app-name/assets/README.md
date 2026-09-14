# Offline Assets

## Graphics

`art/{mascot,classic-art,time-art,trophy,coin}.svg` are extracted from the approved
lavender/yellow `outputs/app-name-ui.html`. Each keeps its original viewBox and
complete symbol body, including nested defs, gradients, text, and colors.
No replacement or third-party artwork was introduced. The supplied project's
original generated artwork retains the source project's ownership/license;
extraction does not impose a new license on it.

SVG text still references Nunito. For native SVG text, load the bundled font
under the family used by the renderer. For exact browser typography, inline the
SVG and include `fonts/fonts.css`; an SVG used as an isolated image cannot inherit
the host page's font faces. Native rendering requires the app's SVG renderer
(usually `react-native-svg`), not React Native's raster-only Image component.

## Fonts

- `fonts/Nunito-Bold.ttf`: unmodified Google Fonts static weight 700.
- `fonts/Nunito-ExtraBold.ttf`: unmodified Google Fonts static weight 800.
- `fonts/TitanOne-Regular.ttf`: unmodified Google Fonts static weight 400.
- `fonts/OFL-Nunito.txt` and `fonts/OFL-TitanOne.txt`: upstream SIL OFL 1.1 licenses.
- `fonts/fonts.css`: all three TTFs embedded as data URLs; paste into a browser
  document's style block or bundle as a local stylesheet. No Google Fonts request
  occurs at runtime. Font binaries have not been subsetted or renamed internally.

For Expo, load the TTFs with `expo-font` / `useFonts` and literal asset requires,
using aliases such as `Nunito-Bold`, `Nunito-ExtraBold`, and `TitanOne-Regular`.
Apply each alias directly as fontFamily rather than relying on synthetic weights.
The font files and their licenses must stay together when redistributed.
`graphics-fonts-manifest.json` records source URLs, byte sizes, and SHA-256 hashes.

## Sound Effects

All eight MP3s are original mathematical synthesis created for this project:
sine-wave partials, smooth envelopes, short pitch sweeps, and seeded filtered
noise. No recorded samples, stock packs, voices, or existing music were used.
They are royalty-free under CC0 1.0; see `sounds/LICENSE.txt`. The reusable
generator is the source. WAV PCM is produced in memory and piped into ffmpeg;
there are no intermediate WAV files or external runtime dependencies.

`sounds/manifest.json` records descriptions, source durations, sizes, hashes,
encoding, and the ffmpeg version. MP3 frame durations can include encoder padding.
All eight MP3 files together are strictly under 500,000 bytes.

## Playback Integration

Required native dependency: `expo-audio ~57.0.5` for Expo SDK 57.
Install with `npx expo install expo-audio` in the app; no package file was changed
as part of this asset task. Its `expo-asset` peer is also used for local web asset
resolution and should be installed with `npx expo install expo-asset` if absent.
`expo-font` is needed separately by the caller loading the bundled fonts.

Intentional deviation from the original expo-av request: Expo 57.0.22's
`bundledNativeModules.json` includes `expo-audio: ~57.0.5` and no expo-av entry.
The inspected expo-av 16.0.8 changelog declares deprecation since 15.1.1.
No unsupported expo-av compatibility layer is included.

```ts
import { sound, type SoundName } from './src/services/sound';
sound.play('correct'); // void; never await during game interaction
sound.setEnabled(false); // immediately stops this service's players
await sound.dispose(); // releases players; safe to call repeatedly
```

Names: `tap | correct | wrong | complete | tick | swipe | bonus | over`.
Players are created lazily and reused. Different effects can overlap; repeated
requests during a pending restart are coalesced. Disabling/disposal cancels pending
playback. Disposal does not change the preference; the next play can recreate
players if enabled. Native playback mixes with other apps, respects silent mode,
and does not request background playback or microphone access.

Web uses a local HTMLAudioElement behind the same API: expo-audio 57.0.5's web
implementation discards the underlying play promise, so this small adapter is
necessary to catch autoplay rejections instead of leaking unhandled errors.
Call play from user interaction where possible; blocked playback simply stays
silent. Native audio-module, player, seek, and cleanup failures are also guarded.

The service only references bundled local MP3s. Installed native release builds
work without a network; a development build still needs its usual Metro asset
server. Browser offline hosting/cache is the host application's responsibility.

## Regeneration

Run from `app-name/` (Node 22+ and an ffmpeg build with libmp3lame):

```sh
node scripts/extract-assets.mjs --fetch-fonts
node scripts/extract-assets.mjs
FFMPEG_PATH=/path/to/ffmpeg node scripts/generate-sounds.mjs
FFMPEG_PATH=/path/to/ffmpeg node assets/verify.mjs --regenerate
```

Only the first command needs a network, to download the pinned Google Fonts
binary URLs and upstream OFL files. Subsequent extraction embeds the existing
fonts offline. An optional HTML source path can be passed to the extractor.
Changing that source deliberately updates its manifest hash.
The verification command checks asset hashes, static font weights, complete SVG
bodies, MP3 decoding/levels, and mocked native/web playback failure paths. With
`--regenerate`, it also verifies byte-identical offline regeneration.
