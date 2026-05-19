import { createContext, useEffect, useState } from "react";

export const BranchContext = createContext();

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    const savedBranch = localStorage.getItem("selectedBranch");

    if (savedBranch) {
      setSelectedBranch(JSON.parse(savedBranch));
    }
  }, []);

  const selectBranch = (branch) => {
    setSelectedBranch(branch);

    if (branch) {
      localStorage.setItem("selectedBranch", JSON.stringify(branch));
      localStorage.setItem("branchId", branch.id);
    } else {
      localStorage.removeItem("selectedBranch");
      localStorage.removeItem("branchId");
    }
  };

  return (
    <BranchContext.Provider
      value={{
        branches,
        setBranches,
        selectedBranch,
        selectBranch
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}