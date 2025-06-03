import type { Ora } from 'ora';

export interface OraLike extends Partial<Ora> {
  start: (message: string) => Ora;
  succeed: (message: string) => Ora;
  fail: (message: string) => Ora;
  stop: () => Ora;
}

export const createSpinner = async (): Promise<OraLike> => {
  const { default: ora } = await import('ora');
  const spinner = ora(); // Create a single spinner instance without initial text

  return {
    start: (message: string) => spinner.start(message), // start() takes optional text to set
    succeed: (message: string) => spinner.succeed(message),
    fail: (message: string) => spinner.fail(message),
    stop: () => spinner.stop(),
  };
};
