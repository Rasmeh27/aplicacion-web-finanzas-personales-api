async function runSeeds(): Promise<void> {
  console.log('[seed] No seeds defined yet. Add seeders here and re-run `npm run seed`.');
}

runSeeds().catch((err) => {
  console.error(err);
  process.exit(1);
});
