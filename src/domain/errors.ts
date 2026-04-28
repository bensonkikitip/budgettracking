export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('FOREIGN KEY') || msg.includes('SQLITE_CONSTRAINT_FOREIGNKEY')) {
    return "Can't delete — this category is still used by one or more rules.";
  }
  if (msg.includes('ENOENT') || msg.includes('no such file')) {
    return "Couldn't read that file. Please try again.";
  }
  if (msg.includes('JSON') || msg.includes('Unexpected token')) {
    return "This doesn't look like a valid Slo & Ready backup file.";
  }
  if (msg.includes('SQLITE_CONSTRAINT_UNIQUE') || msg.includes('UNIQUE constraint')) {
    return 'Something with that name already exists. Please choose a different name.';
  }
  return 'Something went wrong. Please try again.';
}
