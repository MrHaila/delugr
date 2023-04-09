import type { Sound } from "./core"
import { FixPos50 } from "./dataTypes"

export const defaultSynthPatch: Sound = {
  presetName: 'SEEING THIS MEANS BAD THINGS HAPPENED',
  polyphonic: "poly",
  voicePriority: 1,
  mode: "subtractive",
  lpfMode: "24dB",
  modFXType: "none",
  osc1: {
    type: "square",
    transpose: 0,
    cents: 0,
    retrigPhase: -1
  },
  osc2: {
    type: "square",
    transpose: 0,
    cents: 0,
    retrigPhase: -1
  },
  lfo1: {
    type: "triangle",
    syncLevel: 0
  },
  lfo2: {
    type: "triangle"
  },
  unison: {
    num: 1,
    detune: 8
  },
  delay: {
    pingPong: 1,
    analog: 0,
    syncLevel: 7
  },
  compressor: {
    syncLevel: 6,
    attack: 327244,
    release: 936
  },
  defaultParams: {
    arpeggiatorGate: new FixPos50("0x00000000"),
    portamento: new FixPos50("0x80000000"),
    compressorShape: new FixPos50("0xDC28F5B2"),
    oscAVolume: new FixPos50("0x7FFFFFFF"),
    oscAPulseWidth: new FixPos50("0x00000000"),
    oscAWavetablePosition: new FixPos50("0x00000000"),
    oscBVolume: new FixPos50("0x80000000"),
    oscBPulseWidth: new FixPos50("0x00000000"),
    oscBWavetablePosition: new FixPos50("0x00000000"),
    noiseVolume: new FixPos50("0x80000000"),
    volume: new FixPos50("0x4CCCCCA8"),
    pan: new FixPos50("0x00000000"),
    lpfFrequency: new FixPos50("0x7FFFFFFF"),
    lpfResonance: new FixPos50("0x80000000"),
    hpfFrequency: new FixPos50("0x80000000"),
    hpfResonance: new FixPos50("0x80000000"),
    lfo1Rate: new FixPos50("0x1999997E"),
    lfo2Rate: new FixPos50("0x00000000"),
    modulator1Amount: new FixPos50("0x80000000"),
    modulator1Feedback: new FixPos50("0x80000000"),
    modulator2Amount: new FixPos50("0x80000000"),
    modulator2Feedback: new FixPos50("0x80000000"),
    carrier1Feedback: new FixPos50("0x80000000"),
    carrier2Feedback: new FixPos50("0x80000000"),
    modFXRate: new FixPos50("0x00000000"),
    modFXDepth: new FixPos50("0x00000000"),
    delayRate: new FixPos50("0x00000000"),
    delayFeedback: new FixPos50("0x80000000"),
    reverbAmount: new FixPos50("0x80000000"),
    arpeggiatorRate: new FixPos50("0x00000000"),
    stutterRate: new FixPos50("0x00000000"),
    sampleRateReduction: new FixPos50("0x80000000"),
    bitCrush: new FixPos50("0x80000000"),
    modFXOffset: new FixPos50("0x00000000"),
    modFXFeedback: new FixPos50("0x00000000"),
  },
  arpeggiator: {
    mode: "off",
    numOctaves: 2,
    syncLevel: 7
  },
  modKnobs: [
    { controlsParam: "pan" },
    { controlsParam: "volumePostFX" },
    { controlsParam: "lpfResonance" },
    { controlsParam: "lpfFrequency" },
    { controlsParam: "env1Release" },
    { controlsParam: "env1Attack" },
    { controlsParam: "delayFeedback" },
    { controlsParam: "delayRate" },
    { controlsParam: "reverbAmount" },
    { controlsParam: "volumePostReverbSend", patchAmountFromSource: "compressor" },
    { controlsParam: "pitch", patchAmountFromSource: "lfo1" },
    { controlsParam: "lfo1Rate" },
    { controlsParam: "portamento" },
    { controlsParam: "stutterRate" },
    { controlsParam: "bitcrushAmount" },
    { controlsParam: "sampleRateReduction" },
  ],
  instrumentType: "sound",
  problem: false,
  isInstance: true,
}