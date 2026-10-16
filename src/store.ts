import { create } from "zustand";
import { clamp, DURATION } from "./simulation";
export type Mode = "incident" | "drones" | "resources";
export type Layer =
  | "trees"
  | "imagery"
  | "coverage"
  | "effects"
  | "history"
  | "drones"
  | "tracks"
  | "resources";
type State = {
  time: number;
  playing: boolean;
  rate: number;
  mode: Mode;
  selected: string | null;
  camera: "orbit" | "follow" | "cockpit";
  map2d: boolean;
  thermal: boolean;
  ir: boolean;
  cameraZoom: number;
  dark: boolean;
  reduced: boolean;
  relief: number;
  opacity: number;
  layers: Record<Layer, boolean>;
  info: boolean;
  notice: string;
  notes: string;
  reset: number;
  setTime: (n: number) => void;
  tick: (delta: number) => void;
  play: () => void;
  pause: () => void;
  home: () => void;
  setMode: (m: Mode) => void;
  select: (id: string | null) => void;
  toggleLayer: (l: Layer) => void;
  resetView: () => void;
};
let accumulator = 0;
export const useStore = create<State>((set, get) => ({
  time: 0,
  playing: false,
  rate: 4,
  mode: "incident",
  selected: null,
  camera: "orbit",
  map2d: false,
  thermal: false,
  ir: false,
  cameraZoom: 1,
  dark: false,
  reduced: false,
  relief: 1.8,
  opacity: 0.8,
  layers: {
    trees: true,
    imagery: true,
    coverage: true,
    effects: true,
    history: true,
    drones: true,
    tracks: true,
    resources: true,
  },
  info: false,
  notice: "",
  notes: "",
  reset: 0,
  setTime: (n) => {
    accumulator = clamp(Math.floor(n));
    set({
      time: accumulator,
      ...(accumulator === DURATION ? { playing: false } : {}),
    });
  },
  tick: (delta) => {
    if (!get().playing) return;
    accumulator = clamp(accumulator + Math.max(0, delta) * 10 * get().rate);
    const time = Math.floor(accumulator + 1e-8);
    if (time !== get().time || time === DURATION)
      set({ time, playing: time < DURATION });
  },
  play: () => {
    if (get().time === DURATION) {
      accumulator = 0;
      set({ time: 0 });
    }
    set((s) => ({ playing: !s.playing }));
  },
  pause: () => set({ playing: false }),
  home: () => {
    accumulator = 0;
    set({ time: 0, playing: false });
  },
  setMode: (mode) =>
    set({ mode, selected: null, camera: "orbit", thermal: false, ir: false }),
  select: (selected) => set({ selected, camera: "orbit" }),
  toggleLayer: (l) =>
    set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
  resetView: () =>
    set((s) => ({ reset: s.reset + 1, camera: "orbit", map2d: false })),
}));
export function pageHidden() {
  useStore.getState().pause();
  useStore.setState({ notice: "Playback paused while the page was hidden." });
}
