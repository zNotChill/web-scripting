import chalk from "npm:chalk";

export function log(message: string, origin: string = "Logger") {
  console.log(
    chalk.cyanBright(`[${origin}] `) +
    chalk.white(`${message}`)
  );
}

export function success(message: string, origin: string = "Logger") {
  console.log(
    chalk.greenBright(`[${origin}] `) +
    chalk.white(`${message}`)
  );
}

export function warn(message: string, origin: string = "Logger") {
  console.warn(
    chalk.yellow(`[${origin}] `) +
    chalk.yellowBright(`${message}`)
  )
}

export function error(message: string, origin: string = "Logger") {
  console.error(
    chalk.red(`[${origin}] `) +
    chalk.redBright(`${message}`)
  )
}