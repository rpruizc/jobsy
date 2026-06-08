import { STUDIOS } from "./studios.js";
import { runRadar } from "./radar.js";
import type { Job } from "./types.js";

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

const BUCKET_LABEL: Record<Job["bucket"], string> = {
  seattle: "Seattle",
  remote: "Remote",
  elsewhere: "Elsewhere",
  unknown: "—",
};

function printJob(j: Job): void {
  const tag = j.isNew ? c.green("NEW ") : "    ";
  const loc = c.dim(`[${BUCKET_LABEL[j.bucket]}]`);
  console.log(`  ${tag}${c.bold(j.title)} ${c.dim("·")} ${c.cyan(j.studio)} ${loc}`);
  console.log(`      ${c.dim(j.url)}`);
}

async function main(): Promise<void> {
  const nowIso = new Date().toISOString();
  console.log(c.bold("\n🎮 Jobsy — Seattle game-studio radar\n"));

  const { snapshot, results } = await runRadar(STUDIOS, nowIso);
  const { jobs } = snapshot;

  const local = jobs.filter((j) => j.isSeattle || j.isRemote);
  const newJobs = jobs.filter((j) => j.isNew);
  const newLocal = local.filter((j) => j.isNew);

  // New Seattle/remote jobs first — that's the whole point.
  if (newLocal.length) {
    console.log(c.green(`★ ${newLocal.length} NEW Seattle/remote job(s) since last run:\n`));
    newLocal.forEach(printJob);
    console.log();
  } else if (Object.keys(jobs).length) {
    console.log(c.dim("No new Seattle/remote jobs since last run.\n"));
  }

  console.log(c.bold("All Seattle / remote openings:"));
  const sorted = [...local].sort((a, b) => a.studio.localeCompare(b.studio) || a.title.localeCompare(b.title));
  sorted.forEach(printJob);

  // Coverage report — be honest about what we can and can't see.
  console.log(c.bold("\nCoverage:"));
  for (const s of snapshot.studios) {
    const kind = s.kind === "manual" ? c.yellow("manual — check by hand") : c.dim(s.kind);
    const status = s.error ? c.yellow(`error: ${s.error}`) : `${s.count} job(s) · ${kind}`;
    console.log(`  ${s.name.padEnd(28)} ${status}`);
  }

  console.log(
    c.dim(
      `\n${jobs.length} total jobs · ${local.length} Seattle/remote · ${newJobs.length} new · ` +
        `${snapshot.studios.filter((s) => s.kind === "manual").length} studios need a feed wired up.`,
    ),
  );
  console.log(c.dim("Run `npm run dashboard` to browse them. Run `npm run discover` to find more studios.\n"));
}

main().catch((err) => {
  console.error("radar failed:", err);
  process.exit(1);
});
