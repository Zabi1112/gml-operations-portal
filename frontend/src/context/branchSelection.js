// Refresh saved branch metadata; a newly archived selection defaults to current work.
export function resolveBranchSelection(branches, saved) {
  const match = branches.find(branch => branch.id === saved?.id);
  if (match && (match.isActive || saved?.isActive === false)) return match;
  return branches.find(branch => branch.isActive) || null;
}
