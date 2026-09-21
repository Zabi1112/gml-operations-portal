import { useContext } from "react";
import { BranchContext } from "../context/BranchContext.jsx";

export default function OperationNotice() {
  const { selectedBranch, branchError } = useContext(BranchContext);
  if (branchError) return <div className="operation-notice" role="alert">{branchError}</div>;
  if (selectedBranch?.isActive !== false) return null;
  return (
    <div className="operation-notice" role="status">
      <strong>Previous operation - {selectedBranch.branchName}</strong>
      <span>Historical records are read-only. Use Dashboard &rarr; Current operation for new work.</span>
      <a href="/dashboard">Switch operation</a>
    </div>
  );
}
