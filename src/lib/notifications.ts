/**
 * Notifications Management for LUMÉRÉ ERP (PWA & Web Push / Browser Notifications)
 */

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface AppNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
}

// Synthesize pleasant ambient notification chime via Web Audio API without needing external audio files
export function playNotificationSound() {
  try {
    const isSoundEnabled = localStorage.getItem('lumere_sound_enabled') !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First note (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second note (B5) harmonic chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1);
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.debug('Audio play skipped:', err);
  }
}

// Check current notification permission status
export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

// Request permission from the user
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationSound();
    }
    return permission as NotificationPermissionState;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission as NotificationPermissionState;
  }
}

// Send a native push or browser notification
export async function sendAppNotification({
  title,
  body,
  icon = '/pwa-192x192.png',
  tag,
  url = '/',
}: AppNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  playNotificationSound();

  // 1. Try sending via Service Worker registration if active (best for PWA & mobile background)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon,
          badge: '/favicon.ico',
          tag: tag || `lumere-${Date.now()}`,
          vibrate: [120, 80, 120] as any,
          data: { url },
        } as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.debug('SW showNotification fallback to window.Notification:', swErr);
    }
  }

  // 2. Fallback to standard window Notification
  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge: '/favicon.ico',
      tag: tag || `lumere-${Date.now()}`,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.error('Error creating Notification:', err);
    return false;
  }
}

// Send an immediate test notification for user verification
export async function sendTestNotification(): Promise<boolean> {
  const currentStatus = getNotificationPermissionStatus();

  if (currentStatus !== 'granted') {
    const requested = await requestNotificationPermission();
    if (requested !== 'granted') {
      return false;
    }
  }

  return sendAppNotification({
    title: 'LUMÉRÉ ERP • نظام الإشعارات الفورية',
    body: 'تم تفعيل إشعارات المتصفح بنجاح! ستتلقى تنبيهات المشاريع والمهام والماليات فورياً.',
    tag: 'lumere-test-notification',
  });
}
