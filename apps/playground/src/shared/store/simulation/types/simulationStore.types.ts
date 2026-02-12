import type { BantaiError, SimulationResult } from "../../../types";

export interface SimulationStore {
    simulationInput: string;
    simulationInputErrors: BantaiError[];
    isSimulationRunning: boolean;
    simulationResult: SimulationResult | null;

    setSimulationInput: (input: string) => void;
    runSimulation: () => void;
}
