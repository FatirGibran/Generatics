export type Stance = "PRO" | "KONTRA";

export type RandomMode = "BALANCED" | "PURE_RANDOM";

export interface Admin {
  username: string;
  passwordHash: string;
  role: "SUPER_ADMIN";
  createdAt: number | string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number | string;
}

export interface Motion {
  id: string;
  themeId: string;
  themeName: string;
  motionText: string;
  maxUsage: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: number | string;
}

export interface Participant {
  username: string;
  fullName: string;
  accessToken: string;
  sessionBatch: "Day 1" | "Day 2" | string;
  hasSpun: boolean;
  assignedMotionId: string | null;
  assignedMotionText: string | null;
  assignedThemeName: string | null;
  assignedStance: Stance | null;
  spunAt: number | string | null;
  createdAt?: number | string;
}

export interface SystemSetting {
  isSpinOpen: boolean;
  randomMode: RandomMode;
  prepDurationSeconds: number;
  updatedAt?: number | string;
}

export interface SpinResult {
  themeName: string;
  motionText: string;
  stance: Stance;
  spunAt: string;
  participant: {
    username: string;
    fullName: string;
    sessionBatch: string;
  };
}

export interface AuthSession {
  role: "admin" | "participant";
  username: string;
  fullName?: string;
  sessionBatch?: string;
}
