import * as React from 'react';
import { Platform } from 'react-native';

type AudioSpacebarControls = {
  disabled: boolean;
  isPlaying: boolean;
  togglePlayback: () => void;
};

type AudioSpacebarRegistration = {
  controlsRef: React.MutableRefObject<AudioSpacebarControls>;
  id: symbol;
  order: number;
};

let activeTargetId: symbol | null = null;
let isKeydownListenerAttached = false;
let nextRegistrationOrder = 0;
const registrations = new Map<symbol, AudioSpacebarRegistration>();

const INTERACTIVE_TARGET_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(',');

const isWebDocumentAvailable = () =>
  Platform.OS === 'web' && typeof document !== 'undefined';

const isSpacebarKey = (event: KeyboardEvent) =>
  event.key === ' ' || event.code === 'Space';

const hasShortcutModifier = (event: KeyboardEvent) =>
  event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

const shouldIgnoreEventTarget = (target: EventTarget | null) => {
  if (typeof Element === 'undefined' || !(target instanceof Element)) {
    return false;
  }

  return target.closest(INTERACTIVE_TARGET_SELECTOR) != null;
};

const getActiveRegistration = () => {
  const activeRegistration =
    activeTargetId == null ? undefined : registrations.get(activeTargetId);

  if (activeRegistration && !activeRegistration.controlsRef.current.disabled) {
    return activeRegistration;
  }

  const playingRegistration = [...registrations.values()]
    .filter((registration) => {
      const controls = registration.controlsRef.current;
      return controls.isPlaying && !controls.disabled;
    })
    .sort((a, b) => b.order - a.order)[0];

  if (playingRegistration) {
    activeTargetId = playingRegistration.id;
    return playingRegistration;
  }

  return null;
};

const handleSpacebarKeydown = (event: KeyboardEvent) => {
  if (!isSpacebarKey(event)) return;
  if (event.repeat || hasShortcutModifier(event)) return;
  if (shouldIgnoreEventTarget(event.target)) return;
  const registration = getActiveRegistration();
  if (!registration) return;
  event.preventDefault();
  registration.controlsRef.current.togglePlayback();
};

const syncDocumentListener = () => {
  if (!isWebDocumentAvailable()) return;

  if (registrations.size > 0 && !isKeydownListenerAttached) {
    document.addEventListener('keydown', handleSpacebarKeydown, true);
    isKeydownListenerAttached = true;
    return;
  }

  if (registrations.size === 0 && isKeydownListenerAttached) {
    document.removeEventListener('keydown', handleSpacebarKeydown, true);
    isKeydownListenerAttached = false;
  }
};

const registerAudioSpacebarTarget = (
  id: symbol,
  controlsRef: React.MutableRefObject<AudioSpacebarControls>
) => {
  registrations.set(id, { controlsRef, id, order: ++nextRegistrationOrder });
  syncDocumentListener();

  return () => {
    registrations.delete(id);
    if (activeTargetId === id) activeTargetId = null;
    syncDocumentListener();
  };
};

const claimAudioSpacebarTarget = (id: symbol) => {
  const registration = registrations.get(id);
  if (!registration || registration.controlsRef.current.disabled) return;
  activeTargetId = id;
};

export const useAudioSpacebarShortcut = (controls: AudioSpacebarControls) => {
  const idRef = React.useRef<symbol | null>(null);
  const controlsRef = React.useRef(controls);
  if (!idRef.current) idRef.current = Symbol('audio-spacebar-shortcut');
  controlsRef.current = controls;

  React.useEffect(() => {
    if (!isWebDocumentAvailable()) return;
    return registerAudioSpacebarTarget(idRef.current!, controlsRef);
  }, []);

  React.useEffect(() => {
    if (!isWebDocumentAvailable()) return;
    if (!controls.isPlaying || controls.disabled) return;
    claimAudioSpacebarTarget(idRef.current!);
  }, [controls.disabled, controls.isPlaying]);

  return React.useCallback(() => {
    if (!isWebDocumentAvailable()) return;
    claimAudioSpacebarTarget(idRef.current!);
  }, []);
};
