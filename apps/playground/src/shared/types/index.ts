export interface BantaiError {
  line?: number;
  message: string;
  source?: string; // name of the rule or policy
}

export interface Rule {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  errors: BantaiError[];
  isDirty?: boolean;
}

export interface Policy {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  errors: BantaiError[];
  isDirty?: boolean;
}

export interface Context {
  id: string;
  name: string;
  definition: string;
  rules: Rule[];
  policies: Policy[];
  lastModified: number;
  errors: BantaiError[];
  isDirty?: boolean;
}

export interface TraceStep {
  id: string;
  label: string;
  type: 'info' | 'rule' | 'policy' | 'result';
  status: 'success' | 'failure' | 'skip' | 'error';
  message?: string;
}

export interface SimulationResult {
  allowed: boolean;
  trace: TraceStep[];
  duration: number;
  timestamp: number;
  error?: string;
  reason?: string;
}

export type PaneType = 'context' | 'rules' | 'policies';
