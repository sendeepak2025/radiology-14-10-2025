/**
 * Window/Level Presets for Medical Imaging
 * Pre-defined window/level settings for common tissue types
 */

export interface WindowLevelPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
  description: string;
  modality?: string[]; // Applicable modalities
  shortcut?: string;
}

/**
 * CT Window/Level Presets
 */
export const CT_PRESETS: WindowLevelPreset[] = [
  {
    name: 'Lung',
    windowWidth: 1500,
    windowCenter: -600,
    description: 'Optimal for lung parenchyma visualization',
    modality: ['CT'],
    shortcut: 'L',
  },
  {
    name: 'Mediastinum',
    windowWidth: 350,
    windowCenter: 50,
    description: 'Soft tissue in chest',
    modality: ['CT'],
    shortcut: 'M',
  },
  {
    name: 'Bone',
    windowWidth: 2000,
    windowCenter: 300,
    description: 'Bone structures and fractures',
    modality: ['CT'],
    shortcut: 'B',
  },
  {
    name: 'Brain',
    windowWidth: 80,
    windowCenter: 40,
    description: 'Brain parenchyma',
    modality: ['CT'],
    shortcut: 'R',
  },
  {
    name: 'Subdural',
    windowWidth: 300,
    windowCenter: 100,
    description: 'Subdural/epidural hematoma',
    modality: ['CT'],
    shortcut: 'S',
  },
  {
    name: 'Stroke',
    windowWidth: 8,
    windowCenter: 32,
    description: 'Acute stroke detection',
    modality: ['CT'],
    shortcut: 'K',
  },
  {
    name: 'Abdomen',
    windowWidth: 400,
    windowCenter: 50,
    description: 'Abdominal soft tissue',
    modality: ['CT'],
    shortcut: 'A',
  },
  {
    name: 'Liver',
    windowWidth: 150,
    windowCenter: 30,
    description: 'Liver parenchyma',
    modality: ['CT'],
    shortcut: 'I',
  },
  {
    name: 'Spine',
    windowWidth: 250,
    windowCenter: 50,
    description: 'Spine soft tissue',
    modality: ['CT'],
    shortcut: 'P',
  },
  {
    name: 'Angio',
    windowWidth: 600,
    windowCenter: 300,
    description: 'Vascular structures with contrast',
    modality: ['CT'],
    shortcut: 'V',
  },
];

/**
 * MRI Window/Level Presets (T1, T2 weighted)
 */
export const MRI_PRESETS: WindowLevelPreset[] = [
  {
    name: 'T1 Weighted',
    windowWidth: 600,
    windowCenter: 300,
    description: 'Standard T1 weighted imaging',
    modality: ['MR'],
  },
  {
    name: 'T2 Weighted',
    windowWidth: 1600,
    windowCenter: 800,
    description: 'Standard T2 weighted imaging',
    modality: ['MR'],
  },
  {
    name: 'FLAIR',
    windowWidth: 1000,
    windowCenter: 500,
    description: 'Fluid-attenuated inversion recovery',
    modality: ['MR'],
  },
  {
    name: 'MR Angio',
    windowWidth: 500,
    windowCenter: 250,
    description: 'MR angiography',
    modality: ['MR'],
  },
];

/**
 * General/Other Modality Presets
 */
export const GENERAL_PRESETS: WindowLevelPreset[] = [
  {
    name: 'Full Dynamic Range',
    windowWidth: 4096,
    windowCenter: 2048,
    description: 'Full range visualization',
    modality: ['CT', 'MR', 'CR', 'DX'],
  },
  {
    name: 'Soft Tissue',
    windowWidth: 400,
    windowCenter: 40,
    description: 'General soft tissue',
    modality: ['CT', 'CR', 'DX'],
  },
  {
    name: 'High Contrast',
    windowWidth: 200,
    windowCenter: 100,
    description: 'High contrast visualization',
    modality: ['CT', 'MR', 'CR', 'DX'],
  },
];

/**
 * All presets combined
 */
export const ALL_PRESETS: WindowLevelPreset[] = [
  ...CT_PRESETS,
  ...MRI_PRESETS,
  ...GENERAL_PRESETS,
];

/**
 * Get presets for a specific modality
 */
export function getPresetsForModality(modality: string): WindowLevelPreset[] {
  return ALL_PRESETS.filter(
    (preset) =>
      !preset.modality || preset.modality.includes(modality.toUpperCase())
  );
}

/**
 * Find preset by name
 */
export function getPresetByName(name: string): WindowLevelPreset | undefined {
  return ALL_PRESETS.find(
    (preset) => preset.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get preset by keyboard shortcut
 */
export function getPresetByShortcut(
  shortcut: string
): WindowLevelPreset | undefined {
  return ALL_PRESETS.find(
    (preset) =>
      preset.shortcut &&
      preset.shortcut.toLowerCase() === shortcut.toLowerCase()
  );
}

/**
 * Custom preset interface for user-defined presets
 */
export interface CustomPreset extends WindowLevelPreset {
  id: string;
  createdAt: string;
  isCustom: true;
}

/**
 * Manage custom presets in localStorage
 */
export class CustomPresetManager {
  private static STORAGE_KEY = 'customWindowLevelPresets';

  static getAll(): CustomPreset[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error loading custom presets:', error);
      return [];
    }
  }

  static save(preset: Omit<CustomPreset, 'id' | 'createdAt' | 'isCustom'>): CustomPreset {
    const newPreset: CustomPreset = {
      ...preset,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    const presets = this.getAll();
    presets.push(newPreset);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));

    return newPreset;
  }

  static delete(id: string): void {
    const presets = this.getAll().filter((p) => p.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
  }

  static update(id: string, updates: Partial<CustomPreset>): void {
    const presets = this.getAll().map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
  }

  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Calculate optimal window/level from image statistics
 */
export function calculateAutoWindowLevel(
  minValue: number,
  maxValue: number
): { windowWidth: number; windowCenter: number } {
  const windowWidth = maxValue - minValue;
  const windowCenter = (maxValue + minValue) / 2;

  return { windowWidth, windowCenter };
}

/**
 * Validate window/level values
 */
export function validateWindowLevel(
  windowWidth: number,
  windowCenter: number
): boolean {
  return (
    !isNaN(windowWidth) &&
    !isNaN(windowCenter) &&
    windowWidth > 0 &&
    isFinite(windowWidth) &&
    isFinite(windowCenter)
  );
}
