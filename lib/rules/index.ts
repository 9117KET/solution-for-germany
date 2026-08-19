/**
 * The entitlement engine.
 *
 * Everything a user is told about money or eligibility originates here, in
 * plain deterministic TypeScript. The language model conducts the conversation
 * and translates; it never computes an amount and never decides a grade.
 */

export * from './sources';
export * from './nba';
export * from './benefits';
export * from './gap';
