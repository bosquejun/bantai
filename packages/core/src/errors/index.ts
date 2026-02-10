export enum BantaiErrorType {
    PolicyViolation = "PolicyViolation",
    EffectFailure = "EffectFailure",
    InternalError = "InternalError",
  }
  
  export interface BantaiErrorContext {
    ruleName?: string;
    effectName?: string;
    policyName?: string;
    timestamp?: number;
    additionalInfo?: Record<string, any>;
  }
  
  export class BantaiError extends Error {
    readonly type: BantaiErrorType;
    readonly context: BantaiErrorContext;
  
    constructor(
      message: string,
      type: BantaiErrorType = BantaiErrorType.InternalError,
      context: BantaiErrorContext = {}
    ) {
      super(message);
      this.type = type;
      this.context = {
        timestamp: Date.now(),
        ...context,
      };
      this.name = "BantaiError";
    }
  
    toJSON() {
      return {
        name: this.name,
        message: this.message,
        type: this.type,
        context: this.context,
        stack: this.stack,
      };
    }
  }
  