export interface NamedEntity {
  entity: string;
  name: string;
}

export interface RobotConfig {
  name: string;
  vacuum: string;
  battery?: string;
  status?: string;
  current_room?: string;
  progress?: string;
  last_clean_end?: string;
  mode?: string;
  mop_intensity?: string;
  errors?: NamedEntity[];
  routines?: string[];
  consumables?: NamedEntity[];
}

export interface CardConfig {
  type?: string;
  title?: string;
  lock?: string;
  maintenance_threshold?: number;
  robots: RobotConfig[];
}

export interface ServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

export interface Alert {
  kind: "error" | "maintenance";
  robot: string;
  label: string;
  value?: number;
  text: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectView {
  entity: string;
  current: string;
  options: SelectOption[];
}

export interface RoutineView {
  entity: string;
  name: string;
  available: boolean;
}

export interface RobotView {
  name: string;
  vacuumState: string;
  cleaning: boolean;
  battery: number | null;
  progress: number | null;
  room: string | null;
  statusText: string;
  mode: SelectView | null;
  mopIntensity: SelectView | null;
  fanSpeed: SelectView | null;
  routines: RoutineView[];
  lastCleanEnd: Date | null;
}
